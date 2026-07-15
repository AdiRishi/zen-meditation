import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Pressable, View } from "react-native";

import { MossPrimaryButton } from "@/components/ui/moss/moss-button";
import { SessionRing } from "@/components/ui/moss/session-ring";
import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";
import { Typography } from "@/components/ui/typography";
import { formatLocalDateLabel, formatWallClockTime } from "@/domain/date-time";
import { type Feeling } from "@/domain/meditation";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useCompletionSounds } from "@/hooks/use-completion-sounds";
import { impactHaptic } from "@/lib/haptics";
import { useMeditation } from "@/providers/meditation-provider";

const FEELINGS: readonly { id: Feeling; label: string }[] = [
  { id: "calm", label: "Calm" },
  { id: "clear", label: "Clear" },
  { id: "grounded", label: "Grounded" },
  { id: "other", label: "Other" },
];

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

  const durationMinutes = Math.round(session.durationMs / 60_000);
  const dateLabel = formatLocalDateLabel(session.localDate, nowMs);

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
          <SessionRing size={136} strokeWidth={2.5} progress={1} animated={!reducedMotion} drawDurationMs={1400}>
            <View
              accessible
              accessibilityLabel={`You sat for ${durationMinutes} ${durationMinutes === 1 ? "minute" : "minutes"}`}
              className="items-center"
            >
              <Typography variant="h1" align="center" tabularNums>
                {durationMinutes}
              </Typography>
              <Typography variant="caption" tone="muted" align="center">
                min
              </Typography>
            </View>
          </SessionRing>
          <View className="items-center gap-2">
            <Typography accessibilityRole="header" variant="h2" align="center">
              Session complete.
            </Typography>
            <Typography tone="muted" align="center" selectable>
              {dateLabel}, {formatWallClockTime(session.completedAtMs, session.timezoneOffsetMinutes)}
            </Typography>
          </View>

          <View className="items-center gap-5">
            <Typography variant="h3" tone="muted" align="center">
              How do you feel?
            </Typography>
            <View accessibilityRole="radiogroup" className="flex-row flex-wrap justify-center gap-2">
              {FEELINGS.map((feeling) => {
                const isSelected = session.feeling === feeling.id;
                return (
                  <Pressable
                    key={feeling.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected, disabled: action.isPending }}
                    className={`min-h-11 justify-center rounded-full border px-5 ${
                      isSelected ? "border-accent bg-accent-soft" : "border-stone"
                    }`}
                    disabled={action.isPending}
                    onPress={() => {
                      void action.run(async () => {
                        await setSessionFeeling(session.id, feeling.id);
                      });
                    }}
                  >
                    <Typography variant="small">{feeling.label}</Typography>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </StickyFooterScrollView.Body>
      <StickyFooterScrollView.Footer>
        {action.error ? (
          <Typography variant="small" tone="danger" accessibilityLiveRegion="polite" align="center" className="pb-3">
            That change couldn’t be saved. Please try again.
          </Typography>
        ) : null}
        <MossPrimaryButton isDisabled={action.isPending} onPress={() => void done()}>
          {action.isPending ? "Saving…" : "Done"}
        </MossPrimaryButton>
      </StickyFooterScrollView.Footer>
    </StickyFooterScrollView.Root>
  );
}
