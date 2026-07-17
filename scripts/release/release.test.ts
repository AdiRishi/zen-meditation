import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  heuristicBump,
  nextVersionFor,
  parseReleaseCommits,
  renderReleaseSection,
  type ReleaseCommit,
  type ReleaseNotes,
} from "./release.js";

describe("release policy", () => {
  it("advances semantic versions without carrying lower-order segments", () => {
    assert.equal(nextVersionFor("2.4.7", "patch"), "2.4.8");
    assert.equal(nextVersionFor("2.4.7", "minor"), "2.5.0");
    assert.equal(nextVersionFor("2.4.7", "major"), "3.0.0");
  });

  it("treats a breaking-change footer as a major release", () => {
    const commits = [
      commit("feat(mobile): replace stored schedule format", "BREAKING CHANGE: existing schedules must be recreated."),
    ];

    assert.equal(heuristicBump(commits).kind, "major");
  });

  it("distinguishes product features from release and documentation work", () => {
    assert.equal(heuristicBump([commit("feat(mobile): add breathing pace")]).kind, "minor");
    assert.equal(heuristicBump([commit("feat(docs): publish the support guide")]).kind, "patch");
    assert.equal(heuristicBump([commit("feat(release): automate store metadata")]).kind, "patch");
  });
});

describe("release evidence", () => {
  it("preserves commit subjects and bodies from the Git record format", () => {
    const records = [
      `abc\u0000feat(mobile): add a timer\u0000Detailed body\u001e`,
      `def\u0000fix(mobile): keep the screen awake\u0000\u001e`,
    ].join("");

    assert.deepEqual(parseReleaseCommits(records), [
      { hash: "abc", subject: "feat(mobile): add a timer", body: "Detailed body" },
      { hash: "def", subject: "fix(mobile): keep the screen awake", body: "" },
    ]);
  });
});

describe("release notes", () => {
  it("renders only populated sections in the release document", () => {
    const notes: ReleaseNotes = {
      headline: "A steadier practice",
      summary: "Sessions now stay on pace more reliably.",
      highlights: ["Choose a breathing pace."],
      fixes: ["Keep the screen awake during a session."],
      internalChanges: [],
      breakingChanges: [],
      testingNotes: [],
      riskNotes: [],
    };

    const result = renderReleaseSection("v2.5.0", notes, new Date("2026-07-17T00:00:00.000Z"));

    assert.match(result, /^## v2\.5\.0 - 2026-07-17/mu);
    assert.match(result, /### Highlights\n\n- Choose a breathing pace\./u);
    assert.match(result, /### Fixes\n\n- Keep the screen awake during a session\./u);
    assert.doesNotMatch(result, /Internal Changes/u);
  });
});

function commit(subject: string, body = ""): ReleaseCommit {
  return { hash: "abc1234", subject, body };
}
