import { View } from "react-native";
import Animated from "react-native-reanimated";

import type { Weekday } from "@/domain/meditation";
import { useSelectionTransition } from "@/hooks/use-selection-transition";
import { useThemeColors } from "@/hooks/use-theme-colors";

import { Typography } from "../typography";
import { MossIcon } from "./moss-icon";
import { MossPressable } from "./moss-pressable";
import { SessionRing } from "./session-ring";

const WEEKDAYS: readonly { day: Weekday; label: string; accessibilityLabel: string }[] = [
  { day: 1, label: "M", accessibilityLabel: "Monday" },
  { day: 2, label: "T", accessibilityLabel: "Tuesday" },
  { day: 3, label: "W", accessibilityLabel: "Wednesday" },
  { day: 4, label: "T", accessibilityLabel: "Thursday" },
  { day: 5, label: "F", accessibilityLabel: "Friday" },
  { day: 6, label: "S", accessibilityLabel: "Saturday" },
  { day: 0, label: "S", accessibilityLabel: "Sunday" },
];

type WeekdaySelectorProps = {
  selected: Weekday[];
  onChange?: (selected: Weekday[]) => void;
  completed?: Set<Weekday>;
  compact?: boolean;
};

function WeekdayChip({
  label,
  accessibilityLabel,
  isSelected,
  sizeClass,
  onToggle,
}: {
  label: string;
  accessibilityLabel: string;
  isSelected: boolean;
  sizeClass: string;
  onToggle: () => void;
}) {
  const { baseStyle, fillStyle } = useSelectionTransition(isSelected, 160);

  return (
    <MossPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      feedback="scale"
      pressedScale={0.96}
      className={`${sizeClass} items-center justify-center rounded-full border border-stone bg-transparent`}
      hitSlop={4}
      onPress={onToggle}
    >
      <Animated.View
        pointerEvents="none"
        style={fillStyle}
        className="absolute inset-0 rounded-full border border-accent bg-accent"
      />
      <Animated.View style={baseStyle}>
        <Typography variant="smallBold" className="text-foreground">
          {label}
        </Typography>
      </Animated.View>
      <Animated.View pointerEvents="none" style={fillStyle} className="absolute inset-0 items-center justify-center">
        <Typography variant="smallBold" className="text-accent-foreground">
          {label}
        </Typography>
      </Animated.View>
    </MossPressable>
  );
}

export function WeekdaySelector({ selected, onChange, completed = new Set(), compact = false }: WeekdaySelectorProps) {
  const colors = useThemeColors();
  const selectedSet = new Set<Weekday>(selected);

  const toggle = (day: Weekday) => {
    if (!onChange) {
      return;
    }
    const next = selectedSet.has(day) ? selected.filter((value) => value !== day) : [...selected, day];
    if (next.length > 0) {
      onChange(next);
    }
  };

  // Read-only rhythm: planned days show an empty track, and a completed sit draws the ring.
  if (!onChange) {
    const ringSize = compact ? 38 : 42;
    return (
      <View className="flex-row justify-between">
        {WEEKDAYS.map(({ day, label, accessibilityLabel }) => {
          const isSelected = selectedSet.has(day);
          const isCompleted = completed.has(day);
          return (
            <View
              key={day}
              accessible
              accessibilityLabel={`${accessibilityLabel}, ${
                isCompleted ? "practice complete" : isSelected ? "practice day" : "not a planned practice day"
              }`}
              accessibilityRole="text"
              className="flex-1 items-center"
            >
              <SessionRing
                size={ringSize}
                progress={isCompleted ? 1 : 0}
                trackColor={isSelected ? undefined : "transparent"}
              >
                {isCompleted ? (
                  <MossIcon name="check" size={15} weight="medium" tintColor={colors.accent} />
                ) : (
                  <Typography variant="smallBold" className={isSelected ? "text-foreground" : "text-muted opacity-50"}>
                    {label}
                  </Typography>
                )}
              </SessionRing>
            </View>
          );
        })}
      </View>
    );
  }

  const sizeClass = compact ? "aspect-square max-h-9 max-w-9 flex-1" : "aspect-square max-h-10 max-w-10 flex-1";

  return (
    <View className="flex-row justify-between gap-0.5">
      {WEEKDAYS.map(({ day, label, accessibilityLabel }) => (
        <WeekdayChip
          key={day}
          label={label}
          accessibilityLabel={accessibilityLabel}
          isSelected={selectedSet.has(day)}
          sizeClass={sizeClass}
          onToggle={() => toggle(day)}
        />
      ))}
    </View>
  );
}
