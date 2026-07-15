import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";

import { Typography } from "../typography";
import { MossIcon } from "./moss-icon";

type ScreenHeaderProps = {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  trailing?: React.ReactNode;
};

export function ScreenHeader({ title, onBack, backLabel = "Back", trailing }: ScreenHeaderProps) {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <View className="min-h-14 flex-row items-center justify-between py-1">
      <Pressable
        accessibilityLabel={backLabel}
        accessibilityRole="button"
        className="size-11 items-start justify-center"
        hitSlop={8}
        onPress={onBack ?? router.back}
      >
        <MossIcon name="back" size={20} tintColor={colors.foreground} />
      </Pressable>
      {title ? (
        <Typography accessibilityRole="header" variant="h4" align="center" className="flex-1 font-serif font-normal">
          {title}
        </Typography>
      ) : (
        <View className="flex-1" />
      )}
      <View className="size-11 items-end justify-center">{trailing}</View>
    </View>
  );
}
