import { useKeepAwake } from "expo-keep-awake";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, BackHandler, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { MossPrimaryButton, MossSecondaryButton } from "@/components/ui/moss/moss-button";
import { completionSoundIcon, MossIcon } from "@/components/ui/moss/moss-icon";
import { MossPressable } from "@/components/ui/moss/moss-pressable";
import { SessionRing } from "@/components/ui/moss/session-ring";
import { BreathingField } from "@/components/ui/moss/shaders/breathing-field";
import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";
import { Typography } from "@/components/ui/typography";
import { getCompletionSoundLabel } from "@/domain/meditation";
import { formatRemainingTime, projectSession } from "@/domain/session-timer";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { announce } from "@/lib/announce";
import { crossfadeIn, crossfadeOut, durations, easings } from "@/lib/motion";
import { useMeditation } from "@/providers/meditation-provider";

export function MeditationScreen() {
  useKeepAwake("meditation-session");
  const router = useRouter();
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const {
    abandonSession,
    activeSession,
    completeSession,
    notificationPermission,
    pauseSession,
    pendingCompletion,
    reducedMotion,
    resumeSession,
  } = useMeditation();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [completionError, setCompletionError] = useState(false);
  const [observedSessionId] = useState(activeSession?.id);
  const [mayHaveCompletedInBackground, setMayHaveCompletedInBackground] = useState(AppState.currentState !== "active");
  const completionStarted = useRef(false);
  const { error: transitionError, isPending: transitionPending, run: runTransition } = useAsyncAction();

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        setMayHaveCompletedInBackground(true);
        return;
      }

      if (activeSession && !projectSession(activeSession, Date.now()).isComplete) {
        setMayHaveCompletedInBackground(false);
      }
    });
    return () => subscription.remove();
  }, [activeSession]);

  const projection = activeSession ? projectSession(activeSession, nowMs) : null;
  const shouldPlayCompletionSound = notificationPermission !== "granted" || !mayHaveCompletedInBackground;

  const confirmEnd = useCallback(() => {
    Alert.alert("End this session?", "An early ending will not be added to your progress.", [
      { text: "Keep sitting", style: "cancel" },
      {
        text: "End session",
        style: "destructive",
        onPress: () => {
          void runTransition(async () => {
            await abandonSession();
            router.replace("/(tabs)/today");
          });
        },
      },
    ]);
  }, [abandonSession, router, runTransition]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      confirmEnd();
      return true;
    });
    return () => subscription.remove();
  }, [activeSession, confirmEnd]);

  // The wind-down and the save are conveyed visually (dim, crossfades); give
  // screen-reader users the same cues once, politely.
  const phase = projection?.phase;
  useEffect(() => {
    if (phase === "ending") {
      announce("Gently returning. Carry this calm into your day.");
    } else if (phase === "complete") {
      announce("Saving your session.");
    }
  }, [phase]);

  useEffect(() => {
    if (!activeSession || !projection?.isComplete || completionStarted.current || completionError) {
      return;
    }
    completionStarted.current = true;
    void (async () => {
      try {
        const completed = await completeSession();
        const sessionId = completed?.id ?? pendingCompletion?.id ?? observedSessionId;
        router.replace({
          pathname: "/session-complete",
          params: sessionId ? { id: sessionId, ...(shouldPlayCompletionSound ? { playSound: "1" } : {}) } : {},
        });
      } catch {
        completionStarted.current = false;
        setCompletionError(true);
      }
    })();
  }, [
    activeSession,
    completeSession,
    completionError,
    pendingCompletion?.id,
    projection?.isComplete,
    router,
    shouldPlayCompletionSound,
    observedSessionId,
  ]);

  if (!activeSession || !projection) {
    if (pendingCompletion) {
      const playSound = pendingCompletion.id === observedSessionId && shouldPlayCompletionSound ? "1" : undefined;
      return (
        <Redirect
          href={{
            pathname: "/session-complete",
            params: { id: pendingCompletion.id, ...(playSound ? { playSound } : {}) },
          }}
        />
      );
    }
    return <Redirect href="/(tabs)/today" />;
  }

  const isPaused = activeSession.status === "paused";
  const isEnding = projection.phase !== "active";
  const ringSize = Math.min(354, width - 48);
  const sessionProgress = projection.elapsedMs / activeSession.plannedDurationMs;

  return (
    <StickyFooterScrollView.Root>
      <StickyFooterScrollView.Body contentContainerClassName="items-center justify-center gap-6 py-8">
        <View className="items-center gap-8">
          <SessionRing
            size={ringSize}
            strokeWidth={2.5}
            progress={sessionProgress}
            animated={!reducedMotion}
            live
            drawDurationMs={durations.settle}
          >
            <BreathingField reducedMotion={reducedMotion} ending={isEnding} paused={isPaused} size={ringSize - 44} />
          </SessionRing>
          <View className="items-center gap-1">
            <Typography accessibilityRole="header" variant="timer" align="center" tabularNums selectable>
              {formatRemainingTime(projection.remainingMs)}
            </Typography>
            {/* Fixed-height slot so caption states crossfade in place instead
                of nudging the timer when the two-line reflection arrives.
                self-stretch (not w-full): a percentage width collapses to zero
                inside this content-sized, items-center parent. */}
            <View className="h-16 self-stretch">
              {isEnding ? (
                <Animated.View
                  key="ending"
                  entering={FadeIn.duration(600).delay(250).easing(easings.enter)}
                  exiting={crossfadeOut}
                  accessibilityLiveRegion="polite"
                  className="absolute inset-x-0 top-0 items-center gap-1"
                >
                  <Typography variant="reflection" tone="muted" align="center">
                    Gently returning.
                  </Typography>
                  <Typography variant="small" tone="muted" align="center">
                    Carry this calm into your day.
                  </Typography>
                </Animated.View>
              ) : (
                <Animated.View
                  key={isPaused ? "paused" : "counting"}
                  entering={crossfadeIn}
                  exiting={crossfadeOut}
                  className="absolute inset-x-0 top-0 items-center"
                >
                  <Typography tone="muted" align="center">
                    {isPaused ? "Paused" : "Time remaining"}
                  </Typography>
                </Animated.View>
              )}
            </View>
          </View>
        </View>
      </StickyFooterScrollView.Body>

      <StickyFooterScrollView.Footer className="gap-6 bg-transparent">
        {!isEnding ? (
          <Animated.View exiting={crossfadeOut} className="flex-row items-center justify-center gap-2">
            <MossIcon name={completionSoundIcon(activeSession.completionSound)} size={15} tintColor={colors.muted} />
            <Typography variant="small" tone="muted">
              Ends with {getCompletionSoundLabel(activeSession.completionSound)}
            </Typography>
          </Animated.View>
        ) : null}

        {transitionError || completionError ? (
          <Animated.View entering={crossfadeIn}>
            <Typography variant="small" tone="danger" accessibilityLiveRegion="polite" align="center">
              Your session is safe. Please try that action again.
            </Typography>
          </Animated.View>
        ) : null}

        {/* A fixed-height stage sized to the tallest state (two stacked
            buttons), so controls crossfade in place and nothing below the
            ring ever jumps mid-session. */}
        <View className="h-[124px] justify-end">
          {completionError ? (
            <Animated.View
              key="completion-error"
              entering={crossfadeIn}
              exiting={crossfadeOut}
              className="absolute inset-x-0 bottom-0 gap-3"
            >
              <MossPrimaryButton onPress={() => setCompletionError(false)}>Try again</MossPrimaryButton>
              <MossSecondaryButton onPress={confirmEnd}>End session</MossSecondaryButton>
            </Animated.View>
          ) : projection.isComplete ? (
            <Animated.View
              key="saving"
              entering={crossfadeIn}
              exiting={crossfadeOut}
              className="absolute inset-x-0 bottom-0 min-h-14 justify-center"
            >
              <Typography variant="small" tone="muted" align="center" accessibilityLiveRegion="polite">
                Saving your session…
              </Typography>
            </Animated.View>
          ) : isPaused ? (
            <Animated.View
              key="paused"
              entering={crossfadeIn}
              exiting={crossfadeOut}
              className="absolute inset-x-0 bottom-0 gap-3"
            >
              <MossPrimaryButton
                isDisabled={transitionPending}
                onPress={() =>
                  void runTransition(async () => {
                    await resumeSession();
                  })
                }
              >
                {transitionPending ? "Resuming…" : "Resume"}
              </MossPrimaryButton>
              <MossSecondaryButton onPress={confirmEnd}>End session</MossSecondaryButton>
            </Animated.View>
          ) : isEnding ? (
            <Animated.View
              key="ending"
              entering={crossfadeIn}
              exiting={crossfadeOut}
              className="absolute inset-x-0 bottom-0"
            >
              <MossSecondaryButton onPress={confirmEnd}>End session</MossSecondaryButton>
            </Animated.View>
          ) : (
            <Animated.View
              key="sitting"
              entering={crossfadeIn}
              exiting={crossfadeOut}
              className="absolute inset-x-0 bottom-0 items-center"
            >
              <MossPressable
                accessibilityLabel="Pause session"
                accessibilityRole="button"
                accessibilityState={{ disabled: transitionPending }}
                feedback="scale"
                pressedScale={0.96}
                className="size-16 items-center justify-center rounded-full border border-border bg-surface"
                disabled={transitionPending}
                onPress={() =>
                  void runTransition(async () => {
                    await pauseSession();
                  })
                }
              >
                <MossIcon name="pause" size={22} tintColor={colors.foreground} />
              </MossPressable>
            </Animated.View>
          )}
        </View>
      </StickyFooterScrollView.Footer>
    </StickyFooterScrollView.Root>
  );
}
