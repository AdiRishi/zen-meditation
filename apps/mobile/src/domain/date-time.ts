import type { PracticeTime, Weekday } from "./meditation";

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const shortTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export const monthYearFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

export const sessionDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function toLocalDateKey(timeMs: number) {
  const date = new Date(timeMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromLocalDateKey(key: string) {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) {
    throw new Error(`Invalid local date key: ${key}`);
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function startOfLocalDay(timeMs: number) {
  const date = new Date(timeMs);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function startOfLocalWeek(timeMs: number) {
  const date = new Date(startOfLocalDay(timeMs));
  const daysFromMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysFromMonday);
  return date.getTime();
}

export function startOfLocalMonth(timeMs: number) {
  const date = new Date(timeMs);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  return date.getTime();
}

export function addLocalDays(timeMs: number, amount: number) {
  const date = new Date(timeMs);
  date.setDate(date.getDate() + amount);
  return date.getTime();
}

export function formatPracticeTime(time: Pick<PracticeTime, "hour" | "minute">) {
  const date = new Date(2026, 0, 1, time.hour, time.minute);
  return shortTimeFormatter.format(date);
}

export type NextPractice = {
  practiceTime: PracticeTime;
  scheduledAtMs: number;
};

export function findNextPractice(
  practiceTimes: PracticeTime[],
  selectedWeekdays: Weekday[],
  nowMs: number,
): NextPractice | null {
  const enabledTimes = practiceTimes.filter((time) => time.enabled);
  if (enabledTimes.length === 0 || selectedWeekdays.length === 0) {
    return null;
  }

  const selected = new Set<number>(selectedWeekdays);
  let next: NextPractice | null = null;

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const day = new Date(nowMs);
    day.setDate(day.getDate() + dayOffset);
    if (!selected.has(day.getDay())) {
      continue;
    }

    for (const practiceTime of enabledTimes) {
      const candidate = new Date(day);
      candidate.setHours(practiceTime.hour, practiceTime.minute, 0, 0);
      const scheduledAtMs = candidate.getTime();
      if (scheduledAtMs <= nowMs) {
        continue;
      }

      if (!next || scheduledAtMs < next.scheduledAtMs) {
        next = { practiceTime, scheduledAtMs };
      }
    }

    if (next) {
      return next;
    }
  }

  return null;
}
