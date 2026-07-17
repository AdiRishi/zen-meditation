import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { EnsoMark } from "@/components/ui/moss/brand-assets";
import { StandardView } from "@/components/ui/screen-containers/standard-view";
import { Typography } from "@/components/ui/typography";
import { durations, easings } from "@/lib/motion";
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
  const breath = useSharedValue(1);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const timeout = setTimeout(() => setBrandMomentComplete(true), durations.brandMoment);
    return () => clearTimeout(timeout);
  }, [isReady]);

  useEffect(() => {
    if (!isReady || reducedMotion) {
      return;
    }

    breath.set(withTiming(1.02, { duration: durations.brandMoment, easing: easings.ambient }));
  }, [breath, isReady, reducedMotion]);

  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.get() }] }));

  if (!isReady) {
    return null;
  }

  if (!brandMomentComplete) {
    return (
      <StandardView className="flex-1 items-center justify-center bg-background">
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(durations.entranceSlow).easing(easings.enter)}
          exiting={reducedMotion ? undefined : FadeOut.duration(durations.crossfade).easing(easings.exit)}
          className="items-center gap-5"
        >
          <Animated.View style={breathStyle}>
            <EnsoMark size={126} />
          </Animated.View>
          <Typography variant="display" align="center">
            Moss
          </Typography>
          <Typography variant="reflection" tone="accent" align="center">
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
