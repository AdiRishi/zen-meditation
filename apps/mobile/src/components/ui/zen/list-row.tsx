import { Separator } from "heroui-native";
import { Children, isValidElement } from "react";
import { Pressable, View } from "react-native";

import { formatPracticeTime } from "@/domain/date-time";
import type { CompletionSound, PracticeTime } from "@/domain/meditation";
import { getCompletionSoundLabel } from "@/domain/meditation";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { cn } from "@/lib/cn";

import { Typography } from "../typography";
import { ZenCard } from "./zen-card";
import { completionSoundIcon, ZenIcon, type ZenIconName } from "./zen-icon";

type ZenListRowProps = {
  icon: ZenIconName;
  label: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  accessibilityHint?: string;
  className?: string;
  iconClassName?: string;
  iconSize?: number;
};

export function ZenListRow({
  icon,
  label,
  detail,
  value,
  onPress,
  trailing,
  showChevron = Boolean(onPress),
  accessibilityHint,
  className,
  iconClassName,
  iconSize = 22,
}: ZenListRowProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={[label, detail, value].filter(Boolean).join(", ")}
      accessibilityHint={accessibilityHint}
      className={cn("min-h-16 flex-row items-center gap-4 px-5 py-3", className)}
      disabled={!onPress}
      onPress={onPress}
    >
      <View className={cn("items-center justify-center", iconClassName)}>
        <ZenIcon name={icon} size={iconSize} tintColor={colors.muted} />
      </View>
      <View className="flex-1 gap-0.5">
        <Typography variant="body">{label}</Typography>
        {detail ? (
          <Typography variant="small" tone="muted" tabularNums>
            {detail}
          </Typography>
        ) : null}
        {value ? (
          <Typography variant="small" tone="muted" tabularNums>
            {value}
          </Typography>
        ) : null}
      </View>
      {trailing}
      {showChevron ? <ZenIcon name="forward" size={16} tintColor={colors.muted} /> : null}
    </Pressable>
  );
}

export function PracticeTimeRow({
  time,
  onPress,
  trailing,
  value = formatPracticeTime(time),
  detail,
  prominent = false,
}: {
  time: PracticeTime;
  onPress?: () => void;
  trailing?: React.ReactNode;
  value?: string;
  detail?: string;
  prominent?: boolean;
}) {
  return (
    <ZenListRow
      icon={time.hour < 12 ? "sun" : "moon"}
      label={time.label}
      detail={detail}
      value={value}
      onPress={onPress}
      trailing={trailing}
      showChevron={Boolean(onPress) && !trailing}
      className={prominent ? "min-h-24 px-5 py-4" : undefined}
      iconSize={prominent ? 26 : undefined}
    />
  );
}

export function CompletionSoundRow({
  sound,
  onPress,
  trailing,
}: {
  sound: CompletionSound;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <ZenListRow
      icon={completionSoundIcon(sound)}
      label="Completion sound"
      value={getCompletionSoundLabel(sound)}
      onPress={onPress}
      trailing={trailing}
      showChevron={Boolean(onPress) && !trailing}
    />
  );
}

export function GroupedList({ children, ...props }: React.ComponentProps<typeof ZenCard>) {
  const items = Children.toArray(children);
  return (
    <ZenCard {...props}>
      {items.map((child, index) => (
        <View key={isValidElement(child) && child.key !== null ? child.key : index}>
          {index > 0 ? <Separator /> : null}
          {child}
        </View>
      ))}
    </ZenCard>
  );
}
