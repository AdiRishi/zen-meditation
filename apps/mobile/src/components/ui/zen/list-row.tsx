import { Separator } from "heroui-native";
import { Children } from "react";
import { Pressable, View } from "react-native";

import { formatPracticeTime } from "@/domain/date-time";
import type { CompletionSound, PracticeTime } from "@/domain/meditation";
import { getCompletionSoundLabel } from "@/domain/meditation";
import { useThemeColors } from "@/hooks/use-theme-colors";

import { Typography } from "../typography";
import { ZenCard } from "./zen-card";
import { ZenIcon, type ZenIconName } from "./zen-icon";

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
      className={`min-h-16 flex-row items-center gap-4 px-4 py-3 ${className ?? ""}`}
      disabled={!onPress}
      onPress={onPress}
    >
      <View className={`size-10 items-center justify-center rounded-full bg-surface-secondary ${iconClassName ?? ""}`}>
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
      className={prominent ? "min-h-32 px-5 py-4" : undefined}
      iconClassName={prominent ? "size-16" : undefined}
      iconSize={prominent ? 30 : undefined}
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
  const icon: ZenIconName = sound === "soft-chime" ? "bell" : sound === "low-bowl" ? "bowl" : "wood";
  return (
    <ZenListRow
      icon={icon}
      label="Completion sound"
      value={getCompletionSoundLabel(sound)}
      onPress={onPress}
      trailing={trailing}
      showChevron={Boolean(onPress) && !trailing}
    />
  );
}

export function GroupedList({ children }: { children: React.ReactNode | React.ReactNode[] }) {
  const items = Children.toArray(children);
  return (
    <ZenCard>
      {items.map((child, index) => (
        <View key={index}>
          {index > 0 ? <Separator /> : null}
          {child}
        </View>
      ))}
    </ZenCard>
  );
}
