import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { TimePickerSheet } from "@/components/screens/onboarding/time-picker-sheet";
import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import { GroupedList, PracticeTimeRow } from "@/components/ui/zen/list-row";
import { ScreenHeader } from "@/components/ui/zen/screen-header";
import { ZenPrimaryButton, ZenSecondaryButton } from "@/components/ui/zen/zen-button";
import type { PracticeTime } from "@/domain/meditation";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useMeditation } from "@/providers/meditation-provider";

export function OnboardingScheduleScreen() {
  const router = useRouter();
  const { preferences, savePreferences } = useMeditation();
  const [practiceTimes, setPracticeTimes] = useState(preferences.practiceTimes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const action = useAsyncAction();
  const editingTime = practiceTimes.find((time) => time.id === editingId) ?? null;

  const updateTime = (updated: PracticeTime) => {
    setPracticeTimes((times) => times.map((time) => (time.id === updated.id ? updated : time)));
  };

  const continueOnboarding = async (nextPracticeTimes = practiceTimes) => {
    const completed = await action.run(() =>
      savePreferences({ ...preferences, practiceTimes: nextPracticeTimes, onboardingStep: "reminders" }),
    );
    if (completed) {
      router.push("/onboarding/reminders");
    }
  };

  return (
    <>
      <StandardScrollView contentContainerClassName="min-h-full justify-between gap-8 pb-6">
        <View className="gap-8">
          <ScreenHeader onBack={() => router.back()} />
          <Typography accessibilityRole="header" variant="h1">
            When would you{"\n"}like to practise?
          </Typography>
          <GroupedList>
            {practiceTimes.map((time) => (
              <PracticeTimeRow key={time.id} time={time} onPress={() => setEditingId(time.id)} />
            ))}
          </GroupedList>
          <Typography tone="muted">
            These times are gentle intentions. You can change or turn them off whenever you like.
          </Typography>
        </View>
        <View className="gap-3">
          {action.error ? (
            <Typography variant="small" tone="danger" accessibilityLiveRegion="polite">
              Your practice times couldn’t be saved. Please try again.
            </Typography>
          ) : null}
          <ZenPrimaryButton isDisabled={action.isPending} onPress={() => void continueOnboarding()}>
            {action.isPending ? "Saving…" : "Continue"}
          </ZenPrimaryButton>
          <ZenSecondaryButton
            isDisabled={action.isPending}
            onPress={() => {
              const flexibleTimes = practiceTimes.map((time) => ({ ...time, enabled: false }));
              setPracticeTimes(flexibleTimes);
              void continueOnboarding(flexibleTimes);
            }}
          >
            Keep times flexible
          </ZenSecondaryButton>
        </View>
      </StandardScrollView>
      {editingTime ? (
        <TimePickerSheet practiceTime={editingTime} onChange={updateTime} onClose={() => setEditingId(null)} />
      ) : null}
    </>
  );
}
