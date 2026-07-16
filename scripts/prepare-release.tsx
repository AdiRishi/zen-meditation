import { spawn, execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Codex } from "@openai/codex-sdk";
import { Badge, ConfirmInput, ProgressBar, Spinner, StatusMessage } from "@inkjs/ui";
import { Box, Text, render, useApp } from "ink";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type BumpKind = "major" | "minor" | "patch";
type StepStatus = "pending" | "active" | "done" | "failed" | "skipped";
type FlowStatus = "running" | "confirming" | "done" | "failed" | "cancelled";
type Reporter = (message: string) => void;

type CliOptions = {
  dryRun: boolean;
};

type PackageJson = {
  version?: string;
  [key: string]: unknown;
};

type AppJson = {
  expo?: {
    version?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type VersionSource = {
  label: string;
  version?: string;
};

type ReleaseContext = {
  baseLabel: string;
  toRef: string;
  commitLog: string;
  diffStat: string;
  nameStatus: string;
};

type BumpDecision = {
  kind: BumpKind;
  reason: string;
  source: "codex" | "heuristic";
};

type ReleaseNotes = {
  headline: string;
  summary: string;
  highlights: string[];
  fixes: string[];
  internalChanges: string[];
  breakingChanges: string[];
  testingNotes: string[];
  riskNotes: string[];
};

type ReleasePlan = {
  currentVersion: string;
  nextVersion: string;
  tagName: string;
  context: ReleaseContext;
  bump: BumpDecision;
  notes: ReleaseNotes;
  releaseSection: string;
};

type ReleaseAnalysis = {
  bump: BumpDecision;
  notes: ReleaseNotes;
};

type Step = {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
};

type ActivityItem = {
  id: string;
  message: string;
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
const ROOT_PACKAGE_FILE = "package.json";
const MOBILE_APP_CONFIG_FILE = "apps/mobile/app.json";
const MOBILE_PACKAGE_FILE = "apps/mobile/package.json";
const NOTES_FILE = "RELEASE_NOTES.md";
const TAG_PREFIX = "v";
const TO_REF = "HEAD";
const RELEASE_ANALYSIS_MODEL = "gpt-5.5";
const RELEASE_ANALYSIS_REASONING_EFFORT = "medium";
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const ACTIVITY_LIMIT = 10;

const RELEASE_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    recommendedBump: { type: "string", enum: ["patch", "minor", "major"] },
    bumpReason: { type: "string" },
    headline: { type: "string" },
    summary: { type: "string" },
    highlights: { type: "array", items: { type: "string" } },
    fixes: { type: "array", items: { type: "string" } },
    internalChanges: { type: "array", items: { type: "string" } },
    breakingChanges: { type: "array", items: { type: "string" } },
    testingNotes: { type: "array", items: { type: "string" } },
    riskNotes: { type: "array", items: { type: "string" } },
  },
  required: [
    "recommendedBump",
    "bumpReason",
    "headline",
    "summary",
    "highlights",
    "fixes",
    "internalChanges",
    "breakingChanges",
    "testingNotes",
    "riskNotes",
  ],
  additionalProperties: false,
} as const;

async function main(): Promise<void> {
  const options = await parseCli();
  const app = render(<ReleaseApp options={options} />);
  await app.waitUntilExit();
}

function ReleaseApp({ options }: { options: CliOptions }): React.JSX.Element {
  const { exit } = useApp();
  const [steps, setSteps] = useState<Step[]>(makeSteps(options));
  const [status, setStatus] = useState<FlowStatus>("running");
  const [plan, setPlan] = useState<ReleasePlan>();
  const [error, setError] = useState<string>();
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const progress = useMemo(() => {
    const complete = steps.filter((step) => step.status === "done" || step.status === "skipped").length;
    return Math.round((complete / steps.length) * 100);
  }, [steps]);

  const report = useCallback((message: string) => {
    const cleanMessage = message.replace(/\s+/gu, " ").trim();
    if (!cleanMessage) return;

    setActivity((current) =>
      [
        ...current,
        {
          id: `${Date.now()}-${current.length}`,
          message: cleanMessage.length > 180 ? `${cleanMessage.slice(0, 177)}...` : cleanMessage,
        },
      ].slice(-ACTIVITY_LIMIT),
    );
  }, []);

  const updateStep = useCallback((id: string, stepStatus: StepStatus, detail?: string) => {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, status: stepStatus, detail: detail ?? step.detail } : step)),
    );
  }, []);

  const finish = useCallback(
    (ok: boolean) => {
      if (!ok) process.exitCode = 1;
      setTimeout(exit, 100);
    },
    [exit],
  );

  const fail = useCallback(
    (message: string, stepId?: string) => {
      if (stepId) updateStep(stepId, "failed", message);
      report(message);
      setError(message);
      setStatus("failed");
      finish(false);
    },
    [finish, report, updateStep],
  );

  const runStep = useCallback(
    async <T,>(id: string, detail: string, task: () => Promise<T> | T): Promise<T> => {
      updateStep(id, "active", detail);
      report(detail);

      try {
        const value = await task();
        updateStep(id, "done");
        return value;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        fail(message, id);
        throw error;
      }
    },
    [fail, report, updateStep],
  );

  const runApply = useCallback(
    async (releasePlan: ReleasePlan) => {
      try {
        await pauseForPaint();
        await runStep("write", "Writing app manifest, package versions, and release notes", () =>
          writeReleaseFiles(releasePlan, report),
        );
        await runStep("format", "Running pnpm format", () => runProcess("pnpm", ["format"], report));
        await runStep("check", "Running pnpm run check", () => runProcess("pnpm", ["run", "check"], report));
        await runStep("commit", "Creating release commit and annotated tag", () => commitRelease(releasePlan, report));

        setStatus("done");
        report(`Release ${releasePlan.tagName} is ready.`);
        finish(true);
      } catch {
        // The active step already recorded the failure.
      }
    },
    [finish, report, runStep],
  );

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const releasePlan = await runStep("plan", "Analyzing commits and asking Codex for release notes", () =>
          createReleasePlan(report),
        );
        if (!mounted) return;

        setPlan(releasePlan);

        if (options.dryRun) {
          skipApplySteps(updateStep, "Dry run");
          setStatus("done");
          report("Dry run complete. No files were changed.");
          finish(true);
          return;
        }

        updateStep("confirm", "active", "Waiting for confirmation");
        setStatus("confirming");
      } catch {
        // runStep handles UI state.
      }
    })();

    return () => {
      mounted = false;
    };
  }, [finish, options.dryRun, report, runStep, updateStep]);

  const confirm = () => {
    if (!plan) return;

    updateStep("confirm", "done");
    setStatus("running");
    report("Confirmed. Applying the release plan.");
    void runApply(plan);
  };

  const cancel = () => {
    updateStep("confirm", "skipped", "Cancelled");
    skipApplySteps(updateStep, "Cancelled");
    setStatus("cancelled");
    report("Cancelled before writing files.");
    finish(true);
  };

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} gap={1}>
      <Header status={status} />
      <ProgressBar value={progress} />
      <StepList steps={steps} />

      {activity.length > 0 ? <ActivityFeed items={activity} /> : null}
      {plan ? <PlanSummary plan={plan} /> : null}

      {status === "confirming" ? (
        <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} paddingY={1}>
          <Text color="yellow">Create the release commit and annotated tag?</Text>
          <Text dimColor>
            This updates {NOTES_FILE}, the app manifest, and package versions, then runs format, checks, commit, and tag.
          </Text>
          <ConfirmInput defaultChoice="cancel" onCancel={cancel} onConfirm={confirm} />
        </Box>
      ) : null}

      {status === "done" ? (
        <StatusMessage variant="success">
          {options.dryRun ? "Dry run finished. No files were changed." : "Release preparation finished."}
        </StatusMessage>
      ) : null}
      {status === "cancelled" ? <StatusMessage variant="warning">Release cancelled. No files were changed.</StatusMessage> : null}
      {status === "failed" && error ? <StatusMessage variant="error">{error}</StatusMessage> : null}
    </Box>
  );
}

