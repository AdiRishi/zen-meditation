import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { LandscapeArtwork } from "@/components/ui/moss/brand-assets";
import { MossPrimaryButton } from "@/components/ui/moss/moss-button";
import { MossIcon } from "@/components/ui/moss/moss-icon";
import { MossPressable } from "@/components/ui/moss/moss-pressable";
import { WeekdaySelector } from "@/components/ui/moss/weekday-selector";
import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import {
  addLocalDays,
  findNextPractice,
  formatScheduledPractice,
  startOfLocalWeek,
  toLocalDateKey,
} from "@/domain/date-time";
import type { Weekday } from "@/domain/meditation";
import { completedPracticeDateKeys } from "@/domain/progress";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useMeditation } from "@/providers/meditation-provider";

const TODAY_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function greetingForHour(hour: number) {
  if (hour < 12) {
    return "Good morning.";
  }
  if (hour < 18) {
    return "Good afternoon.";
  }
  return "Good evening.";
}

export function TodayScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { activeSession, completedSessions, pendingCompletion, preferences } = useMeditation();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNowMs(Date.now());
    }, []),
  );

  if (pendingCompletion) {
    return <Redirect href={{ pathname: "/session-complete", params: { id: pendingCompletion.id } }} />;
  }
  if (activeSession) {
    return <Redirect href="/meditation" />;
  }

  const todayKey = toLocalDateKey(nowMs);
  const todaySessions = completedSessions.filter((session) => session.localDate === todayKey);
  const weekStart = startOfLocalWeek(nowMs);
  const completedWeekdays = new Set<Weekday>();
  const completedDates = completedPracticeDateKeys(completedSessions, preferences.sessionsPerDay);
  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const dateMs = addLocalDays(weekStart, dayOffset);
    if (completedDates.has(toLocalDateKey(dateMs))) {
      completedWeekdays.add(new Date(dateMs).getDay() as Weekday);
    }
  }

  const nextPractice = findNextPractice(preferences.practiceTimes, preferences.selectedWeekdays, nowMs);
  return (
    <StandardScrollView contentContainerClassName="gap-8 pb-8 pt-7">
      <View className="gap-2">
        <Typography variant="eyebrow">{TODAY_DATE_FORMATTER.format(new Date(nowMs))}</Typography>
        <Typography accessibilityRole="header" variant="h1">
          {greetingForHour(new Date(nowMs).getHours())}
        </Typography>
        <Typography variant="reflection" tone="muted">
          A quiet rhythm carries you home.
        </Typography>
      </View>

      <View className="-mx-6">
        <LandscapeArtwork height={248} fadeTop={64} fadeBottom={72} />
        {nextPractice ? (
          <MossPressable
            accessibilityRole="button"
            accessibilityLabel={`${nextPractice.practiceTime.label}, ${formatScheduledPractice(nextPractice.scheduledAtMs, nowMs)}, ${preferences.lastDurationMinutes} minutes`}
            accessibilityHint="Opens session setup"
            feedback="scale"
            pressedScale={0.98}
            className="-mt-6 min-h-14 items-center justify-center gap-1 px-6"
            onPress={() => router.push("/session-setup")}
          >
            <View className="flex-row items-center gap-2">
              <MossIcon
                name={nextPractice.practiceTime.hour < 12 ? "sun" : "moon"}
                size={15}
                tintColor={colors.muted}
              />
              <Typography variant="h3">{nextPractice.practiceTime.label}</Typography>
            </View>
            <Typography variant="small" tone="muted" tabularNums>
              {`${formatScheduledPractice(nextPractice.scheduledAtMs, nowMs)} · ${preferences.lastDurationMinutes} min`}
            </Typography>
          </MossPressable>
        ) : null}
      </View>

      <View className="gap-4">
        <WeekdaySelector selected={preferences.selectedWeekdays} completed={completedWeekdays} compact />
        <View className="flex-row items-center justify-between">
          <Typography variant="small" tone="muted">
            Your weekly rhythm
          </Typography>
          <Typography variant="small" tone="muted" tabularNums>
            {todaySessions.length === 0
              ? "No sessions yet today"
              : preferences.sessionsPerDay > 1 && todaySessions.length <= preferences.sessionsPerDay
                ? `${todaySessions.length} of ${preferences.sessionsPerDay} sessions today`
                : `${todaySessions.length} ${todaySessions.length === 1 ? "session" : "sessions"} today`}
          </Typography>
        </View>
      </View>

      <View>
        <MossPrimaryButton onPress={() => router.push("/session-setup")}>Begin</MossPrimaryButton>
      </View>
    </StandardScrollView>
  );
}
