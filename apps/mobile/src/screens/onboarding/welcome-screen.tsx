import { useRouter } from "expo-router";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";
import { Typography } from "@/components/ui/typography";
import { LandscapeArtwork } from "@/components/ui/zen/brand-assets";
import { ZenPrimaryButton } from "@/components/ui/zen/zen-button";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useMeditation } from "@/providers/meditation-provider";

export function WelcomeScreen() {
  const router = useRouter();
  const { preferences, reducedMotion, savePreferences } = useMeditation();
  const action = useAsyncAction();

  const continueOnboarding = async () => {
    const completed = await action.run(() => savePreferences({ ...preferences, onboardingStep: "goal" }));
    if (completed) {
      router.push("/onboarding/goal");
    }
  };

  return (
    <StickyFooterScrollView.Root>
      <StickyFooterScrollView.Body contentContainerClassName="justify-between gap-8 pt-10">
        <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(450)} className="gap-3 pt-10">
          <Typography accessibilityRole="header" variant="h1">
            Welcome.
          </Typography>
          <Typography variant="reflection" tone="accent">
            A quieter way to{"\n"}keep your practice.
          </Typography>
        </Animated.View>

        <LandscapeArtwork height={296} className="-mx-6" />

        <View className="flex-row justify-center gap-2 pb-2" accessibilityLabel="Onboarding step 1 of 4">
          <View className="size-2 rounded-full bg-accent" />
          <View className="size-2 rounded-full bg-stone" />
          <View className="size-2 rounded-full bg-stone" />
          <View className="size-2 rounded-full bg-stone" />
        </View>
      </StickyFooterScrollView.Body>
      <StickyFooterScrollView.Footer>
        {action.error ? (
          <Typography variant="small" tone="danger" accessibilityLiveRegion="polite" className="pb-3">
            Your choice couldn’t be saved. Please try again.
          </Typography>
        ) : null}
        <ZenPrimaryButton isDisabled={action.isPending} onPress={() => void continueOnboarding()}>
          {action.isPending ? "Saving…" : "Continue"}
        </ZenPrimaryButton>
      </StickyFooterScrollView.Footer>
    </StickyFooterScrollView.Root>
  );
}
