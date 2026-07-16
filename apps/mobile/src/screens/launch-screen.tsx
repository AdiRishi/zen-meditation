import { Redirect } from "expo-router";

import { useMeditation } from "@/providers/meditation-provider";

const ONBOARDING_ROUTES = {
  welcome: "/onboarding/welcome",
  goal: "/onboarding/goal",
  schedule: "/onboarding/schedule",
  reminders: "/onboarding/reminders",
  complete: "/(tabs)/today",
} as const;

export function LaunchScreen() {
  const { activeSession, isReady, pendingCompletion, preferences } = useMeditation();

  if (!isReady) {
    return null;
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
