import { SymbolView, type SymbolViewProps } from "expo-symbols";

import type { CompletionSound } from "@/domain/meditation";

export type MossIconName =
  | "sun"
  | "moon"
  | "bell"
  | "bowl"
  | "wood"
  | "sound"
  | "back"
  | "forward"
  | "play"
  | "pause"
  | "check"
  | "calendar"
  | "palette"
  | "motion"
  | "lock"
  | "info"
  | "plus"
  | "minus";

const ICONS = {
  sun: { ios: "sun.max", android: "light_mode", web: "light_mode" },
  moon: { ios: "moon", android: "dark_mode", web: "dark_mode" },
  bell: { ios: "bell", android: "notifications", web: "notifications" },
  bowl: { ios: "cup.and.saucer", android: "emoji_food_beverage", web: "emoji_food_beverage" },
  wood: { ios: "tree", android: "forest", web: "forest" },
  sound: { ios: "speaker.wave.2", android: "volume_up", web: "volume_up" },
  back: { ios: "chevron.left", android: "chevron_left", web: "chevron_left" },
  forward: { ios: "chevron.right", android: "chevron_right", web: "chevron_right" },
  play: { ios: "play.fill", android: "play_arrow", web: "play_arrow" },
  pause: { ios: "pause.fill", android: "pause", web: "pause" },
  check: { ios: "checkmark", android: "check", web: "check" },
  calendar: { ios: "calendar", android: "calendar_month", web: "calendar_month" },
  palette: { ios: "paintpalette", android: "palette", web: "palette" },
  motion: { ios: "figure.arms.open", android: "visibility", web: "visibility" },
  lock: { ios: "lock", android: "lock", web: "lock" },
  info: { ios: "info.circle", android: "info", web: "info" },
  plus: { ios: "plus", android: "add", web: "add" },
  minus: { ios: "minus", android: "remove", web: "remove" },
} as const satisfies Record<MossIconName, SymbolViewProps["name"]>;

type MossIconProps = Omit<SymbolViewProps, "name"> & {
  name: MossIconName;
};

const COMPLETION_SOUND_ICONS = {
  "soft-chime": "bell",
  "low-bowl": "bowl",
  "wood-tone": "wood",
} as const satisfies Record<CompletionSound, MossIconName>;

export function completionSoundIcon(sound: CompletionSound): MossIconName {
  return COMPLETION_SOUND_ICONS[sound];
}

export function MossIcon({ name, size = 22, weight = "light", ...props }: MossIconProps) {
  return <SymbolView name={ICONS[name]} size={size} weight={weight} resizeMode="scaleAspectFit" {...props} />;
}