function Header({ status }: { status: FlowStatus }): React.JSX.Element {
  const label = status === "running" ? "Preparing release" : status === "confirming" ? "Review release" : "Release";

  if (status === "running") return <Spinner label={label} />;

  return (
    <Box>
      <Badge color={status === "failed" ? "red" : status === "cancelled" ? "yellow" : "green"}>{label}</Badge>
    </Box>
  );
}

function StepList({ steps }: { steps: Step[] }): React.JSX.Element {
  return (
    <Box flexDirection="column">
      {steps.map((step) => (
        <Box key={step.id} gap={1}>
          <StepBadge status={step.status} />
          <Text>{step.label}</Text>
          {step.detail ? <Text dimColor>{step.detail}</Text> : null}
        </Box>
      ))}
    </Box>
  );
}

function StepBadge({ status }: { status: StepStatus }): React.JSX.Element {
  const color = status === "done" ? "green" : status === "failed" ? "red" : status === "active" ? "yellow" : "gray";
  const label = status === "done" ? "done" : status === "failed" ? "fail" : status === "active" ? "run" : status;

  return <Badge color={color}>{label}</Badge>;
}

function ActivityFeed({ items }: { items: ActivityItem[] }): React.JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      <Text color="gray">Live activity</Text>
      {items.map((item) => (
        <Text key={item.id} dimColor>
          {item.message}
        </Text>
      ))}
    </Box>
  );
}

