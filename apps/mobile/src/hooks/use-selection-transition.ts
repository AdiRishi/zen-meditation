import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { durations, easings } from "@/lib/motion";

export function useSelectionTransition(isSelected: boolean, duration: number = durations.crossfade) {
  const progress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(isSelected ? 1 : 0, { duration, easing: easings.move }));
  }, [duration, isSelected, progress]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const baseStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  const indicatorStyle = useAnimatedStyle(() => {
    const value = progress.get();
    return {
      opacity: value,
      transform: [{ scale: 0.95 + value * 0.05 }],
    };
  });

  return { baseStyle, fillStyle, indicatorStyle };
}
