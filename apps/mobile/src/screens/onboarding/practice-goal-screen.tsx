import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import { CounterCard } from "@/components/ui/zen/counter-card";
import { ScreenHeader } from "@/components/ui/zen/screen-header";
import { WeekdaySelector } from "@/components/ui/zen/weekday-selector";
import { ZenPrimaryButton } from "@/components/ui/zen/zen-button";
import type { Weekday } from "@/domain/meditation";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useMeditation } from "@/providers/meditation-provider";

const WEEKDAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export function PracticeGoalScreen() {
  const router = useRouter();
  const { preferences, savePreferences } = useMeditation();
  const [selectedWeekdays, setSelectedWeekdays] = useState(preferences.selectedWeekdays);
  const [sessionsPerDay, setSessionsPerDay] = useState(preferences.sessionsPerDay);
  const action = useAsyncAction();

  const setDayCount = (count: number) => {
    const next = WEEKDAY_ORDER.filter((day) => selectedWeekdays.includes(day)).slice(0, count);
    for (const day of WEEKDAY_ORDER) {
      if (next.length >= count) {
        break;
      }
      if (!next.includes(day)) {
        next.push(day);
      }
    }
    setSelectedWeekdays(next);
  };

  const continueOnboarding = async () => {
    const completed = await action.run(() =>
      savePreferences({
        ...preferences,
        selectedWeekdays,
        sessionsPerDay,
        onboardingStep: "schedule",
      }),
    );
    if (completed) {
      router.push("/onboarding/schedule");
    }
  };

  return (
    <StandardScrollView contentContainerClassName="min-h-full justify-between gap-8 pb-6">
      <View className="gap-8">
        <ScreenHeader onBack={() => router.back()} />
        <Typography accessibilityRole="header" variant="h1">
          How often would you{"\n"}like to sit?
        </Typography>
        <View className="gap-4">
          <WeekdaySelector selected={selectedWeekdays} onChange={setSelectedWeekdays} />
          <Typography variant="small" tone="muted">
            Your intended practice days
          </Typography>
        </View>
        <View className="h-px bg-separator" />
        <View className="gap-4">
          <CounterCard
            value={selectedWeekdays.length}
            label={selectedWeekdays.length === 1 ? "day per week" : "days per week"}
            minimum={1}
            maximum={7}
            onChange={setDayCount}
          />
          <CounterCard
            value={sessionsPerDay}
            label={sessionsPerDay === 1 ? "session on practice days" : "sessions on practice days"}
            minimum={1}
            maximum={3}
            onChange={setSessionsPerDay}
          />
        </View>
      </View>
      <View className="gap-3">
        {action.error ? (
          <Typography variant="small" tone="danger" accessibilityLiveRegion="polite">
            Your intention couldn’t be saved. Please try again.
          </Typography>
        ) : null}
        <ZenPrimaryButton isDisabled={action.isPending} onPress={() => void continueOnboarding()}>
          {action.isPending ? "Saving…" : "Continue"}
        </ZenPrimaryButton>
      </View>
    </StandardScrollView>
  );
}
