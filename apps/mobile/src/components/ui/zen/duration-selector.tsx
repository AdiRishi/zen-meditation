import { Pressable, View } from "react-native";

import { SESSION_DURATIONS } from "@/domain/meditation";

import { Typography } from "../typography";

type DurationSelectorProps = {
  value: number;
  onChange: (value: (typeof SESSION_DURATIONS)[number]) => void;
};

export function DurationSelector({ value, onChange }: DurationSelectorProps) {
  return (
    <View className="flex-row flex-wrap justify-center gap-5">
      {SESSION_DURATIONS.map((duration) => {
        const isSelected = value === duration;
        return (
          <Pressable
            key={duration}
            accessibilityLabel={`${duration} minutes`}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            className={`min-h-[76px] w-[76px] items-center justify-center rounded-full border px-1 py-2 ${
              isSelected ? "border-[3px] border-accent" : "border-stone"
            }`}
            onPress={() => onChange(duration)}
          >
            <Typography variant="h2" align="center" tabularNums>
              {duration}
            </Typography>
            <Typography variant="caption" tone="muted" align="center">
              min
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
