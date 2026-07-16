import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, View } from "react-native";
import Animated, { FadeInUp, runOnJS, useAnimatedReaction, useSharedValue, withTiming } from "react-native-reanimated";

import { MossPrimaryButton } from "@/components/ui/moss/moss-button";
import { MossPressable } from "@/components/ui/moss/moss-pressable";
import { SessionRing } from "@/components/ui/moss/session-ring";
import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";
import { Typography } from "@/components/ui/typography";
import { formatLocalDateLabel, formatWallClockTime } from "@/domain/date-time";
import { type Feeling } from "@/domain/meditation";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useCompletionSounds } from "@/hooks/use-completion-sounds";
import { useSelectionTransition } from "@/hooks/use-selection-transition";
import { impactHaptic } from "@/lib/haptics";
import { crossfadeIn, durations, easings, reducedFadeIn } from "@/lib/motion";
import { useMeditation } from "@/providers/meditation-provider";

const FEELINGS: readonly { id: Feeling; label: string }[] = [
  { id: "calm", label: "Calm" },
  { id: "clear", label: "Clear" },
  { id: "grounded", label: "Grounded" },
  { id: "other", label: "Other" },
];

function FeelingChip({
  label,
  isSelected,
  disabled,
  onSelect,
}: {
  label: string;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const { fillStyle } = useSelectionTransition(isSelected);

  return (
    <MossPressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected, disabled }}
      feedback="scale"
      pressedScale={0.96}
      className="min-h-11 justify-center rounded-full border border-stone px-5"
      disabled={disabled}
      onPress={onSelect}
    >
      <Animated.View
        pointerEvents="none"
        style={fillStyle}
        className="absolute inset-0 rounded-full border border-accent bg-accent-soft"
      />
      <Typography variant="small">{label}</Typography>
    </MossPressable>
  );
}

export function SessionCompleteScreen() {
  const router = useRouter();
  const { id, playSound } = useLocalSearchParams<{ id?: string; playSound?: string }>();
  const { acknowledgeSession, completedSessions, pendingCompletion, reducedMotion, setSessionFeeling } =
    useMeditation();
  const completionSoundStarted = useRef(false);
  const { play, stop } = useCompletionSounds();
  const action = useAsyncAction();
  const session = completedSessions.find((item) => item.id === id) ?? pendingCompletion;
  const [nowMs] = useState(() => Date.now());
  const sessionId = session?.id;
  const sessionCompletionSound = session?.completionSound;
  const durationMinutes = session ? Math.round(session.durationMs / 60_000) : 0;

  // The minutes are earned, not printed: count up over the same exhale the
  // ring draws on, landing together.
  const [displayMinutes, setDisplayMinutes] = useState(() => (reducedMotion ? durationMinutes : 0));
  const countedMinutes = useSharedValue(reducedMotion ? durationMinutes : 0);

  useEffect(() => {
    if (reducedMotion) {
      // The reaction below carries the final value into displayMinutes.
      countedMinutes.set(durationMinutes);
      return;
    }
    countedMinutes.set(withTiming(durationMinutes, { duration: durations.halfBreath, easing: easings.draw }));
  }, [countedMinutes, durationMinutes, reducedMotion]);

  useAnimatedReaction(
    () => Math.round(countedMinutes.get()),
    (value, previous) => {
      if (value !== previous) {
        runOnJS(setDisplayMinutes)(value);
      }
    },
    [],
  );

  useEffect(() => {
    if (!sessionId || !sessionCompletionSound || playSound !== "1" || completionSoundStarted.current) {
      return;
    }
    completionSoundStarted.current = true;
    impactHaptic();
    void play(sessionCompletionSound).catch(() => undefined);
  }, [play, playSound, sessionCompletionSound, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, [sessionId]);

  if (!session) {
    return <Redirect href="/(tabs)/today" />;
  }

  const dateLabel = formatLocalDateLabel(session.localDate, nowMs);

  const enter = (delayMs: number) =>
    reducedMotion
      ? reducedFadeIn
      : FadeInUp.duration(durations.completionEntrance).delay(delayMs).easing(easings.enter);

  const done = async () => {
    const completed = await action.run(async () => {
      await stop();
      await acknowledgeSession(session.id);
    });
    if (completed) {
      router.replace("/(tabs)/today");
    }
  };

  return (
    <StickyFooterScrollView.Root>
      <StickyFooterScrollView.Body contentContainerClassName="pt-16">
        <View className="items-center gap-12">
          <Animated.View entering={crossfadeIn}>
            <SessionRing
              size={136}
              strokeWidth={2.5}
              progress={1}
              animated={!reducedMotion}
              drawDurationMs={durations.halfBreath}
            >
              <View
                accessible
                accessibilityLabel={`You sat for ${durationMinutes} ${durationMinutes === 1 ? "minute" : "minutes"}`}
                className="items-center"
              >
                <Typography variant="h1" align="center" tabularNums>
                  {displayMinutes}
                </Typography>
                <Typography variant="caption" tone="muted" align="center">
                  min
                </Typography>
              </View>
            </SessionRing>
          </Animated.View>
          <Animated.View entering={enter(100)} className="items-center gap-2">
            <Typography accessibilityRole="header" variant="h2" align="center">
              Session complete.
            </Typography>
            <Typography tone="muted" align="center" selectable>
              {dateLabel}, {formatWallClockTime(session.completedAtMs, session.timezoneOffsetMinutes)}
            </Typography>
          </Animated.View>

          <Animated.View entering={enter(180)} className="items-center gap-5">
            <Typography variant="h3" tone="muted" align="center">
              How do you feel?
            </Typography>
            <View accessibilityRole="radiogroup" className="flex-row flex-wrap justify-center gap-2">
              {FEELINGS.map((feeling) => (
                <FeelingChip
                  key={feeling.id}
                  label={feeling.label}
                  isSelected={session.feeling === feeling.id}
                  disabled={action.isPending}
                  onSelect={() => {
                    impactHaptic();
                    void action.run(async () => {
                      await setSessionFeeling(session.id, feeling.id);
                    });
                  }}
                />
              ))}
            </View>
          </Animated.View>
        </View>
      </StickyFooterScrollView.Body>
      <StickyFooterScrollView.Footer>
        {action.error ? (
          <Animated.View entering={crossfadeIn} className="pb-3">
            <Typography variant="small" tone="danger" accessibilityLiveRegion="polite" align="center">
              That change couldn’t be saved. Please try again.
            </Typography>
          </Animated.View>
        ) : null}
        <MossPrimaryButton isDisabled={action.isPending} onPress={() => void done()}>
          {action.isPending ? "Saving…" : "Done"}
        </MossPrimaryButton>
      </StickyFooterScrollView.Footer>
    </StickyFooterScrollView.Root>
  );
}
