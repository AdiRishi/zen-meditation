import type { PracticeTime, Weekday } from "./meditation";

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const shortTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const wallClockTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const shortDateWithYearFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
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

function startOfLocalDay(timeMs: number) {
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

export function dateForPracticeTime(time: Pick<PracticeTime, "hour" | "minute">) {
  return new Date(2000, 0, 1, time.hour, time.minute);
}

export function formatPracticeTime(time: Pick<PracticeTime, "hour" | "minute">) {
  return shortTimeFormatter.format(dateForPracticeTime(time));
}

function fixedOffsetDate(timeMs: number, timezoneOffsetMinutes: number) {
  return new Date(timeMs - timezoneOffsetMinutes * 60_000);
}

export function formatWallClockTime(timeMs: number, timezoneOffsetMinutes: number) {
  return wallClockTimeFormatter.format(fixedOffsetDate(timeMs, timezoneOffsetMinutes));
}

export function formatLocalDateLabel(dateKey: string, nowMs: number) {
  if (dateKey === toLocalDateKey(nowMs)) {
    return "Today";
  }
  if (dateKey === toLocalDateKey(addLocalDays(startOfLocalDay(nowMs), -1))) {
    return "Yesterday";
  }

  const date = fromLocalDateKey(dateKey);
  return date.getFullYear() === new Date(nowMs).getFullYear()
    ? shortDateFormatter.format(date)
    : shortDateWithYearFormatter.format(date);
}

export function formatSessionDaypart(timeMs: number, timezoneOffsetMinutes: number) {
  const hour = fixedOffsetDate(timeMs, timezoneOffsetMinutes).getUTCHours();
  if (hour < 12) {
    return "Morning";
  }
  if (hour < 18) {
    return "Afternoon";
  }
  return "Evening";
}

export function formatScheduledPractice(scheduledAtMs: number, nowMs: number) {
  const time = shortTimeFormatter.format(new Date(scheduledAtMs));
  const dateKey = toLocalDateKey(scheduledAtMs);
  if (dateKey === toLocalDateKey(nowMs)) {
    return time;
  }
  if (dateKey === toLocalDateKey(addLocalDays(startOfLocalDay(nowMs), 1))) {
    return `Tomorrow, ${time}`;
  }
  if (dateKey === toLocalDateKey(addLocalDays(startOfLocalDay(nowMs), 7))) {
    return `Next ${weekdayFormatter.format(new Date(scheduledAtMs))}, ${time}`;
  }
  return `${weekdayFormatter.format(new Date(scheduledAtMs))}, ${time}`;
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
