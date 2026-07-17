import { useSpinner } from "@inkjs/ui";
import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import React, { useCallback, useEffect, useState } from "react";

import {
  assertApplyPreflight,
  assertOnlyReleaseFilesChanged,
  assertReleaseWorkspace,
  createReleaseCommit,
  createReleasePlan,
  createReleaseTag,
  NOTES_FILE,
  releaseCommitCount,
  releaseFileCount,
  restoreReleaseFiles,
  runReleaseChecks,
  runReleaseFormat,
  writeReleaseFiles,
  type ReleasePlan,
  type ReleaseSnapshot,
  type Reporter,
} from "./release.js";

export type ReleaseCliOptions = {
  dryRun: boolean;
  offline: boolean;
};

export type StepStatus = "pending" | "active" | "done" | "failed" | "skipped";
export type FlowStatus = "planning" | "reviewing" | "applying" | "done" | "failed" | "cancelled";

export type Step = {
  id: string;
  label: string;
  caption: string;
  status: StepStatus;
  detail?: string;
};

export type ActivityItem = {
  id: number;
  message: string;
};

const ACTIVITY_LIMIT = 5;

export function ReleaseApp({ options }: { options: ReleaseCliOptions }): React.JSX.Element {
  const { exit } = useApp();
  const { columns } = useWindowSize();
  const [steps, setSteps] = useState<Step[]>(() => makeSteps(options));
  const [status, setStatus] = useState<FlowStatus>("planning");
  const [plan, setPlan] = useState<ReleasePlan>();
  const [error, setError] = useState<string>();
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const report = useCallback<Reporter>((message) => {
    const cleanMessage = message.replace(/\s+/gu, " ").trim();
    if (!cleanMessage) return;

    setActivity((current) => {
      const nextId = (current.at(-1)?.id ?? 0) + 1;
      return [...current, { id: nextId, message: cleanMessage }].slice(-ACTIVITY_LIMIT);
    });
  }, []);

  const updateStep = useCallback((id: string, stepStatus: StepStatus, detail?: string) => {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, status: stepStatus, detail: detail ?? step.detail } : step)),
    );
  }, []);

  const finish = useCallback(
    (ok: boolean) => {
      if (!ok) process.exitCode = 1;
      setTimeout(exit, 120);
    },
    [exit],
  );

  const fail = useCallback(
    (message: string, stepId?: string) => {
      if (stepId) updateStep(stepId, "failed", shortError(message));
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
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
        updateStep(id, "failed", shortError(message));
        throw caughtError;
      }
    },
    [report, updateStep],
  );

  const runApply = useCallback(
    async (releasePlan: ReleasePlan) => {
      let snapshot: ReleaseSnapshot | undefined;
      let commitCreated = false;

      setStatus("applying");

      try {
        assertApplyPreflight(releasePlan);
        snapshot = await runStep("write", "Writing the release set", () => writeReleaseFiles(releasePlan, report));
        await runStep("format", "Formatting the repository", () => runReleaseFormat(report));
        await runStep("verify", "Running repository checks", async () => {
          await runReleaseChecks(report);
          assertOnlyReleaseFilesChanged();
        });
        await runStep("commit", "Creating the release commit", async () => {
          await createReleaseCommit(releasePlan, report);
          commitCreated = true;
        });
        await runStep("tag", `Annotating ${releasePlan.tagName}`, () => createReleaseTag(releasePlan, report));

        setStatus("done");
        report(`${releasePlan.tagName} is sealed and ready to push`);
        finish(true);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : String(caughtError);

        if (snapshot && !commitCreated) {
          restoreReleaseFiles(snapshot);
          report("Restored release files to their original state");
        }

        fail(
          commitCreated
            ? `${message}\nThe release commit exists without its tag. Add ${releasePlan.tagName} manually after resolving the issue.`
            : message,
        );
      }
    },
    [fail, finish, report, runStep],
  );

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        if (!options.dryRun) {
          assertReleaseWorkspace();
        }

        const releasePlan = await runStep(
          "compose",
          options.offline
            ? "Reading conventional commits in offline mode"
            : "Reading the range and composing release notes with Codex",
          () => createReleasePlan(report, { offline: options.offline }),
        );
        if (!mounted) return;

        setPlan(releasePlan);

        if (options.dryRun) {
          updateStep("review", "done", "Release brief shown");
          skipApplySteps(updateStep, "Preview only");
          setStatus("done");
          report("Preview complete; the repository is untouched");
          finish(true);
          return;
        }

        updateStep("review", "active", "Waiting for your decision");
        setStatus("reviewing");
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
        fail(message, "compose");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fail, finish, options.dryRun, options.offline, report, runStep, updateStep]);

  const confirm = () => {
    if (!plan) return;

    updateStep("review", "done", "Release approved");
    report("Release approved; beginning the write phase");
    void runApply(plan);
  };

  const cancel = () => {
    updateStep("review", "skipped", "Left untouched");
    skipApplySteps(updateStep, "Not started");
    setStatus("cancelled");
    report("Release left untouched");
    finish(true);
  };

  return (
    <ReleaseScreen
      activity={activity}
      error={error}
      onCancel={cancel}
      onConfirm={confirm}
      options={options}
      plan={plan}
      status={status}
      steps={steps}
      width={columns}
    />
  );
}