function PlanSummary({ plan }: { plan: ReleasePlan }): React.JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
      <Text color="cyan">Release plan</Text>
      <Text>
        Version <Text color="yellow">{plan.currentVersion}</Text>
        {" -> "}
        <Text color="green">{plan.nextVersion}</Text>
      </Text>
      <Text>
        Bump <Text color="green">{plan.bump.kind}</Text> <Text dimColor>({plan.bump.source})</Text>
      </Text>
      <Text dimColor>{plan.bump.reason}</Text>
      <Text>
        Tag <Text color="green">{plan.tagName}</Text>
      </Text>
      <Text>
        Range <Text color="yellow">{plan.context.baseLabel}</Text>..{plan.context.toRef}
      </Text>
      <Text>
        Notes <Text color="green">{NOTES_FILE}</Text>
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">{plan.notes.headline}</Text>
        {plan.notes.summary ? <Text>{plan.notes.summary}</Text> : null}
        <NoteList title="Highlights" items={plan.notes.highlights} />
        <NoteList title="Fixes" items={plan.notes.fixes} />
        <NoteList title="Internal" items={plan.notes.internalChanges} />
        <NoteList title="Breaking" items={plan.notes.breakingChanges} />
        <NoteList title="Testing" items={plan.notes.testingNotes} />
        <NoteList title="Risk" items={plan.notes.riskNotes} />
      </Box>
    </Box>
  );
}

function NoteList({ title, items }: { title: string; items: string[] }): React.JSX.Element | null {
  if (items.length === 0) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan">{title}</Text>
      {items.map((item) => (
        <Text key={item}>- {item}</Text>
      ))}
    </Box>
  );
}

function makeSteps(options: CliOptions): Step[] {
  return [
    { id: "plan", label: "Analyze release range", status: "pending" },
    { id: "confirm", label: options.dryRun ? "Preview only" : "Confirm release", status: "pending" },
    { id: "write", label: "Write release files", status: "pending" },
    { id: "format", label: "Format repository", status: "pending" },
    { id: "check", label: "Run checks", status: "pending" },
    { id: "commit", label: "Create commit and tag", status: "pending" },
  ];
}

async function parseCli(): Promise<CliOptions> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName("release:prepare")
    .usage("$0 [--dry-run]", "Prepare the next automated release commit and tag")
    .option("dry-run", {
      describe: "Preview the generated release plan without writing files",
      type: "boolean",
      default: false,
    })
    .strict()
    .help()
    .parseAsync();

  return {
    dryRun: Boolean(argv.dryRun),
  };
}

