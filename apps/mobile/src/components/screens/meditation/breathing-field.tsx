import { Image } from "expo-image";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useUniwind } from "uniwind";

type BreathingFieldProps = {
  reducedMotion: boolean;
  ending: boolean;
  size?: number;
};

const MAX_FIELD_SIZE = 330;
const MAX_BREATHING_SCALE = 1.035;
const IMAGE_OVERSCAN_RATIO = 350 / MAX_FIELD_SIZE;

export function BreathingField({ reducedMotion, ending, size }: BreathingFieldProps) {
  const { theme } = useUniwind();
  const { width } = useWindowDimensions();
  const breath = useSharedValue(0);
  const fieldSize = size ?? Math.min(MAX_FIELD_SIZE, (width - 48) / MAX_BREATHING_SCALE);
  const imageSize = fieldSize * IMAGE_OVERSCAN_RATIO;

  useEffect(() => {
    cancelAnimation(breath);
    if (reducedMotion) {
      breath.set(0.5);
      return;
    }
    breath.set(
      withRepeat(
        withTiming(1, {
          duration: 1_400,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(breath);
  }, [breath, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.get(), [0, 1], ending ? [0.58, 0.7] : [0.82, 1]),
    transform: [
      {
        scale: interpolate(breath.get(), [0, 1], ending ? [0.74, 0.79] : [0.96, MAX_BREATHING_SCALE]),
      },
    ],
  }));

  return (
    <Animated.View
      className="items-center justify-center overflow-hidden rounded-full"
      style={[{ height: fieldSize, width: fieldSize }, animatedStyle]}
      accessibilityElementsHidden
    >
      <Image
        source={
          theme === "dark"
            ? require("../../../../assets/images/moss-breathing-field-dark.png")
            : require("../../../../assets/images/moss-breathing-field.png")
        }
        contentFit="contain"
        style={{ height: imageSize, width: imageSize }}
      />
    </Animated.View>
  );
}