export function ReleaseScreen({
  activity,
  error,
  onCancel,
  onConfirm,
  options,
  plan,
  status,
  steps,
  width,
}: {
  activity: ActivityItem[];
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
  options: ReleaseCliOptions;
  plan?: ReleasePlan;
  status: FlowStatus;
  steps: Step[];
  width: number;
}): React.JSX.Element {
  const wide = width >= 96;
  const statusLabel = flowLabel(status, options);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} gap={1}>
      <Masthead status={status} statusLabel={statusLabel} />

      <Box flexDirection={wide ? "row" : "column"} gap={wide ? 3 : 1} alignItems="flex-start">
        <Box width={wide ? 31 : undefined} flexShrink={0}>
          <ReleaseTrail steps={steps} />
        </Box>

        <Box flexDirection="column" flexGrow={1} minWidth={0} gap={1}>
          {plan ? <ReleaseBrief plan={plan} /> : <PlanningPanel options={options} />}
          {activity.length > 0 && status !== "reviewing" ? <ActivityPanel items={activity} /> : null}
          {status === "reviewing" && plan ? (
            <DecisionPanel onCancel={onCancel} onConfirm={onConfirm} plan={plan} />
          ) : null}
          {status === "done" ? <CompletionPanel dryRun={options.dryRun} plan={plan} /> : null}
          {status === "cancelled" ? <CancelledPanel /> : null}
          {status === "failed" && error ? <FailurePanel error={error} /> : null}
        </Box>
      </Box>
    </Box>
  );
}

function Masthead({ status, statusLabel }: { status: FlowStatus; statusLabel: string }): React.JSX.Element {
  const labelColor = status === "failed" ? "red" : status === "reviewing" ? "yellow" : "green";

  return (
    <Box justifyContent="space-between">
      <Box>
        <Text color="green" bold>
          ◌ MOSS
        </Text>
        <Text dimColor> / RELEASE OBSERVATORY</Text>
      </Box>
      <Text color={labelColor}>● {statusLabel}</Text>
    </Box>
  );
}

function ReleaseTrail({ steps }: { steps: Step[] }): React.JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} paddingY={1}>
      <Text dimColor>RELEASE TRAIL</Text>
      <Box flexDirection="column" marginTop={1}>
        {steps.map((step, index) => (
          <TrailStep isLast={index === steps.length - 1} key={step.id} step={step} />
        ))}
      </Box>
    </Box>
  );
}

function TrailStep({ isLast, step }: { isLast: boolean; step: Step }): React.JSX.Element {
  return (
    <Box>
      <Box width={2} flexDirection="column" alignItems="center">
        <TrailMarker status={step.status} />
        {!isLast ? <Text dimColor>│</Text> : null}
      </Box>
      <Box flexDirection="column" paddingBottom={isLast ? 0 : 1}>
        <Text bold={step.status === "active"} color={stepColor(step.status)}>
          {step.label}
        </Text>
        <Text dimColor>{step.detail ?? step.caption}</Text>
      </Box>
    </Box>
  );
}

function TrailMarker({ status }: { status: StepStatus }): React.JSX.Element {
  const { frame } = useSpinner({ type: "dots" });

  if (status === "active") return <Text color="yellow">{frame}</Text>;
  if (status === "done") return <Text color="green">●</Text>;
  if (status === "failed") return <Text color="red">×</Text>;
  if (status === "skipped") return <Text dimColor>–</Text>;
  return <Text dimColor>·</Text>;
}

function PlanningPanel({ options }: { options: ReleaseCliOptions }): React.JSX.Element {
  const mode = options.offline ? "conventional commits" : "Codex";

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text dimColor>NEXT RELEASE</Text>
      <Text color="cyan" bold>
        Reading the shape of the work
      </Text>
      <Text dimColor>The release range is being gathered and composed with {mode}.</Text>
    </Box>
  );
}

function ReleaseBrief({ plan }: { plan: ReleasePlan }): React.JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={2} paddingY={1}>
      <Box justifyContent="space-between">
        <Text dimColor>NEXT RELEASE</Text>
        <Text color="green">{plan.bump.kind.toUpperCase()}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{plan.currentVersion}</Text>
        <Text> → </Text>
        <Text color="green" bold>
          {plan.nextVersion}
        </Text>
      </Box>
      <Text dimColor>
        {formatCount(releaseCommitCount(plan.context), "commit")} ·{" "}
        {formatCount(releaseFileCount(plan.context), "file")} · {plan.context.baseLabel}..{plan.context.toRef}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="cyan" bold>
          {plan.notes.headline}
        </Text>
        {plan.notes.summary ? <Text>{plan.notes.summary}</Text> : null}
        <NoteList title="Highlights" items={plan.notes.highlights} />
        <NoteList title="Fixes" items={plan.notes.fixes} />
        <NoteList title="Internal" items={plan.notes.internalChanges} />
        <NoteList title="Breaking" items={plan.notes.breakingChanges} tone="red" />
        <NoteList title="Testing" items={plan.notes.testingNotes} />
        <NoteList title="Risk" items={plan.notes.riskNotes} tone="yellow" />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{plan.bump.reason}</Text>
      </Box>
    </Box>
  );
}

