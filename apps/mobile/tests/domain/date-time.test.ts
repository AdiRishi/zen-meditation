import {
  dateForPracticeTime,
  formatLocalDateLabel,
  formatScheduledPractice,
  formatSessionDaypart,
  shortTimeFormatter,
} from "@/domain/date-time";

const shortDateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const shortDateWithYearFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long" });

describe("date-time presentation", () => {
  const now = new Date(2026, 6, 15, 12, 0).getTime();

  it("uses relative labels near today and includes a year only when needed", () => {
    expect(formatLocalDateLabel("2026-07-15", now)).toBe("Today");
    expect(formatLocalDateLabel("2026-07-14", now)).toBe("Yesterday");
    expect(formatLocalDateLabel("2026-07-01", now)).toBe(shortDateFormatter.format(new Date(2026, 6, 1)));
    expect(formatLocalDateLabel("2025-12-31", now)).toBe(shortDateWithYearFormatter.format(new Date(2025, 11, 31)));
  });

  it("creates picker values from one stable local reference date", () => {
    const date = dateForPracticeTime({ hour: 19, minute: 35 });

    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()]).toEqual([
      2000, 0, 1, 19, 35,
    ]);
  });

  it("classifies sessions using the wall-clock hour where they completed", () => {
    const completedAtMs = Date.UTC(2026, 6, 15, 2, 30);

    expect(formatSessionDaypart(completedAtMs, -600)).toBe("Afternoon");
    expect(formatSessionDaypart(completedAtMs, 240)).toBe("Evening");
  });

  it("distinguishes the same weekday next week from the upcoming week", () => {
    const tomorrow = new Date(2026, 6, 16, 8, 0).getTime();
    const upcoming = new Date(2026, 6, 18, 8, 0).getTime();
    const nextWeek = new Date(2026, 6, 22, 8, 0).getTime();

    expect(formatScheduledPractice(tomorrow, now)).toBe(`Tomorrow, ${shortTimeFormatter.format(new Date(tomorrow))}`);
    expect(formatScheduledPractice(upcoming, now)).toBe(
      `${weekdayFormatter.format(new Date(upcoming))}, ${shortTimeFormatter.format(new Date(upcoming))}`,
    );
    expect(formatScheduledPractice(nextWeek, now)).toBe(
      `Next ${weekdayFormatter.format(new Date(nextWeek))}, ${shortTimeFormatter.format(new Date(nextWeek))}`,
    );
  });
});
