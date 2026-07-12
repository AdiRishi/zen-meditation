import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { PracticeCalendar } from "@/components/screens/progress/practice-calendar";
import { PracticeStateCard } from "@/components/screens/progress/practice-state-card";
import { SessionHistoryList } from "@/components/screens/progress/session-history-list";
import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import { ScreenHeader } from "@/components/ui/zen/screen-header";
import { startOfLocalMonth, toLocalDateKey } from "@/domain/date-time";
import { completedDateKeys } from "@/domain/progress";
import { useMeditation } from "@/providers/meditation-provider";

function moveMonth(monthStartMs: number, amount: number) {
  const next = new Date(monthStartMs);
  next.setMonth(next.getMonth() + amount);
  return next.getTime();
}

export function PracticeHistoryScreen() {
  const router = useRouter();
  const { completedSessions, error, isReady, refresh } = useMeditation();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [monthStartMs, setMonthStartMs] = useState(() => startOfLocalMonth(nowMs));
  useFocusEffect(
    useCallback(() => {
      setNowMs(Date.now());
    }, []),
  );
  const monthKey = toLocalDateKey(monthStartMs).slice(0, 7);
  const monthSessions = completedSessions
    .filter((session) => session.localDate.startsWith(monthKey))
    .sort((left, right) => right.completedAtMs - left.completedAtMs);

  return (
    <StandardScrollView className="flex-1" contentContainerClassName="gap-6 pb-8">
      <ScreenHeader title="Practice history" />

      {!isReady ? (
        <PracticeStateCard title="Preparing your history…" message="Just a moment." />
      ) : error ? (
        <PracticeStateCard
          title="Your history needs a moment."
          message="Zen could not read your practice history."
          actionLabel="Try again"
          onAction={() => void refresh()}
        />
      ) : (
        <>
          <PracticeCalendar
            monthStartMs={monthStartMs}
            completedDates={completedDateKeys(completedSessions)}
            onPreviousMonth={() => setMonthStartMs((current) => moveMonth(current, -1))}
            onNextMonth={() => setMonthStartMs((current) => moveMonth(current, 1))}
          />

          <View className="h-px bg-separator" />

          <View className="gap-4">
            <Typography accessibilityRole="header" variant="h3">
              Recent sessions
            </Typography>
            {monthSessions.length > 0 ? (
              <SessionHistoryList sessions={monthSessions} nowMs={nowMs} />
            ) : (
              <PracticeStateCard
                title={completedSessions.length > 0 ? "No sessions this month" : "No sessions yet"}
                message={
                  completedSessions.length > 0
                    ? "Your practice from other months remains in your history."
                    : "Begin a session to see it here."
                }
                actionLabel="Begin"
                onAction={() => router.push("/session-setup")}
                showArtwork
              />
            )}
          </View>
        </>
      )}
    </StandardScrollView>
  );
}