async function createReleasePlan(report: Reporter): Promise<ReleasePlan> {
  report("Reading current app manifest, root package, and mobile package versions.");

  const currentVersion = readCurrentReleaseVersion();

  report("Collecting commits, changed files, and diff stats.");
  const context = releaseContext();
  if (!context.commitLog.trim()) {
    throw new Error(`No commits found in release range ${context.baseLabel}..${context.toRef}.`);
  }

  const analysis = await analyzeRelease(context, currentVersion, report);
  const nextVersion = nextVersionFor(currentVersion, analysis.bump.kind);
  const tagName = `${TAG_PREFIX}${nextVersion}`;

  if (tryGit(["rev-parse", "--verify", "--quiet", `refs/tags/${tagName}`])) {
    throw new Error(`Tag ${tagName} already exists.`);
  }

  report(`Prepared ${analysis.bump.kind} bump: ${currentVersion} -> ${nextVersion}.`);

  return {
    currentVersion,
    nextVersion,
    tagName,
    context,
    bump: analysis.bump,
    notes: analysis.notes,
    releaseSection: renderReleaseSection(tagName, analysis.notes),
  };
}

async function analyzeRelease(
  context: ReleaseContext,
  currentVersion: string,
  report: Reporter,
): Promise<ReleaseAnalysis> {
  try {
    report("Asking Codex for the semantic bump and release notes.");
    return await analyzeReleaseWithCodex(context, currentVersion);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fallback = heuristicBump(context);

    report(`Codex analysis was unavailable, using conventional commit fallback. ${message}`);

    return {
      bump: {
        ...fallback,
        reason: `${fallback.reason} Codex analysis was unavailable, so conventional commits were used.`,
      },
      notes: fallbackNotes(context),
    };
  }
}

async function analyzeReleaseWithCodex(context: ReleaseContext, currentVersion: string): Promise<ReleaseAnalysis> {
  const prompt = `You are preparing release metadata for the next version of a local-first meditation app.

Return JSON matching the provided schema.

Task:
- Recommend the smallest safe semantic version bump for this release range.
- Write concise, user-facing release notes grounded only in the evidence below.

Semver decision rules:
- major: use only for explicit evidence of a breaking change, removed behavior, incompatible data/schema/API change, or required operator migration.
- minor: use for user-visible new features, new workflows, or meaningful backward-compatible expansions.
- patch: use for fixes, small UX polish, copy changes, dependency/tooling/internal changes, release automation, tests, docs, or other non-breaking maintenance.
- Do not recommend major based only on refactors, dependency upgrades, internal architecture work, release tooling, or tests.
- If the evidence is mixed, prefer the smallest safe bump.

Release-note audience and style:
- Write for people who use the meditation app, not developers reading commit history.
- Prefer plain product language and summarize outcomes rather than narrating commits.
- Use domain terms such as practice, sessions, schedules, reminders, progress, appearance, and completion sounds only when they are clearly supported by the evidence.
- Keep the tone specific, calm, and non-promotional.

Field guidance:
- headline: short release title, no version number, no trailing punctuation.
- summary: one or two sentences, user-facing, no version number.
- highlights: only meaningful user-visible additions or improvements.
- fixes: only user-visible bug fixes or behavior corrections.
- internalChanges: developer-facing chores, refactors, dependency upgrades, release tooling, docs, tests, or infra work worth recording.
- breakingChanges: only explicit breaking changes or required migrations.
- testingNotes: only concrete test coverage, manual verification notes, or explicit testing gaps supported by the evidence.
- riskNotes: only concrete rollout risk, migration risk, or notable uncertainty supported by the evidence.
- Use empty arrays when a field has no supported items.

Evidence rules:
- Treat commit subjects as the primary source of truth.
- Use changed files and diff stats only to clarify, group, or disambiguate commits.
- If a claim is not supported with reasonable confidence by the commit subjects plus supporting context, omit it.
- Do not infer user-facing behavior from filenames, package names, or dependency upgrades alone.
- Do not infer testing gaps or rollout risk from silence alone.
- Combine related commits into one note when appropriate and avoid duplicate wording.
- Do not copy commit prefixes, pull request numbers, filenames, hashes, or package names into user-facing fields unless essential for understanding the change.

Current version: ${currentVersion}

${releaseEvidenceBlock(context)}
`;

  const thread = startCodexThread();
  const turn = await thread.run(prompt, { outputSchema: RELEASE_ANALYSIS_SCHEMA });
  return parseReleaseAnalysis(turn.finalResponse);
}

function startCodexThread() {
  return new Codex({
    config: {
      forced_login_method: "chatgpt",
    },
  }).startThread({
    workingDirectory: ROOT,
    sandboxMode: "read-only",
    approvalPolicy: "never",
    model: RELEASE_ANALYSIS_MODEL,
    modelReasoningEffort: RELEASE_ANALYSIS_REASONING_EFFORT,
  });
}

