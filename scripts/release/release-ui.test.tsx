import { renderToString } from "ink";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";

import { ReleaseScreen, type ActivityItem, type FlowStatus, type Step } from "./release-ui.js";
import type { ReleasePlan } from "./release.js";

describe("release review interface", () => {
  it("presents the release brief and requires an explicit sealing decision", () => {
    const output = renderScreen("reviewing");

    assert.match(output, /MOSS \/ RELEASE OBSERVATORY/u);
    assert.match(output, /RELEASE TRAIL/u);
    assert.match(output, /1\.3\.1 → 1\.4\.0/u);
    assert.match(output, /2 commits · 3 files/u);
    assert.match(output, /A quieter return/u);
    assert.match(output, /Seal v1\.4\.0\?/u);
    assert.match(output, /\[ y \] seal/u);
    assert.match(output, /\[ n \] leave untouched/u);
  });

  it("makes the dry-run completion state unambiguous", () => {
    const output = renderScreen("done", true);

    assert.match(output, /Preview complete/u);
    assert.match(output, /repository is untouched/u);
    assert.doesNotMatch(output, /git push origin/u);
  });
});

function renderScreen(status: FlowStatus, dryRun = false): string {
  return renderToString(
    <ReleaseScreen
      activity={activity}
      error={undefined}
      onCancel={() => {}}
      onConfirm={() => {}}
      options={{ dryRun, offline: false }}
      plan={plan}
      status={status}
      steps={steps}
      width={120}
    />,
  );
}

const plan: ReleasePlan = {
  currentVersion: "1.3.1",
  nextVersion: "1.4.0",
  tagName: "v1.4.0",
  context: {
    baseRef: "v1.3.1",
    baseLabel: "v1.3.1",
    toRef: "HEAD",
    commits: [
      { hash: "abc", subject: "feat(mobile): soften completion", body: "" },
      { hash: "def", subject: "fix(mobile): keep launch calm", body: "" },
    ],
    diffStat: "3 files changed",
    changedFiles: ["one.ts", "two.ts", "three.ts"],
  },
  bump: {
    kind: "minor",
    reason: "A new user-visible completion experience.",
    source: "codex",
  },
  notes: {
    headline: "A quieter return",
    summary: "Completion now settles more gently.",
    highlights: ["Return from a session with a softer transition."],
    fixes: ["Keep the launch moment visually steady."],
    internalChanges: [],
    breakingChanges: [],
    testingNotes: [],
    riskNotes: [],
  },
  releaseSection: "fixture",
};

const steps: Step[] = [
  { id: "compose", label: "Compose", caption: "Read evidence with Codex", status: "done" },
  { id: "review", label: "Review", caption: "Wait for your decision", status: "active" },
  { id: "write", label: "Write", caption: "Update notes and versions", status: "pending" },
  { id: "format", label: "Format", caption: "Run repository formatter", status: "pending" },
  { id: "verify", label: "Verify", caption: "Run repository checks", status: "pending" },
  { id: "commit", label: "Commit", caption: "Create one release commit", status: "pending" },
  { id: "tag", label: "Tag", caption: "Add the annotated version", status: "pending" },
];

const activity: ActivityItem[] = [{ id: 1, message: "Release brief composed" }];
