import { useKeepAwake } from "expo-keep-awake";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, BackHandler, Pressable, View } from "react-native";

import { BreathingField } from "@/components/screens/meditation/breathing-field";
import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import { CompletionSoundRow, GroupedList } from "@/components/ui/zen/list-row";
import { ZenPrimaryButton, ZenSecondaryButton } from "@/components/ui/zen/zen-button";
import { ZenIcon } from "@/components/ui/zen/zen-icon";
import { formatRemainingTime, projectSession } from "@/domain/session-timer";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useMeditation } from "@/providers/meditation-provider";

export function MeditationScreen() {
  useKeepAwake("meditation-session");
  const router = useRouter();
  const colors = useThemeColors();
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

  return (
    <StandardScrollView contentContainerClassName="min-h-full items-center justify-between gap-4 pb-7 pt-8">
      <Typography accessibilityRole="header" variant="h3" align="center" className="font-serif font-normal">
        {isEnding ? "Session ending" : "Meditation"}
      </Typography>

      <View className="items-center">
        <BreathingField reducedMotion={reducedMotion} ending={isEnding} />
        <Typography variant="display" align="center" tabularNums selectable>
          {formatRemainingTime(projection.remainingMs)}
        </Typography>
        {isEnding ? (
          <View className="items-center gap-2 pt-2">
            <Typography variant="h2" align="center">
              Gently returning.
            </Typography>
            <Typography tone="muted" align="center">
              Carry this calm into your day.
            </Typography>
          </View>
        ) : (
          <Typography tone="muted" align="center">
            {isPaused ? "Paused" : "Time remaining"}
          </Typography>
        )}
      </View>

      <View className="w-full gap-5">
        {!isEnding ? (
          <GroupedList>
            <CompletionSoundRow sound={activeSession.completionSound} />
          </GroupedList>
        ) : null}

        {transitionError || completionError ? (
          <Typography variant="small" tone="danger" accessibilityLiveRegion="polite" align="center">
            Your session is safe. Please try that action again.
          </Typography>
        ) : null}

        {completionError ? (
          <View className="gap-3">
            <ZenPrimaryButton onPress={() => setCompletionError(false)}>Try again</ZenPrimaryButton>
            <ZenSecondaryButton onPress={confirmEnd}>End session</ZenSecondaryButton>
          </View>
        ) : projection.isComplete ? (
          <Typography variant="small" tone="muted" align="center" accessibilityLiveRegion="polite">
            Saving your session…
          </Typography>
        ) : isPaused ? (
          <View className="gap-3">
            <ZenPrimaryButton
              isDisabled={transitionPending}
              onPress={() =>
                void runTransition(async () => {
                  await resumeSession();
                })
              }
            >
              {transitionPending ? "Resuming…" : "Resume"}
            </ZenPrimaryButton>
            <ZenSecondaryButton onPress={confirmEnd}>End session</ZenSecondaryButton>
          </View>
        ) : isEnding ? (
          <ZenSecondaryButton onPress={confirmEnd}>End session</ZenSecondaryButton>
        ) : (
          <Pressable
            accessibilityLabel="Pause session"
            accessibilityRole="button"
            accessibilityState={{ disabled: transitionPending }}
            className="mx-auto size-16 items-center justify-center rounded-full bg-surface"
            disabled={transitionPending}
            style={{ boxShadow: "0 8px 24px rgba(30, 35, 38, 0.08)" }}
            onPress={() =>
              void runTransition(async () => {
                await pauseSession();
              })
            }
          >
            <ZenIcon name="pause" size={22} tintColor={colors.foreground} />
          </Pressable>
        )}
      </View>
    </StandardScrollView>
  );
}
