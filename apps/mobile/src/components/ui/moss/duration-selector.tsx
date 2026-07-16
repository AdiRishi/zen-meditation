import { View } from "react-native";
import Animated from "react-native-reanimated";

import { SESSION_DURATIONS, type SessionDuration } from "@/domain/meditation";
import { useSelectionTransition } from "@/hooks/use-selection-transition";

import { Typography } from "../typography";
import { MossPressable } from "./moss-pressable";

type DurationSelectorProps = {
  value: SessionDuration;
  onChange: (value: SessionDuration) => void;
};

function DurationChip({
  duration,
  isSelected,
  onSelect,
}: {
  duration: SessionDuration;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { baseStyle, fillStyle } = useSelectionTransition(isSelected);

  return (
    <MossPressable
      accessibilityLabel={`${duration} minutes`}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      feedback="scale"
      pressedScale={0.96}
      className="min-h-[76px] w-[76px] items-center justify-center rounded-full border border-stone px-1 py-2"
      onPress={onSelect}
    >
      <Animated.View
        pointerEvents="none"
        style={fillStyle}
        className="absolute inset-0 rounded-full border border-accent bg-accent"
      />
      <Animated.View style={baseStyle} className="items-center">
        <Typography variant="h2" align="center" tabularNums>
          {duration}
        </Typography>
        <Typography variant="caption" tone="muted" align="center">
          min
        </Typography>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={fillStyle}
        className="absolute inset-0 items-center justify-center px-1 py-2"
      >
        <Typography variant="h2" align="center" tabularNums className="text-accent-foreground">
          {duration}
        </Typography>
        <Typography variant="caption" align="center" className="text-accent-foreground opacity-80">
          min
        </Typography>
      </Animated.View>
    </MossPressable>
  );
}

export function DurationSelector({ value, onChange }: DurationSelectorProps) {
  return (
    <View accessibilityRole="radiogroup" className="flex-row flex-wrap justify-center gap-5">
      {SESSION_DURATIONS.map((duration) => (
        <DurationChip
          key={duration}
          duration={duration}
          isSelected={value === duration}
          onSelect={() => onChange(duration)}
        />
      ))}
    </View>
  );
}
