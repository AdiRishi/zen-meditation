import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { StandardView } from "@/components/ui/screen-containers/standard-view";
import { Typography } from "@/components/ui/typography";
import { EnsoMark } from "@/components/ui/zen/brand-assets";
import { useMeditation } from "@/providers/meditation-provider";

const ONBOARDING_ROUTES = {
  welcome: "/onboarding/welcome",
  goal: "/onboarding/goal",
  schedule: "/onboarding/schedule",
  reminders: "/onboarding/reminders",
  complete: "/(tabs)/today",
} as const;

export function LaunchScreen() {
  const { activeSession, isReady, pendingCompletion, preferences, reducedMotion } = useMeditation();
  const [brandMomentComplete, setBrandMomentComplete] = useState(false);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    const timeout = setTimeout(() => setBrandMomentComplete(true), 1_100);
    return () => clearTimeout(timeout);
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  if (!brandMomentComplete) {
    return (
      <StandardView className="flex-1 items-center justify-center bg-background">
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(450)}
          exiting={reducedMotion ? undefined : FadeOut.duration(240)}
          className="items-center gap-5"
        >
          <EnsoMark size={126} />
          <Typography variant="display" align="center" className="text-[42px] tracking-[12px]">
            ZEN
          </Typography>
          <Typography tone="accent" align="center">
            A quiet rhythm{"\n"}for daily practice.
          </Typography>
        </Animated.View>
      </StandardView>
    );
  }

  if (pendingCompletion) {
    return <Redirect href={{ pathname: "/session-complete", params: { id: pendingCompletion.id } }} />;
  }

  if (activeSession) {
    return <Redirect href="/meditation" />;
  }

  if (!preferences.onboardingCompleted) {
    return <Redirect href={ONBOARDING_ROUTES[preferences.onboardingStep]} />;
  }

  return <Redirect href="/(tabs)/today" />;
}
