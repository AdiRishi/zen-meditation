import { addLocalDays, startOfLocalMonth, startOfLocalWeek, toLocalDateKey } from "./date-time";
import type { CompletedSession, Weekday } from "./meditation";

export type ProgressMode = "week" | "month";

export type ProgressBucket = {
  label: string;
  minutes: number;
  completed: boolean;
  dateKey: string;
  endDateKey: string;
};

export type ProgressSummary = {
  sessions: number;
  minutes: number;
  dayRhythm: number;
  practiceDays: number;
  buckets: ProgressBucket[];
};

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

function sessionsForDateRange(sessions: CompletedSession[], startDateKey: string, endDateKey: string) {
  return sessions.filter((session) => session.localDate >= startDateKey && session.localDate < endDateKey);
}

function minutesByDate(sessions: CompletedSession[]) {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    totals.set(session.localDate, (totals.get(session.localDate) ?? 0) + Math.round(session.durationMs / 60_000));
  }
  return totals;
}

function sessionCountsByDate(sessions: CompletedSession[]) {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    counts.set(session.localDate, (counts.get(session.localDate) ?? 0) + 1);
  }
  return counts;
}

export function completedPracticeDateKeys(sessions: CompletedSession[], sessionsPerDay: number) {
  const completedDates = new Set<string>();
  for (const [dateKey, sessionCount] of sessionCountsByDate(sessions)) {
    if (sessionCount >= sessionsPerDay) {
      completedDates.add(dateKey);
    }
  }
  return completedDates;
}

export function calculateDayRhythm(
  sessions: CompletedSession[],
  selectedWeekdays: Weekday[],
  nowMs: number,
  sessionsPerDay = 1,
) {
  const completedDates = completedPracticeDateKeys(sessions, sessionsPerDay);
  const intendedDays = new Set<number>(selectedWeekdays);
  if (completedDates.size === 0 || intendedDays.size === 0) {
    return 0;
  }

  let cursor = new Date(nowMs);
  cursor.setHours(0, 0, 0, 0);

  if (intendedDays.has(cursor.getDay()) && !completedDates.has(toLocalDateKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let rhythm = 0;
  while (rhythm < completedDates.size) {
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
  sessionsPerDay = 1,
): ProgressSummary {
  const startMs = mode === "week" ? startOfLocalWeek(nowMs) : startOfLocalMonth(nowMs);
  const calendarPeriodEnd = new Date(startMs);
  if (mode === "week") {
    calendarPeriodEnd.setDate(calendarPeriodEnd.getDate() + 7);
  } else {
    calendarPeriodEnd.setMonth(calendarPeriodEnd.getMonth() + 1);
  }
  const periodEndMs =
    mode === "month" ? Math.min(addLocalDays(nowMs, 1), calendarPeriodEnd.getTime()) : calendarPeriodEnd.getTime();

  const periodStartKey = toLocalDateKey(startMs);
  const periodEndKey = toLocalDateKey(periodEndMs);
  const periodSessions = sessionsForDateRange(sessions, periodStartKey, periodEndKey);
  const totals = minutesByDate(periodSessions);
  const completedDates = completedPracticeDateKeys(periodSessions, sessionsPerDay);
  const buckets: ProgressBucket[] = [];

  if (mode === "week") {
    for (let index = 0; index < 7; index += 1) {
      const dateKey = toLocalDateKey(addLocalDays(startMs, index));
      const minutes = totals.get(dateKey) ?? 0;
      buckets.push({
        label: WEEKDAY_LABELS[index],
        minutes,
        completed: completedDates.has(dateKey),
        dateKey,
        endDateKey: dateKey,
      });
    }
  } else {
    const cursor = new Date(startMs);
    while (cursor.getTime() < periodEndMs) {
      const bucketStart = cursor.getTime();
      const bucketEnd = Math.min(addLocalDays(bucketStart, 7), periodEndMs);
      const bucketSessions = sessionsForDateRange(
        periodSessions,
        toLocalDateKey(bucketStart),
        toLocalDateKey(bucketEnd),
      );
      const bucketEndDateKey = toLocalDateKey(addLocalDays(bucketEnd, -1));
      buckets.push({
        label: `${cursor.getDate()}–${new Date(addLocalDays(bucketEnd, -1)).getDate()}`,
        minutes: bucketSessions.reduce((sum, session) => sum + Math.round(session.durationMs / 60_000), 0),
        completed: completedPracticeDateKeys(bucketSessions, sessionsPerDay).size > 0,
        dateKey: toLocalDateKey(bucketStart),
        endDateKey: bucketEndDateKey,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  return {
    sessions: periodSessions.length,
    minutes: periodSessions.reduce((sum, session) => sum + Math.round(session.durationMs / 60_000), 0),
    dayRhythm: calculateDayRhythm(sessions, selectedWeekdays, nowMs, sessionsPerDay),
    practiceDays: new Set(periodSessions.map((session) => session.localDate)).size,
    buckets,
  };
}

export function completedDateKeys(sessions: CompletedSession[]) {
  return new Set(sessions.map((session) => session.localDate));
}
