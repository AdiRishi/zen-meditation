import { useThemeColor } from "heroui-native";

export function useThemeColors() {
  const [accent, accentForeground, accentSoft, background, border, surface, foreground, muted] = useThemeColor([
    "accent",
    "accent-foreground",
    "accent-soft",
    "background",
    "border",
    "surface",
    "foreground",
    "muted",
  ]);

  return {
    accent,
    accentForeground,
    accentSoft,
    background,
    border,
    surface,
    foreground,
    muted,
  } as const;
}
