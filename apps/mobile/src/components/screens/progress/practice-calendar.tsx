import { Pressable, View } from "react-native";

import { Typography } from "@/components/ui/typography";
import { ZenIcon } from "@/components/ui/zen/zen-icon";
import { toLocalDateKey } from "@/domain/date-time";
import { useThemeColors } from "@/hooks/use-theme-colors";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const CALENDAR_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

type CalendarDay = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isCompleted: boolean;
};

function calendarDays(monthStartMs: number, completedDates: Set<string>) {
  const monthStart = new Date(monthStartMs);
  const daysFromMonday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((daysFromMonday + daysInMonth) / 7) * 7;
  const cursor = new Date(monthStart);
  cursor.setDate(cursor.getDate() - daysFromMonday);
  const days: CalendarDay[] = [];

  for (let index = 0; index < cellCount; index += 1) {
    const date = new Date(cursor);
    const dateKey = toLocalDateKey(date.getTime());
    days.push({
      date,
      dateKey,
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isCompleted: completedDates.has(dateKey),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

type PracticeCalendarProps = {
  monthStartMs: number;
  completedDates: Set<string>;
  onPreviousMonth(): void;
  onNextMonth(): void;
};

export function PracticeCalendar({
  monthStartMs,
  completedDates,
  onPreviousMonth,
  onNextMonth,
}: PracticeCalendarProps) {
  const colors = useThemeColors();
  const month = new Date(monthStartMs);
  const days = calendarDays(monthStartMs, completedDates);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityLabel="Show previous month"
          accessibilityRole="button"
          className="size-11 items-center justify-center rounded-full"
          hitSlop={4}
          onPress={onPreviousMonth}
        >
          <ZenIcon name="back" size={18} tintColor={colors.foreground} />
        </Pressable>
        <Typography accessibilityRole="header" accessibilityLiveRegion="polite" variant="h3" tabularNums>
          {MONTH_FORMATTER.format(month)}
        </Typography>
        <Pressable
          accessibilityLabel="Show next month"
          accessibilityRole="button"
          className="size-11 items-center justify-center rounded-full"
          hitSlop={4}
          onPress={onNextMonth}
        >
          <ZenIcon name="forward" size={18} tintColor={colors.foreground} />
        </Pressable>
      </View>

      <View className="flex-row">
        {WEEKDAYS.map((weekday, index) => (
          <View key={`${weekday}-${index}`} className="min-h-8 flex-1 items-center justify-center">
            <Typography variant="label" tone="muted" align="center">
              {weekday}
            </Typography>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {days.map((day) => {
          const status = day.isCompleted ? "practice completed" : "no practice recorded";
          return (
            <View
              key={day.dateKey}
              accessible
              accessibilityLabel={`${CALENDAR_DATE_FORMATTER.format(day.date)}, ${status}`}
              accessibilityRole="text"
              className="min-h-11 w-[14.2857%] items-center justify-center py-0.5"
            >
              <View
                className={`min-h-10 min-w-10 items-center justify-center rounded-full px-1 ${
                  day.isCompleted ? "border-2 border-accent" : "border-2 border-transparent"
                }`}
              >
                <Typography variant="small" tone={day.isCurrentMonth ? "default" : "muted"} align="center" tabularNums>
                  {day.date.getDate()}
                </Typography>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
