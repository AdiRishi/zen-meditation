import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { MossPrimaryButton } from "@/components/ui/moss/moss-button";
import { MossCard } from "@/components/ui/moss/moss-card";
import { completionSoundIcon, MossIcon } from "@/components/ui/moss/moss-icon";
import { ScreenHeader } from "@/components/ui/moss/screen-header";
import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";
import { Typography } from "@/components/ui/typography";
import { COMPLETION_SOUNDS, type CompletionSound } from "@/domain/meditation";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useCompletionSounds } from "@/hooks/use-completion-sounds";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useMeditation } from "@/providers/meditation-provider";

export function CompletionSoundScreen() {
  const router = useRouter();
  const colors = useThemeColors();
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
              <MossCard key={sound.id} className="min-h-20 flex-row items-center px-4 py-3">
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected, disabled: action.isPending }}
                  accessibilityLabel={sound.label}
                  className="min-h-14 flex-1 flex-row items-center gap-4"
                  disabled={action.isPending}
                  onPress={() => void select(sound.id)}
                >
                  <View className="w-8 items-center justify-center">
                    <MossIcon name={completionSoundIcon(sound.id)} size={23} tintColor={colors.muted} />
                  </View>
                  <Typography className="flex-1">{sound.label}</Typography>
                  {isSelected ? (
                    <View className="size-8 items-center justify-center rounded-full bg-accent">
                      <MossIcon name="check" size={16} tintColor={colors.accentForeground} />
                    </View>
                  ) : null}
                </Pressable>
                <Pressable
                  accessibilityLabel={`${isPlaying ? "Stop" : "Preview"} ${sound.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: action.isPending }}
                  className="ml-3 size-11 items-center justify-center rounded-full border border-stone"
                  disabled={action.isPending}
                  onPress={() => void action.run(() => (isPlaying ? stop() : play(sound.id)))}
                >
                  <MossIcon name={isPlaying ? "pause" : "play"} size={16} tintColor={colors.foreground} />
                </Pressable>
              </MossCard>
            );
          })}
        </View>
      </StickyFooterScrollView.Body>
      <StickyFooterScrollView.Footer>
        {action.error ? (
          <Typography
            variant="small"
            tone="danger"
            accessibilityLiveRegion="polite"
            align="center"
            selectable
            className="pb-3"
          >
            That action couldn’t be completed. Please try again.
          </Typography>
        ) : null}
        <MossPrimaryButton isDisabled={action.isPending} onPress={() => void done()}>
          {action.isPending ? "Working…" : "Done"}
        </MossPrimaryButton>
      </StickyFooterScrollView.Footer>
    </StickyFooterScrollView.Root>
  );
}
