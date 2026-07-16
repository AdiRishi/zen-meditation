import { Stack } from "expo-router";

import { useMeditation } from "@/providers/meditation-provider";

export default function ProgressLayout() {
  const { reducedMotion } = useMeditation();

  return <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? "fade" : "default" }} />;
}
