import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import { ScreenHeader } from "@/components/ui/zen/screen-header";
import { ZenPrimaryButton } from "@/components/ui/zen/zen-button";
import { ZenCard } from "@/components/ui/zen/zen-card";
import { ZenIcon, type ZenIconName } from "@/components/ui/zen/zen-icon";
import { COMPLETION_SOUNDS, type CompletionSound } from "@/domain/meditation";
import { useCompletionSounds } from "@/hooks/use-completion-sounds";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { selectionHaptic } from "@/lib/haptics";
import { useMeditation } from "@/providers/meditation-provider";

function soundIcon(sound: CompletionSound): ZenIconName {
  return sound === "soft-chime" ? "bell" : sound === "low-bowl" ? "bowl" : "wood";
}

export function CompletionSoundScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { preferences, savePreferences } = useMeditation();
  const { play, playingSound, stop } = useCompletionSounds();
  const selected = preferences.completionSound;

  const select = async (sound: CompletionSound) => {
    selectionHaptic();
    await savePreferences({ ...preferences, completionSound: sound });
  };

  const done = async () => {
    await stop();
    router.back();
  };

  return (
    <StandardScrollView contentContainerClassName="min-h-full justify-between gap-8 pb-6">
      <View className="gap-8">
        <ScreenHeader onBack={() => void done()} />
        <View className="gap-2">
          <Typography accessibilityRole="header" variant="h1">
            Completion sound
          </Typography>
          <Typography tone="accent">Played once, when your time is complete.</Typography>
        </View>
        <View className="gap-4">
          {COMPLETION_SOUNDS.map((sound) => {
            const isSelected = selected === sound.id;
            const isPlaying = playingSound === sound.id;
            return (
              <ZenCard key={sound.id} className="min-h-20 flex-row items-center px-4 py-3">
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={sound.label}
                  className="min-h-14 flex-1 flex-row items-center gap-4"
                  onPress={() => void select(sound.id)}
                >
                  <View className="size-11 items-center justify-center rounded-full bg-surface-secondary">
                    <ZenIcon name={soundIcon(sound.id)} size={23} tintColor={colors.muted} />
                  </View>
                  <Typography className="flex-1">{sound.label}</Typography>
                  {isSelected ? (
                    <View className="size-8 items-center justify-center rounded-full bg-accent">
                      <ZenIcon name="check" size={16} tintColor={colors.accentForeground} />
                    </View>
                  ) : null}
                </Pressable>
                <Pressable
                  accessibilityLabel={`${isPlaying ? "Stop" : "Preview"} ${sound.label}`}
                  accessibilityRole="button"
                  className="ml-3 size-11 items-center justify-center rounded-full border border-stone"
                  onPress={() => void (isPlaying ? stop() : play(sound.id))}
                >
                  <ZenIcon name={isPlaying ? "pause" : "play"} size={16} tintColor={colors.foreground} />
                </Pressable>
              </ZenCard>
            );
          })}
        </View>
      </View>
      <ZenPrimaryButton onPress={() => void done()}>Done</ZenPrimaryButton>
    </StandardScrollView>
  );
}
