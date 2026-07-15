import { useRouter } from "expo-router";
import { Alert, View } from "react-native";

import { LandscapeArtwork } from "@/components/ui/moss/brand-assets";
import { MossPrimaryButton, MossSecondaryButton } from "@/components/ui/moss/moss-button";
import { NotificationPreview } from "@/components/ui/moss/notification-preview";
import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";
import { Typography } from "@/components/ui/typography";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useMeditation } from "@/providers/meditation-provider";

export function ReminderPermissionScreen() {
  const router = useRouter();
  const { preferences, saveReminderPreferences } = useMeditation();
  const continueAction = useAsyncAction();

  const finishOnboarding = async (requestPermission: boolean) => {
    const completed = await continueAction.run(async () => {
      const nextPreferences = {
        ...preferences,
        remindersEnabled: requestPermission,
        onboardingStep: "complete" as const,
        onboardingCompleted: true,
      };
      await saveReminderPreferences(nextPreferences, { requestPermission });
      router.replace("/(tabs)/today");
    });
    if (!completed) {
      Alert.alert("Couldn’t finish setup", "Your choices are still here. Please try again.");
    }
  };

  return (
    <StickyFooterScrollView.Root>
      <StickyFooterScrollView.Body contentContainerClassName="justify-between gap-6 pt-12">
        <View className="gap-7">
          <Typography accessibilityRole="header" variant="h1">
            A gentle reminder,{"\n"}when you want one.
          </Typography>
          <NotificationPreview message="Take a breath." />
        </View>
        <LandscapeArtwork height={300} className="-mx-6" fadeTop={72} fadeBottom={80} />
      </StickyFooterScrollView.Body>
      <StickyFooterScrollView.Footer>
        <View className="gap-3">
          <MossPrimaryButton isDisabled={continueAction.isPending} onPress={() => void finishOnboarding(true)}>
            Allow reminders
          </MossPrimaryButton>
          <MossSecondaryButton isDisabled={continueAction.isPending} onPress={() => void finishOnboarding(false)}>
            Not now
          </MossSecondaryButton>
        </View>
      </StickyFooterScrollView.Footer>
    </StickyFooterScrollView.Root>
  );
}
