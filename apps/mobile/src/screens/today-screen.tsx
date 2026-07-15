import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import { LandscapeArtwork } from "@/components/ui/zen/brand-assets";
import { PracticeTimeRow } from "@/components/ui/zen/list-row";
import { WeekdaySelector } from "@/components/ui/zen/weekday-selector";
import { ZenPrimaryButton } from "@/components/ui/zen/zen-button";
import { ZenCard } from "@/components/ui/zen/zen-card";
import {
  addLocalDays,
  findNextPractice,
  formatScheduledPractice,
  startOfLocalWeek,
  toLocalDateKey,
} from "@/domain/date-time";
import type { Weekday } from "@/domain/meditation";
import { completedPracticeDateKeys } from "@/domain/progress";
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
  const { activeSession, completedSessions, pendingCompletion, preferences, reducedMotion } = useMeditation();
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
  const enter = (order: number) => (reducedMotion ? undefined : FadeInUp.duration(400).delay(order * 70));

  return (
    <StandardScrollView contentContainerClassName="gap-8 pb-8 pt-7">
      <Animated.View entering={enter(0)} className="gap-2">
        <Typography variant="eyebrow">{TODAY_DATE_FORMATTER.format(new Date(nowMs))}</Typography>
        <Typography accessibilityRole="header" variant="h1">
          {greetingForHour(new Date(nowMs).getHours())}
        </Typography>
        <Typography variant="reflection" tone="muted">
          A quiet rhythm carries you home.
        </Typography>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <ZenCard>
          <LandscapeArtwork height={168} />
          {nextPractice ? (
            <PracticeTimeRow
              time={nextPractice.practiceTime}
              value={`${formatScheduledPractice(nextPractice.scheduledAtMs, nowMs)} · ${preferences.lastDurationMinutes} min`}
              prominent
              onPress={() => router.push("/session-setup")}
            />
          ) : null}
        </ZenCard>
      </Animated.View>

      <Animated.View entering={enter(2)} className="gap-4">
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
      </Animated.View>

      <Animated.View entering={enter(3)}>
        <ZenPrimaryButton onPress={() => router.push("/session-setup")}>Begin</ZenPrimaryButton>
      </Animated.View>
    </StandardScrollView>
  );
}
