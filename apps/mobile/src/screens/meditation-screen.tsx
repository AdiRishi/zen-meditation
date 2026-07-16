import { useKeepAwake } from "expo-keep-awake";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, BackHandler, Pressable, useWindowDimensions, View } from "react-native";

import { MossPrimaryButton, MossSecondaryButton } from "@/components/ui/moss/moss-button";
import { completionSoundIcon, MossIcon } from "@/components/ui/moss/moss-icon";
import { SessionRing } from "@/components/ui/moss/session-ring";
import { BreathingField } from "@/components/ui/moss/shaders/breathing-field";
import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";
import { Typography } from "@/components/ui/typography";
import { getCompletionSoundLabel } from "@/domain/meditation";
import { formatRemainingTime, projectSession } from "@/domain/session-timer";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useThemeColors } from "@/hooks/use-theme-colors";
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
            drawDurationMs={900}
          >
            <BreathingField reducedMotion={reducedMotion} ending={isEnding} size={ringSize - 44} />
          </SessionRing>
          <View className="items-center gap-1">
            <Typography accessibilityRole="header" variant="timer" align="center" tabularNums selectable>
              {formatRemainingTime(projection.remainingMs)}
            </Typography>
            {isEnding ? (
              <View className="items-center gap-1">
                <Typography variant="reflection" tone="muted" align="center">
                  Gently returning.
                </Typography>
                <Typography variant="small" tone="muted" align="center">
                  Carry this calm into your day.
                </Typography>
              </View>
            ) : (
              <Typography tone="muted" align="center">
                {isPaused ? "Paused" : "Time remaining"}
              </Typography>
            )}
          </View>
        </View>
      </StickyFooterScrollView.Body>

      <StickyFooterScrollView.Footer className="gap-6 bg-transparent">
        {!isEnding ? (
          <View className="flex-row items-center justify-center gap-2">
            <MossIcon name={completionSoundIcon(activeSession.completionSound)} size={15} tintColor={colors.muted} />
            <Typography variant="small" tone="muted">
              Ends with {getCompletionSoundLabel(activeSession.completionSound)}
            </Typography>
          </View>
        ) : null}

        {transitionError || completionError ? (
          <Typography variant="small" tone="danger" accessibilityLiveRegion="polite" align="center">
            Your session is safe. Please try that action again.
          </Typography>
        ) : null}

        {completionError ? (
          <View className="gap-3">
            <MossPrimaryButton onPress={() => setCompletionError(false)}>Try again</MossPrimaryButton>
            <MossSecondaryButton onPress={confirmEnd}>End session</MossSecondaryButton>
          </View>
        ) : projection.isComplete ? (
          <Typography variant="small" tone="muted" align="center" accessibilityLiveRegion="polite">
            Saving your session…
          </Typography>
        ) : isPaused ? (
          <View className="gap-3">
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
          </View>
        ) : isEnding ? (
          <MossSecondaryButton onPress={confirmEnd}>End session</MossSecondaryButton>
        ) : (
          <Pressable
            accessibilityLabel="Pause session"
            accessibilityRole="button"
            accessibilityState={{ disabled: transitionPending }}
            className="mx-auto size-16 items-center justify-center rounded-full border border-border bg-surface"
            disabled={transitionPending}
            onPress={() =>
              void runTransition(async () => {
                await pauseSession();
              })
            }
          >
            <MossIcon name="pause" size={22} tintColor={colors.foreground} />
          </Pressable>
        )}
      </StickyFooterScrollView.Footer>
    </StickyFooterScrollView.Root>
  );
}
