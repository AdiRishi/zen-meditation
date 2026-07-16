import { useRouter } from "expo-router";
import { View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

import { LandscapeArtwork } from "@/components/ui/moss/brand-assets";
import { MossPrimaryButton } from "@/components/ui/moss/moss-button";
import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";
import { Typography } from "@/components/ui/typography";
import { useAsyncAction } from "@/hooks/use-async-action";
import { crossfadeIn, durations, easings, reducedFadeIn } from "@/lib/motion";
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
        <Animated.View
          entering={reducedMotion ? reducedFadeIn : FadeInUp.duration(durations.entranceSlow).easing(easings.enter)}
          className="gap-3 pt-10"
        >
          <Typography accessibilityRole="header" variant="h1">
            Welcome.
          </Typography>
          <Typography variant="reflection" tone="accent">
            A quieter way to{"\n"}keep your practice.
          </Typography>
        </Animated.View>

        <Animated.View
          entering={reducedMotion ? reducedFadeIn : FadeIn.duration(600).delay(120).easing(easings.enter)}
          className="-mx-6"
        >
          <LandscapeArtwork height={296} fadeTop={72} fadeBottom={80} />
        </Animated.View>
      </StickyFooterScrollView.Body>
      <StickyFooterScrollView.Footer>
        <View>
          {action.error ? (
            <Animated.View entering={crossfadeIn} className="pb-3">
              <Typography variant="small" tone="danger" accessibilityLiveRegion="polite">
                Your choice couldn’t be saved. Please try again.
              </Typography>
            </Animated.View>
          ) : null}
          <MossPrimaryButton isDisabled={action.isPending} onPress={() => void continueOnboarding()}>
            {action.isPending ? "Saving…" : "Continue"}
          </MossPrimaryButton>
        </View>
      </StickyFooterScrollView.Footer>
    </StickyFooterScrollView.Root>
  );
}
