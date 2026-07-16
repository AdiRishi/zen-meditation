import { useFrameCallback, useSharedValue, type SharedValue } from "react-native-reanimated";

type ShaderClockOptions = {
  /** Cap uniform updates below the display refresh rate to save battery. */
  fps?: number;
  /** When false the frame callback is fully unregistered (reduced motion, off-screen). */
  enabled?: boolean;
  /** Seconds already elapsed at mount, so a frozen clock still shows a composed frame. */
  startAt?: number;
};

export function useShaderClock({
  fps = 30,
  enabled = true,
  startAt = 0,
}: ShaderClockOptions = {}): SharedValue<number> {
  const time = useSharedValue(startAt);
  const accumulatedMs = useSharedValue(0);

  useFrameCallback((frame) => {
    if (frame.timeSincePreviousFrame === null) {
      return;
    }
    accumulatedMs.value += frame.timeSincePreviousFrame;
    if (accumulatedMs.value >= 1000 / fps) {
      time.value += accumulatedMs.value / 1000;
      accumulatedMs.value = 0;
    }
  }, enabled);

  return time;
}
