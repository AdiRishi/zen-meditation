import { Stack } from "expo-router";

import { useMeditation } from "@/providers/meditation-provider";

export default function OnboardingLayout() {
  const { reducedMotion } = useMeditation();

  return <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? "none" : "fade_from_bottom" }} />;
}
