import { activeSessionSchema } from "@/domain/meditation";
import { completeSession, pauseSession, projectSession, resumeSession } from "@/domain/session-timer";

const STARTED_AT = new Date(2026, 6, 13, 7, 0).getTime();

function buildActiveSession() {
  return activeSessionSchema.parse({
    id: "session-one",
    plannedDurationMs: 10 * 60_000,
    startedAtMs: STARTED_AT,
    accumulatedActiveMs: 0,
    resumedAtMs: STARTED_AT,
    status: "running",
    completionSound: "soft-chime",
    completionLocalDate: "2026-07-13",
    completionTimezoneOffsetMinutes: new Date(STARTED_AT + 10 * 60_000).getTimezoneOffset(),
  });
}

describe("session timer", () => {
  it("keeps elapsed practice frozen while paused and resumes from persisted timestamps", () => {
    const paused = pauseSession(buildActiveSession(), STARTED_AT + 2 * 60_000);
    expect(projectSession(paused, STARTED_AT + 5 * 60_000)).toMatchObject({
      elapsedMs: 2 * 60_000,
      remainingMs: 8 * 60_000,
      isComplete: false,
    });

    const resumed = resumeSession(paused, STARTED_AT + 5 * 60_000);
    expect(projectSession(resumed, STARTED_AT + 13 * 60_000)).toMatchObject({
      elapsedMs: 10 * 60_000,
      remainingMs: 0,
      isComplete: true,
    });
  });

  it("records completion at the exact active-time deadline after a delayed wake-up", () => {
    const delayedWakeUp = STARTED_AT + 10 * 60_000 + 25_000;
    const completed = completeSession(buildActiveSession(), delayedWakeUp);

    expect(completed.completedAtMs).toBe(STARTED_AT + 10 * 60_000);
    expect(completed.durationMs).toBe(10 * 60_000);
    expect(completed.acknowledgedAtMs).toBeNull();
  });

  it("does not allow an early end to count as a completed practice", () => {
    expect(() => completeSession(buildActiveSession(), STARTED_AT + 60_000)).toThrow(
      "A session cannot be completed while time remains.",
    );
  });

  it("keeps completion timestamps valid after a backward device-clock adjustment", () => {
    const session = {
      ...buildActiveSession(),
      accumulatedActiveMs: 10 * 60_000,
      resumedAtMs: null,
      status: "paused" as const,
    };

    const completed = completeSession(session, STARTED_AT - 60_000);

    expect(completed.completedAtMs).toBe(STARTED_AT);
  });

  it("preserves the planned completion date when an overdue session is recovered elsewhere", () => {
    const session = {
      ...buildActiveSession(),
      completionLocalDate: "2026-07-14",
      completionTimezoneOffsetMinutes: -600,
    };

    const completed = completeSession(session, STARTED_AT + 11 * 60_000);

    expect(completed.localDate).toBe("2026-07-14");
    expect(completed.timezoneOffsetMinutes).toBe(-600);
  });
});