function writeReleaseFiles(plan: ReleasePlan, report: Reporter): void {
  assertCleanWorktree();
  report("Worktree is clean.");

  const currentVersion = readCurrentReleaseVersion();
  if (currentVersion !== plan.currentVersion) {
    throw new Error(
      `Release version changed after planning: expected ${plan.currentVersion}, found ${currentVersion}. Re-run the release preparation script.`,
    );
  }

  const packageJson = readJson<PackageJson>(ROOT_PACKAGE_FILE);
  const mobilePackageJson = readJson<PackageJson>(MOBILE_PACKAGE_FILE);

  packageJson.version = plan.nextVersion;
  mobilePackageJson.version = plan.nextVersion;

  writeJson(ROOT_PACKAGE_FILE, packageJson);
  report(`${ROOT_PACKAGE_FILE} version set to ${plan.nextVersion}.`);

  writeJson(MOBILE_PACKAGE_FILE, mobilePackageJson);
  report(`${MOBILE_PACKAGE_FILE} version set to ${plan.nextVersion}.`);

  writeAppConfigVersion(plan.nextVersion);
  report(`${MOBILE_APP_CONFIG_FILE} Expo version set to ${plan.nextVersion}.`);

  writeReleaseNotes(NOTES_FILE, plan.releaseSection);
  report(`${NOTES_FILE} updated with ${plan.tagName}.`);
}

async function commitRelease(plan: ReleasePlan, report: Reporter): Promise<void> {
  await runProcess("git", ["add", MOBILE_APP_CONFIG_FILE, MOBILE_PACKAGE_FILE, ROOT_PACKAGE_FILE, NOTES_FILE], report);
  await runProcess("git", ["commit", "-m", `chore: release ${plan.tagName}`], report);
  await runProcess("git", ["tag", "-a", plan.tagName, "-m", `Release ${plan.tagName}`], report);
}

function releaseContext(): ReleaseContext {
  const base = releaseBase();
  const logRange = base.ref ? [`${base.ref}..${TO_REF}`] : [TO_REF];
  const diffRange = base.ref ? [`${base.ref}..${TO_REF}`] : [EMPTY_TREE, TO_REF];

  return {
    baseLabel: base.label,
    toRef: TO_REF,
    commitLog: git(["log", "--reverse", "--date=short", "--format=%h%x09%ad%x09%an%x09%s", ...logRange]),
    diffStat: git(["diff", "--stat", ...diffRange]),
    nameStatus: git(["diff", "--name-status", ...diffRange]),
  };
}

function releaseBase(): { ref?: string; label: string } {
  const latestTag = tryGit(["describe", "--tags", "--abbrev=0", "--match", `${TAG_PREFIX}[0-9]*`, TO_REF]);
  if (latestTag) return { ref: latestTag, label: latestTag };

  const releaseRef = refExists("release") ? "release" : refExists("origin/release") ? "origin/release" : undefined;
  if (!releaseRef) return { label: "repository history" };

  const mergeBase = git(["merge-base", TO_REF, releaseRef]);
  return { ref: mergeBase, label: `merge-base(${TO_REF}, ${releaseRef})` };
}

function releaseEvidenceBlock(context: ReleaseContext): string {
  return `Release range: ${context.baseLabel}..${context.toRef}

Commit log:
${context.commitLog}

Changed files:
${context.nameStatus || "(none)"}

Diff stat:
${context.diffStat || "(none)"}`;
}

function parseReleaseAnalysis(value: string): ReleaseAnalysis {
  const parsed = JSON.parse(stripJsonFence(value)) as Partial<
    ReleaseNotes & {
      recommendedBump: string;
      bumpReason: string;
    }
  >;

  if (!parsed.recommendedBump || !isBumpKind(parsed.recommendedBump)) {
    throw new Error(`Codex returned an invalid bump recommendation: ${parsed.recommendedBump ?? "missing"}`);
  }

  return {
    bump: {
      kind: parsed.recommendedBump,
      reason: parsed.bumpReason?.trim() || `Codex recommended a ${parsed.recommendedBump} bump.`,
      source: "codex",
    },
    notes: normalizeNotes(parsed),
  };
}

