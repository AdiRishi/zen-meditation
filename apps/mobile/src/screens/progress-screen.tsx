import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { PracticeRhythm } from "@/components/screens/progress/practice-rhythm";
import { PracticeStateCard } from "@/components/screens/progress/practice-state-card";
import { ProgressChart } from "@/components/screens/progress/progress-chart";
import { ProgressPeriodControl } from "@/components/screens/progress/progress-period-control";
import { ProgressStats } from "@/components/screens/progress/progress-stats";
import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import { buildProgressSummary, type ProgressMode } from "@/domain/progress";
import { useMeditation } from "@/providers/meditation-provider";

export function ProgressScreen() {
  const router = useRouter();
  const { completedSessions, error, isReady, preferences, refresh } = useMeditation();
  const [mode, setMode] = useState<ProgressMode>("week");
  const [nowMs, setNowMs] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNowMs(Date.now());
    }, []),
  );
  const summary = buildProgressSummary(
    completedSessions,
    preferences.selectedWeekdays,
    nowMs,
    mode,
    preferences.sessionsPerDay,
  );
  const periodLabel = mode === "week" ? "this week" : "this month";
  const hasPracticeHistory = completedSessions.length > 0;

  return (
    <StandardScrollView className="flex-1" contentContainerClassName="gap-7 pb-8 pt-7">
      <View className="gap-2">
        <Typography variant="eyebrow">Progress</Typography>
        <Typography accessibilityRole="header" variant="h1">
          Your rhythm
        </Typography>
      </View>

      <ProgressPeriodControl mode={mode} onChange={setMode} />

      {!isReady ? (
        <PracticeStateCard title="Preparing your rhythm…" message="Just a moment." />
      ) : error ? (
        <PracticeStateCard
          title="Your rhythm needs a moment."
          message="Zen could not read your practice history."
          actionLabel="Try again"
          onAction={() => void refresh()}
        />
      ) : (
        <View className="gap-12">
          <PracticeRhythm buckets={summary.buckets} mode={mode} />
          <ProgressStats sessions={summary.sessions} minutes={summary.minutes} dayRhythm={summary.dayRhythm} />
          {summary.sessions > 0 ? (
            <ProgressChart
              buckets={summary.buckets}
              mode={mode}
              onOpenHistory={() => router.push("/(tabs)/progress/history")}
            />
          ) : (
            <PracticeStateCard
              title={hasPracticeHistory ? `No sessions ${periodLabel}` : "No sessions yet"}
              message={hasPracticeHistory ? "Begin whenever it feels right." : "Begin a session to see it here."}
              actionLabel="Begin"
              onAction={() => router.push("/session-setup")}
              secondaryActionLabel={hasPracticeHistory ? "View practice history" : undefined}
              onSecondaryAction={hasPracticeHistory ? () => router.push("/(tabs)/progress/history") : undefined}
              showArtwork
            />
          )}
        </View>
      )}
    </StandardScrollView>
  );
}
