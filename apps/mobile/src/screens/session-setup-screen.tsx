import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import { DurationSelector } from "@/components/ui/zen/duration-selector";
import { CompletionSoundRow, GroupedList } from "@/components/ui/zen/list-row";
import { ScreenHeader } from "@/components/ui/zen/screen-header";
import { ZenPrimaryButton } from "@/components/ui/zen/zen-button";
import type { SessionDuration } from "@/domain/meditation";
import { useAsyncAction } from "@/hooks/use-async-action";
import { impactHaptic } from "@/lib/haptics";
import { useMeditation } from "@/providers/meditation-provider";

export function SessionSetupScreen() {
  const router = useRouter();
  const { activeSession, notificationPermission, pendingCompletion, preferences, startSession } = useMeditation();
  const [duration, setDuration] = useState<SessionDuration>(preferences.lastDurationMinutes);
  const action = useAsyncAction();

  if (pendingCompletion) {
    return <Redirect href={{ pathname: "/session-complete", params: { id: pendingCompletion.id } }} />;
  }
  if (activeSession) {
    return <Redirect href="/meditation" />;
  }

  const begin = async () => {
    const started = await action.run(async () => {
      impactHaptic();
      await startSession(duration, preferences.completionSound);
    });
    if (started) {
      router.replace("/meditation");
    }
  };

  return (
    <StandardScrollView contentContainerClassName="min-h-full justify-between gap-8 pb-6">
      <View className="gap-9">
        <ScreenHeader />
        <Typography accessibilityRole="header" variant="h1">
          How long would{"\n"}you like to sit?
        </Typography>
        <DurationSelector value={duration} onChange={setDuration} />
        <GroupedList>
          <CompletionSoundRow
            sound={preferences.completionSound}
            onPress={() => router.push({ pathname: "/completion-sound", params: { source: "session-setup" } })}
          />
        </GroupedList>
        {notificationPermission === "granted" && process.env.EXPO_OS !== "android" ? null : (
          <Typography variant="small" tone="muted">
            Keep Zen open for precise timing and to hear the completion sound.
          </Typography>
        )}
      </View>
      <View className="gap-3">
        {action.error ? (
          <Typography variant="small" tone="danger" accessibilityLiveRegion="polite">
            Your session couldn’t begin. Please try again.
          </Typography>
        ) : null}
        <ZenPrimaryButton isDisabled={action.isPending} onPress={() => void begin()}>
          {action.isPending ? "Starting…" : "Begin"}
        </ZenPrimaryButton>
      </View>
    </StandardScrollView>
  );
}