function normalizeNotes(parsed: Partial<ReleaseNotes>): ReleaseNotes {
  return {
    headline: parsed.headline ?? "Release update",
    summary: parsed.summary ?? "",
    highlights: parsed.highlights ?? [],
    fixes: parsed.fixes ?? [],
    internalChanges: parsed.internalChanges ?? [],
    breakingChanges: parsed.breakingChanges ?? [],
    testingNotes: parsed.testingNotes ?? [],
    riskNotes: parsed.riskNotes ?? [],
  };
}

function stripJsonFence(value: string): string {
  return value.trim().replace(/^```json\s*/u, "").replace(/^```\s*/u, "").replace(/\s*```$/u, "");
}

function heuristicBump(context: ReleaseContext): BumpDecision {
  const subjects = commitSubjects(context);
  const commitText = context.commitLog;

  if (/BREAKING CHANGE/u.test(commitText) || subjects.some((subject) => /^[a-z]+(?:\([^)]+\))?!:/u.test(subject))) {
    return {
      kind: "major",
      reason: "Conventional commits indicate a breaking change.",
      source: "heuristic",
    };
  }

  if (subjects.some((subject) => /^feat(?:\([^)]+\))?:/u.test(subject))) {
    return {
      kind: "minor",
      reason: "Conventional commits include at least one feature.",
      source: "heuristic",
    };
  }

  return {
    kind: "patch",
    reason: "No features or breaking changes were detected, so patch is the smallest safe bump.",
    source: "heuristic",
  };
}

function fallbackNotes(context: ReleaseContext): ReleaseNotes {
  const notes: ReleaseNotes = {
    headline: "Release update",
    summary: "Generated from commit subjects because Codex analysis was unavailable.",
    highlights: [],
    fixes: [],
    internalChanges: [],
    breakingChanges: [],
    testingNotes: [],
    riskNotes: [],
  };

  for (const subject of commitSubjects(context)) {
    const item = sentenceCase(stripConventionalPrefix(subject));

    if (/^feat(?:\([^)]+\))?!?:/u.test(subject)) {
      notes.highlights.push(item);
    } else if (/^fix(?:\([^)]+\))?!?:/u.test(subject)) {
      notes.fixes.push(item);
    } else {
      notes.internalChanges.push(item);
    }
  }

  return notes;
}

function commitSubjects(context: ReleaseContext): string[] {
  return context.commitLog
    .split("\n")
    .map((line) => line.split("\t").at(3))
    .filter((subject): subject is string => Boolean(subject));
}

function nextVersionFor(currentVersion: string, bump: BumpKind): string {
  const [major, minor, patch] = currentVersion.split(".").map(Number) as [number, number, number];

  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function renderReleaseSection(tagName: string, notes: ReleaseNotes): string {
  const lines = [`## ${tagName} - ${new Date().toISOString().slice(0, 10)}`, "", `### ${notes.headline}`, ""];

  if (notes.summary) lines.push(notes.summary, "");

  appendSection(lines, "Highlights", notes.highlights);
  appendSection(lines, "Fixes", notes.fixes);
  appendSection(lines, "Internal Changes", notes.internalChanges);
  appendSection(lines, "Breaking Changes", notes.breakingChanges);
  appendSection(lines, "Testing Notes", notes.testingNotes);
  appendSection(lines, "Risk Notes", notes.riskNotes);

  return lines.join("\n").trimEnd();
}

function appendSection(lines: string[], heading: string, items: string[]): void {
  if (items.length === 0) return;

  lines.push(`### ${heading}`, "");
  lines.push(...items.map((item) => `- ${item}`), "");
}

function writeReleaseNotes(relativePath: string, section: string): void {
  const path = resolve(ROOT, relativePath);
  const existing = existsSync(path) ? readFileSync(path, "utf-8") : "";

  if (!existing.trim()) {
    writeFileSync(path, `# Release Notes\n\n${section}\n`);
    return;
  }

  if (existing.startsWith("# Release Notes")) {
    const rest = existing.replace(/^# Release Notes[^\n]*\n*/u, "").trimStart();
    writeFileSync(path, `# Release Notes\n\n${section}\n\n${rest}`.trimEnd() + "\n");
    return;
  }

  writeFileSync(path, `# Release Notes\n\n${section}\n\n${existing.trimEnd()}\n`);
}

function skipApplySteps(updateStep: (id: string, status: StepStatus, detail?: string) => void, detail: string): void {
  for (const id of ["confirm", "write", "format", "check", "commit"]) {
    updateStep(id, "skipped", detail);
  }
}

function isBumpKind(value: string): value is BumpKind {
  return value === "major" || value === "minor" || value === "patch";
}

function stripConventionalPrefix(subject: string): string {
  return subject.replace(/^(feat|fix|chore|refactor|docs|test|perf|build|ci)(\([^)]+\))?!?:\s*/u, "");
}

function sentenceCase(value: string): string {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function assertCleanWorktree(): void {
  const status = git(["status", "--porcelain"]);
  if (status) throw new Error(`Working tree must be clean before applying a release.\n${status}`);
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), "utf-8")) as T;
}