function NoteList({
  title,
  items,
  tone = "cyan",
}: {
  title: string;
  items: string[];
  tone?: "cyan" | "red" | "yellow";
}): React.JSX.Element | null {
  if (items.length === 0) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={tone}>{title}</Text>
      {items.map((item) => (
        <Box key={item}>
          <Box width={3} flexShrink={0}>
            <Text color={tone}> └ </Text>
          </Box>
          <Box flexGrow={1}>
            <Text>{item}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function ActivityPanel({ items }: { items: ActivityItem[] }): React.JSX.Element {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text dimColor>LIVE FIELD NOTES</Text>
      {items.map((item, index) => (
        <Box key={item.id}>
          <Text color={index === items.length - 1 ? "cyan" : "gray"}>{index === items.length - 1 ? "› " : "  "}</Text>
          <Text dimColor={index !== items.length - 1}>{item.message}</Text>
        </Box>
      ))}
    </Box>
  );
}

function DecisionPanel({
  onCancel,
  onConfirm,
  plan,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  plan: ReleasePlan;
}): React.JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="double" borderColor="yellow" paddingX={2} paddingY={1}>
      <Text color="yellow" bold>
        Seal {plan.tagName}?
      </Text>
      <Text>This writes the release set, verifies the repository, then creates one commit and annotated tag.</Text>
      <Text dimColor>{NOTES_FILE} and three version manifests will change.</Text>
      <DecisionInput onCancel={onCancel} onConfirm={onConfirm} />
    </Box>
  );
}

function DecisionInput({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }): React.JSX.Element {
  useInput((input, key) => {
    if (input.toLowerCase() === "y") onConfirm();
    if (input.toLowerCase() === "n" || key.escape) onCancel();
  });

  return (
    <Box marginTop={1} gap={3}>
      <Text color="green" bold>
        [ y ] seal
      </Text>
      <Text dimColor>[ n ] leave untouched</Text>
    </Box>
  );
}

function CompletionPanel({ dryRun, plan }: { dryRun: boolean; plan?: ReleasePlan }): React.JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={2} paddingY={1}>
      <Text color="green" bold>
        {dryRun ? "Preview complete" : `${plan?.tagName ?? "Release"} sealed`}
      </Text>
      <Text>
        {dryRun
          ? "The repository is untouched."
          : "The release commit and annotated tag are ready to leave the observatory."}
      </Text>
      {!dryRun ? <Text dimColor>Next: git push origin release --follow-tags</Text> : null}
    </Box>
  );
}

function CancelledPanel(): React.JSX.Element {
  return (
    <Box borderStyle="round" borderColor="gray" paddingX={2} paddingY={1}>
      <Text>Release left untouched.</Text>
    </Box>
  );
}

function FailurePanel({ error }: { error: string }): React.JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={2} paddingY={1}>
      <Text color="red" bold>
        Release stopped
      </Text>
      <Text>{error}</Text>
      <Text dimColor>Release files are restored automatically unless the release commit was already created.</Text>
    </Box>
  );
}

function makeSteps(options: ReleaseCliOptions): Step[] {
  return [
    {
      id: "compose",
      label: "Compose",
      caption: options.offline ? "Read conventional commits" : "Read evidence with Codex",
      status: "pending",
    },
    {
      id: "review",
      label: options.dryRun ? "Preview" : "Review",
      caption: options.dryRun ? "Show the release brief" : "Wait for your decision",
      status: "pending",
    },
    { id: "write", label: "Write", caption: "Update notes and versions", status: "pending" },
    { id: "format", label: "Format", caption: "Run repository formatter", status: "pending" },
    { id: "verify", label: "Verify", caption: "Run repository checks", status: "pending" },
    { id: "commit", label: "Commit", caption: "Create one release commit", status: "pending" },
    { id: "tag", label: "Tag", caption: "Add the annotated version", status: "pending" },
  ];
}

function skipApplySteps(updateStep: (id: string, status: StepStatus, detail?: string) => void, detail: string): void {
  for (const id of ["write", "format", "verify", "commit", "tag"]) {
    updateStep(id, "skipped", detail);
  }
}

function flowLabel(status: FlowStatus, options: ReleaseCliOptions): string {
  if (status === "planning") return options.offline ? "composing offline" : "observing";
  if (status === "reviewing") return "your decision";
  if (status === "applying") return "sealing";
  if (status === "done") return options.dryRun ? "previewed" : "ready";
  if (status === "cancelled") return "untouched";
  return "stopped";
}

function stepColor(status: StepStatus): "green" | "yellow" | "red" | "gray" {
  if (status === "done") return "green";
  if (status === "active") return "yellow";
  if (status === "failed") return "red";
  return "gray";
}

function shortError(message: string): string {
  return message.split("\n")[0] ?? message;
}

function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
