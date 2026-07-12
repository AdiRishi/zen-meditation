import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import { LandscapeArtwork } from "@/components/ui/zen/brand-assets";
import { PracticeTimeRow, GroupedList } from "@/components/ui/zen/list-row";
import { WeekdaySelector } from "@/components/ui/zen/weekday-selector";
import { ZenPrimaryButton } from "@/components/ui/zen/zen-button";
import {
  addLocalDays,
  findNextPractice,
  formatScheduledPractice,
  startOfLocalWeek,
  toLocalDateKey,
} from "@/domain/date-time";
import type { Weekday } from "@/domain/meditation";
import { useMeditation } from "@/providers/meditation-provider";

export function TodayScreen() {
  const router = useRouter();
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
  const sessionsByDate = new Map<string, number>();

  for (const session of completedSessions) {
    sessionsByDate.set(session.localDate, (sessionsByDate.get(session.localDate) ?? 0) + 1);
  }
  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const dateMs = addLocalDays(weekStart, dayOffset);
    if ((sessionsByDate.get(toLocalDateKey(dateMs)) ?? 0) >= preferences.sessionsPerDay) {
      completedWeekdays.add(new Date(dateMs).getDay() as Weekday);
    }
  }

  const nextPractice = findNextPractice(preferences.practiceTimes, preferences.selectedWeekdays, nowMs);

  return (
    <StandardScrollView contentContainerClassName="gap-7 pb-8 pt-8">
      <Typography accessibilityRole="header" variant="h3" align="center" className="font-serif font-normal">
        Today
      </Typography>
      <Typography variant="h1">A quiet rhythm{"\n"}carries you home.</Typography>
      <LandscapeArtwork height={180} className="-mx-6" />

      {nextPractice ? (
        <GroupedList>
          <PracticeTimeRow
            time={nextPractice.practiceTime}
            detail={`${preferences.lastDurationMinutes} min`}
            value={formatScheduledPractice(nextPractice.scheduledAtMs, nowMs)}
            prominent
            onPress={() => router.push("/session-setup")}
          />
        </GroupedList>
      ) : null}

      <View className="gap-3">
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

      <ZenPrimaryButton onPress={() => router.push("/session-setup")}>Begin</ZenPrimaryButton>
    </StandardScrollView>
  );
}
