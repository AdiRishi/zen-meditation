import { Pressable, View } from "react-native";

import { SESSION_DURATIONS, type SessionDuration } from "@/domain/meditation";

import { Typography } from "../typography";

type DurationSelectorProps = {
  value: SessionDuration;
  onChange: (value: SessionDuration) => void;
};

export function DurationSelector({ value, onChange }: DurationSelectorProps) {
  return (
    <View accessibilityRole="radiogroup" className="flex-row flex-wrap justify-center gap-5">
      {SESSION_DURATIONS.map((duration) => {
        const isSelected = value === duration;
        return (
          <Pressable
            key={duration}
            accessibilityLabel={`${duration} minutes`}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            className={`min-h-[76px] w-[76px] items-center justify-center rounded-full border px-1 py-2 ${
              isSelected ? "border-accent bg-accent" : "border-stone"
            }`}
            onPress={() => onChange(duration)}
          >
            <Typography
              variant="h2"
              align="center"
              tabularNums
              className={isSelected ? "text-accent-foreground" : undefined}
            >
              {duration}
            </Typography>
            <Typography
              variant="caption"
              tone={isSelected ? "default" : "muted"}
              align="center"
              className={isSelected ? "text-accent-foreground opacity-80" : undefined}
            >
              min
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
