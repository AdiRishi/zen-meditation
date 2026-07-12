import { addLocalDays, fromLocalDateKey, startOfLocalMonth, startOfLocalWeek, toLocalDateKey } from "./date-time";
import type { CompletedSession, Weekday } from "./meditation";

export type ProgressMode = "week" | "month";

export type ProgressBucket = {
  label: string;
  minutes: number;
  completed: boolean;
  dateKey: string;
};

export type ProgressSummary = {
  sessions: number;
  minutes: number;
  dayRhythm: number;
  buckets: ProgressBucket[];
};

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

function sessionsForRange(sessions: CompletedSession[], startMs: number, endMs: number) {
  return sessions.filter((session) => session.completedAtMs >= startMs && session.completedAtMs < endMs);
}

function minutesByDate(sessions: CompletedSession[]) {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    totals.set(session.localDate, (totals.get(session.localDate) ?? 0) + Math.round(session.durationMs / 60_000));
  }
  return totals;
}

export function calculateDayRhythm(sessions: CompletedSession[], selectedWeekdays: Weekday[], nowMs: number) {
  const completedDates = new Set(sessions.map((session) => session.localDate));
  const intendedDays = new Set<number>(selectedWeekdays);
  let cursor = new Date(nowMs);
  cursor.setHours(0, 0, 0, 0);

  if (intendedDays.has(cursor.getDay()) && !completedDates.has(toLocalDateKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let rhythm = 0;
  for (let scannedDays = 0; scannedDays < 3660; scannedDays += 1) {
    if (!intendedDays.has(cursor.getDay())) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (!completedDates.has(toLocalDateKey(cursor.getTime()))) {
      break;
    }

    rhythm += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return rhythm;
}

export function buildProgressSummary(
  sessions: CompletedSession[],
  selectedWeekdays: Weekday[],
  nowMs: number,
  mode: ProgressMode,
): ProgressSummary {
  const startMs = mode === "week" ? startOfLocalWeek(nowMs) : startOfLocalMonth(nowMs);
  const periodEnd = new Date(startMs);
  if (mode === "week") {
    periodEnd.setDate(periodEnd.getDate() + 7);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const periodSessions = sessionsForRange(sessions, startMs, periodEnd.getTime());
  const totals = minutesByDate(periodSessions);
  const buckets: ProgressBucket[] = [];

  if (mode === "week") {
    for (let index = 0; index < 7; index += 1) {
      const dateKey = toLocalDateKey(addLocalDays(startMs, index));
      const minutes = totals.get(dateKey) ?? 0;
      buckets.push({ label: WEEKDAY_LABELS[index], minutes, completed: minutes > 0, dateKey });
    }
  } else {
    const cursor = new Date(startMs);
    while (cursor.getTime() < periodEnd.getTime()) {
      const bucketStart = cursor.getTime();
      const bucketEnd = Math.min(addLocalDays(bucketStart, 7), periodEnd.getTime());
      const bucketSessions = sessionsForRange(periodSessions, bucketStart, bucketEnd);
      buckets.push({
        label: String(cursor.getDate()),
        minutes: bucketSessions.reduce((sum, session) => sum + Math.round(session.durationMs / 60_000), 0),
        completed: bucketSessions.length > 0,
        dateKey: toLocalDateKey(bucketStart),
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  return {
    sessions: periodSessions.length,
    minutes: periodSessions.reduce((sum, session) => sum + Math.round(session.durationMs / 60_000), 0),
    dayRhythm: calculateDayRhythm(sessions, selectedWeekdays, nowMs),
    buckets,
  };
}

export function completedDateKeys(sessions: CompletedSession[]) {
  return new Set(sessions.map((session) => session.localDate));
}

export function compareLocalDateKeys(left: string, right: string) {
  return fromLocalDateKey(left).getTime() - fromLocalDateKey(right).getTime();
}
