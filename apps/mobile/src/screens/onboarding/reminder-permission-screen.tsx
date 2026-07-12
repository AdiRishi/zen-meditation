import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import { LandscapeArtwork } from "@/components/ui/zen/brand-assets";
import { NotificationPreview } from "@/components/ui/zen/notification-preview";
import { ZenPrimaryButton, ZenSecondaryButton } from "@/components/ui/zen/zen-button";
import { useMeditation } from "@/providers/meditation-provider";

export function ReminderPermissionScreen() {
  const router = useRouter();
  const { preferences, requestReminderPermission, rescheduleReminders, savePreferences } = useMeditation();
  const [isContinuing, setIsContinuing] = useState(false);

  const finishOnboarding = async (requestPermission: boolean) => {
    setIsContinuing(true);
    try {
      const permission = requestPermission
        ? await requestReminderPermission().catch(() => "denied" as const)
        : "denied";
      let nextPreferences = {
        ...preferences,
        remindersEnabled: requestPermission && permission === "granted",
        onboardingStep: "complete" as const,
        onboardingCompleted: true,
      };
      await savePreferences(nextPreferences);
      try {
        await rescheduleReminders(nextPreferences);
      } catch {
        if (nextPreferences.remindersEnabled) {
          nextPreferences = { ...nextPreferences, remindersEnabled: false };
          await savePreferences(nextPreferences);
        }
      }
      router.replace("/(tabs)/today");
    } catch {
      setIsContinuing(false);
      Alert.alert("Couldn’t finish setup", "Your choices are still here. Please try again.");
    }
  };

  return (
    <StandardScrollView contentContainerClassName="min-h-full justify-between gap-6 pb-6 pt-12">
      <View className="gap-7">
        <Typography accessibilityRole="header" variant="h1">
          A gentle reminder,{"\n"}when you want one.
        </Typography>
        <NotificationPreview message="Take a breath." />
      </View>
      <LandscapeArtwork height={300} className="-mx-6" />
      <View className="gap-3">
        <ZenPrimaryButton isDisabled={isContinuing} onPress={() => void finishOnboarding(true)}>
          Allow reminders
        </ZenPrimaryButton>
        <ZenSecondaryButton isDisabled={isContinuing} onPress={() => void finishOnboarding(false)}>
          Not now
        </ZenSecondaryButton>
      </View>
    </StandardScrollView>
  );
}