function writeJson(relativePath: string, value: unknown): void {
  writeFileSync(resolve(ROOT, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

function readCurrentReleaseVersion(): string {
  const sources: VersionSource[] = [
    { label: ROOT_PACKAGE_FILE, version: readJson<PackageJson>(ROOT_PACKAGE_FILE).version },
    { label: MOBILE_PACKAGE_FILE, version: readJson<PackageJson>(MOBILE_PACKAGE_FILE).version },
    { label: MOBILE_APP_CONFIG_FILE, version: readAppConfigVersion() },
  ];

  const missing = sources.filter((source) => !source.version);
  if (missing.length > 0) {
    throw new Error(`Missing release version in ${formatVersionSources(missing)}.`);
  }

  const invalid = sources.filter((source) => source.version && !SEMVER_PATTERN.test(source.version));
  if (invalid.length > 0) {
    throw new Error(`Expected semver release versions, got ${formatVersionSources(invalid)}.`);
  }

  const [first, ...rest] = sources as [VersionSource, ...VersionSource[]];
  const mismatched = rest.filter((source) => source.version !== first.version);
  if (mismatched.length > 0) {
    throw new Error(
      `Release version sources must match before bumping. Found ${formatVersionSources(sources)}.`,
    );
  }

  if (!first.version) {
    throw new Error(`Missing release version in ${first.label}.`);
  }

  return first.version;
}

function formatVersionSources(sources: VersionSource[]): string {
  return sources.map((source) => `${source.label}=${source.version ?? "missing"}`).join(", ");
}

function readAppConfigVersion(): string | undefined {
  return readJson<AppJson>(MOBILE_APP_CONFIG_FILE).expo?.version;
}

function writeAppConfigVersion(version: string): void {
  const appJson = readJson<AppJson>(MOBILE_APP_CONFIG_FILE);
  if (!appJson.expo?.version) {
    throw new Error(`Could not find Expo version field in ${MOBILE_APP_CONFIG_FILE}.`);
  }

  appJson.expo.version = version;
  writeJson(MOBILE_APP_CONFIG_FILE, appJson);
}

function refExists(ref: string): boolean {
  return Boolean(tryGit(["rev-parse", "--verify", "--quiet", ref]));
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function tryGit(args: string[]): string | undefined {
  try {
    return git(args) || undefined;
  } catch {
    return undefined;
  }
}

async function runProcess(command: string, args: string[], report: Reporter): Promise<string> {
  report(`$ ${command} ${args.join(" ")}`);

  return await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      reportLines(text, report);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      errorOutput += text;
      reportLines(text, report);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        report(`Finished ${command} ${args[0] ?? ""}`.trim());
        resolvePromise(output.trim());
        return;
      }

      const combinedOutput = `${output}\n${errorOutput}`.trim();
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}.\n${tail(combinedOutput)}`.trim()));
    });
  });
}

function reportLines(text: string, report: Reporter): void {
  for (const line of text.split(/\r?\n/u)) {
    report(line);
  }
}

function tail(value: string, lineCount = 16): string {
  return value.split(/\r?\n/u).filter(Boolean).slice(-lineCount).join("\n");
}

async function pauseForPaint(): Promise<void> {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

