import { useRouter } from "expo-router";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { MossPrimaryButton } from "@/components/ui/moss/moss-button";
import { MossCard } from "@/components/ui/moss/moss-card";
import { completionSoundIcon, MossIcon } from "@/components/ui/moss/moss-icon";
import { MossPressable } from "@/components/ui/moss/moss-pressable";
import { ScreenHeader } from "@/components/ui/moss/screen-header";
import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";
import { Typography } from "@/components/ui/typography";
import { COMPLETION_SOUNDS, type CompletionSound } from "@/domain/meditation";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useCompletionSounds } from "@/hooks/use-completion-sounds";
import { useSelectionTransition } from "@/hooks/use-selection-transition";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { crossfadeIn, crossfadeOut } from "@/lib/motion";
import { useMeditation } from "@/providers/meditation-provider";

function CompletionSoundOption({
  sound,
  isSelected,
  isPlaying,
  disabled,
  onSelect,
  onTogglePreview,
}: {
  sound: (typeof COMPLETION_SOUNDS)[number];
  isSelected: boolean;
  isPlaying: boolean;
  disabled: boolean;
  onSelect(): void;
  onTogglePreview(): void;
}) {
  const colors = useThemeColors();
  const { indicatorStyle } = useSelectionTransition(isSelected);

  return (
    <MossCard className="min-h-20 flex-row items-center px-4 py-3">
      <MossPressable
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected, disabled }}
        accessibilityLabel={sound.label}
        feedback="highlight"
        className="min-h-14 flex-1 flex-row items-center gap-4"
        disabled={disabled}
        onPress={onSelect}
      >
        <View className="w-8 items-center justify-center">
          <MossIcon name={completionSoundIcon(sound.id)} size={23} tintColor={colors.muted} />
        </View>
        <Typography className="flex-1">{sound.label}</Typography>
        <Animated.View pointerEvents="none" style={indicatorStyle}>
          <View className="size-8 items-center justify-center rounded-full bg-accent">
            <MossIcon name="check" size={16} tintColor={colors.accentForeground} />
          </View>
        </Animated.View>
      </MossPressable>
      <MossPressable
        accessibilityLabel={`${isPlaying ? "Stop" : "Preview"} ${sound.label}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        feedback="scale"
        pressedScale={0.96}
        className="ml-3 size-11 items-center justify-center rounded-full border border-stone"
        disabled={disabled}
        onPress={onTogglePreview}
      >
        <View className="size-4 items-center justify-center">
          <Animated.View
            key={isPlaying ? "pause" : "play"}
            entering={crossfadeIn}
            exiting={crossfadeOut}
            className="absolute"
          >
            <MossIcon name={isPlaying ? "pause" : "play"} size={16} tintColor={colors.foreground} />
          </Animated.View>
        </View>
      </MossPressable>
    </MossCard>
  );
}

export function CompletionSoundScreen() {
  const router = useRouter();
  const { preferences, savePreferences } = useMeditation();
  const { play, playingSound, stop } = useCompletionSounds();
  const action = useAsyncAction();
  const selected = preferences.completionSound;

  const select = (sound: CompletionSound) =>
    action.run(() => savePreferences({ ...preferences, completionSound: sound }));

  const done = async () => {
    if (await action.run(stop)) {
      router.back();
    }
  };

  return (
    <StickyFooterScrollView.Root>
      <StickyFooterScrollView.Body contentContainerClassName="gap-8">
        <ScreenHeader onBack={() => void done()} />
        <View className="gap-2">
          <Typography accessibilityRole="header" variant="h1">
            Completion sound
          </Typography>
          <Typography variant="reflection" tone="accent">
            Played once, when your time is complete.
          </Typography>
        </View>
        <View accessibilityRole="radiogroup" className="gap-4">
          {COMPLETION_SOUNDS.map((sound) => {
            const isSelected = selected === sound.id;
            const isPlaying = playingSound === sound.id;
            return (
              <CompletionSoundOption
                key={sound.id}
                sound={sound}
                isSelected={isSelected}
                isPlaying={isPlaying}
                disabled={action.isPending}
                onSelect={() => void select(sound.id)}
                onTogglePreview={() => void action.run(() => (isPlaying ? stop() : play(sound.id)))}
              />
            );
          })}
        </View>
      </StickyFooterScrollView.Body>
      <StickyFooterScrollView.Footer>
        {action.error ? (
          <Animated.View entering={crossfadeIn} className="pb-3">
            <Typography variant="small" tone="danger" accessibilityLiveRegion="polite" align="center" selectable>
              That action couldn’t be completed. Please try again.
            </Typography>
          </Animated.View>
        ) : null}
        <MossPrimaryButton isDisabled={action.isPending} onPress={() => void done()}>
          {action.isPending ? "Working…" : "Done"}
        </MossPrimaryButton>
      </StickyFooterScrollView.Footer>
    </StickyFooterScrollView.Root>
  );
}
