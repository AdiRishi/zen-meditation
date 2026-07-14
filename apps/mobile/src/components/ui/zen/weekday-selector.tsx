import { Pressable, View } from "react-native";

import type { Weekday } from "@/domain/meditation";
import { useThemeColors } from "@/hooks/use-theme-colors";

import { Typography } from "../typography";
import { ZenIcon } from "./zen-icon";

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

export function WeekdaySelector({ selected, onChange, completed = new Set(), compact = false }: WeekdaySelectorProps) {
  const colors = useThemeColors();
  const selectedSet = new Set<Weekday>(selected);
  const sizeClass = compact ? "aspect-square max-h-9 max-w-9 flex-1" : "aspect-square max-h-10 max-w-10 flex-1";

  const toggle = (day: Weekday) => {
    if (!onChange) {
      return;
    }
    const next = selectedSet.has(day) ? selected.filter((value) => value !== day) : [...selected, day];
    if (next.length > 0) {
      onChange(next);
    }
  };

  return (
    <View className="flex-row justify-between gap-0.5">
      {WEEKDAYS.map(({ day, label, accessibilityLabel }) => {
        const isSelected = selectedSet.has(day);
        const isCompleted = completed.has(day);
        const className = `${sizeClass} items-center justify-center rounded-full border ${
          isSelected ? "border-accent bg-accent" : "border-stone bg-transparent"
        }`;
        const content = isCompleted ? (
          <ZenIcon name="check" size={14} tintColor={isSelected ? colors.accentForeground : colors.accent} />
        ) : (
          <Typography variant="smallBold" className={isSelected ? "text-accent-foreground" : "text-foreground"}>
            {label}
          </Typography>
        );

        if (!onChange) {
          return (
            <View
              key={day}
              accessible
              accessibilityLabel={`${accessibilityLabel}, ${
                isCompleted ? "practice complete" : isSelected ? "practice day" : "not a planned practice day"
              }`}
              accessibilityRole="text"
              className={className}
            >
              {content}
            </View>
          );
        }

        return (
          <Pressable
            key={day}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            className={className}
            hitSlop={4}
            onPress={() => toggle(day)}
          >
            {content}
          </Pressable>
        );
      })}
    </View>
  );
}
