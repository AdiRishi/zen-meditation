import type { CompletedSession } from "@/domain/meditation";
import { buildProgressSummary, completedPracticeDateKeys } from "@/domain/progress";

function buildSession(day: number, durationMinutes: number, sequence = 1): CompletedSession {
  const completedAtMs = new Date(2026, 6, day, 7, 0).getTime();
  return {
    id: `session-${day}-${sequence}`,
    startedAtMs: completedAtMs - durationMinutes * 60_000,
    completedAtMs,
    localDate: `2026-07-${String(day).padStart(2, "0")}`,
    timezoneOffsetMinutes: new Date(completedAtMs).getTimezoneOffset(),
    durationMs: durationMinutes * 60_000,
    completionSound: "soft-chime",
    feeling: null,
    acknowledgedAtMs: completedAtMs,
  };
}

describe("progress summary", () => {
  it("derives weekly totals and rhythm from independently known completed practices", () => {
    const sessions = [buildSession(6, 5), buildSession(7, 10), buildSession(8, 15), buildSession(9, 20)];
    const nowMs = new Date(2026, 6, 10, 6, 0).getTime();

    const summary = buildProgressSummary(sessions, [1, 2, 3, 4, 5], nowMs, "week");

    expect(summary).toMatchObject({ sessions: 4, minutes: 50, dayRhythm: 4, practiceDays: 4 });
    expect(summary.buckets.map((bucket) => bucket.minutes)).toEqual([5, 10, 15, 20, 0, 0, 0]);
  });

  it("keeps non-practice days neutral when calculating the current rhythm", () => {
    const sessions = [buildSession(9, 10), buildSession(10, 10)];
    const nowMs = new Date(2026, 6, 13, 8, 0).getTime();

    const summary = buildProgressSummary(sessions, [1, 2, 3, 4, 5], nowMs, "week");

    expect(summary.dayRhythm).toBe(2);
  });

  it("counts a practice day only after its intended number of sessions", () => {
    const sessions = [buildSession(6, 10), buildSession(7, 10), buildSession(7, 10, 2)];
    const nowMs = new Date(2026, 6, 8, 6, 0).getTime();

    const summary = buildProgressSummary(sessions, [1, 2, 3, 4, 5], nowMs, "week", 2);

    expect(summary.dayRhythm).toBe(1);
    expect(summary.buckets.slice(0, 2).map((bucket) => bucket.completed)).toEqual([false, true]);
    expect(completedPracticeDateKeys(sessions, 2)).toEqual(new Set(["2026-07-07"]));
  });

  it("uses the completion-zone date when the device has since changed time zones", () => {
    const completedAtMs = Date.UTC(2026, 6, 5, 20, 30);
    const session = {
      ...buildSession(6, 10),
      startedAtMs: completedAtMs - 10 * 60_000,
      completedAtMs,
      localDate: "2026-07-06",
      timezoneOffsetMinutes: -600,
    };

    const summary = buildProgressSummary([session], [1, 2, 3, 4, 5], new Date(2026, 6, 10).getTime(), "week");

    expect(summary.sessions).toBe(1);
    expect(summary.buckets[0].minutes).toBe(10);
  });

  it("groups only elapsed monthly ranges and excludes future sessions", () => {
    const sessions = [buildSession(1, 5), buildSession(8, 10), buildSession(15, 15), buildSession(22, 20)];
    const nowMs = new Date(2026, 6, 17, 12, 0).getTime();

    const summary = buildProgressSummary(sessions, [1, 2, 3, 4, 5], nowMs, "month");

    expect(summary).toMatchObject({ sessions: 3, minutes: 30, practiceDays: 3 });
    expect(summary.buckets.map(({ dateKey, endDateKey, minutes }) => ({ dateKey, endDateKey, minutes }))).toEqual([
      { dateKey: "2026-07-01", endDateKey: "2026-07-07", minutes: 5 },
      { dateKey: "2026-07-08", endDateKey: "2026-07-14", minutes: 10 },
      { dateKey: "2026-07-15", endDateKey: "2026-07-17", minutes: 15 },
    ]);
  });
});
