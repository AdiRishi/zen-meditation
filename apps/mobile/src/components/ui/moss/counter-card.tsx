import { View } from "react-native";

import { Typography } from "@/components/ui/typography";
import { useThemeColors } from "@/hooks/use-theme-colors";

import { MossCard } from "./moss-card";
import { MossIcon } from "./moss-icon";
import { MossPressable } from "./moss-pressable";

type CounterCardProps = {
  value: number;
  label: string;
  minimum: number;
  maximum: number;
  accessibilityLabel?: string;
  onChange: (value: number) => void;
};

export function CounterCard({
  value,
  label,
  minimum,
  maximum,
  accessibilityLabel = label,
  onChange,
}: CounterCardProps) {
  const colors = useThemeColors();
  const cannotDecrease = value <= minimum;
  const cannotIncrease = value >= maximum;

  return (
    <MossCard className="flex-row items-center justify-between px-4 py-4">
      <MossPressable
        accessibilityLabel={`Decrease ${accessibilityLabel}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: cannotDecrease }}
        feedback="scale"
        pressedScale={0.96}
        className="size-11 items-center justify-center rounded-full border border-stone"
        disabled={cannotDecrease}
        onPress={() => onChange(Math.max(minimum, value - 1))}
      >
        <MossIcon name="minus" size={18} tintColor={cannotDecrease ? colors.border : colors.foreground} />
      </MossPressable>
      <View className="items-center gap-0.5">
        <Typography variant="h2" align="center" tone="accent" tabularNums>
          {value}
        </Typography>
        <Typography variant="caption" tone="muted" align="center">
          {label}
        </Typography>
      </View>
      <MossPressable
        accessibilityLabel={`Increase ${accessibilityLabel}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: cannotIncrease }}
        feedback="scale"
        pressedScale={0.96}
        className="size-11 items-center justify-center rounded-full border border-stone"
        disabled={cannotIncrease}
        onPress={() => onChange(Math.min(maximum, value + 1))}
      >
        <MossIcon name="plus" size={18} tintColor={cannotIncrease ? colors.border : colors.foreground} />
      </MossPressable>
    </MossCard>
  );
}
