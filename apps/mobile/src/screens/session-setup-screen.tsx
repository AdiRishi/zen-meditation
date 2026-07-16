import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import Animated from "react-native-reanimated";

import { DurationSelector } from "@/components/ui/moss/duration-selector";
import { CompletionSoundRow, GroupedList } from "@/components/ui/moss/list-row";
import { MossPrimaryButton } from "@/components/ui/moss/moss-button";
import { ScreenHeader } from "@/components/ui/moss/screen-header";
import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";
import { Typography } from "@/components/ui/typography";
import type { SessionDuration } from "@/domain/meditation";
import { useAsyncAction } from "@/hooks/use-async-action";
import { impactHaptic } from "@/lib/haptics";
import { crossfadeIn } from "@/lib/motion";
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
    <StickyFooterScrollView.Root>
      <StickyFooterScrollView.Body contentContainerClassName="gap-9">
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
            Keep Moss open for precise timing and to hear the completion sound.
          </Typography>
        )}
      </StickyFooterScrollView.Body>
      <StickyFooterScrollView.Footer>
        {action.error ? (
          <Animated.View entering={crossfadeIn} className="pb-3">
            <Typography variant="small" tone="danger" accessibilityLiveRegion="polite">
              Your session couldn’t begin. Please try again.
            </Typography>
          </Animated.View>
        ) : null}
        <MossPrimaryButton isDisabled={action.isPending} onPress={() => void begin()}>
          {action.isPending ? "Starting…" : "Begin"}
        </MossPrimaryButton>
      </StickyFooterScrollView.Footer>
    </StickyFooterScrollView.Root>
  );
}
