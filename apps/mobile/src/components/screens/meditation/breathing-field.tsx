import { Image } from "expo-image";
import { useEffect } from "react";
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
};

export function BreathingField({ reducedMotion, ending }: BreathingFieldProps) {
  const { theme } = useUniwind();
  const breath = useSharedValue(0);

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
        scale: interpolate(breath.get(), [0, 1], ending ? [0.74, 0.79] : [0.96, 1.035]),
      },
    ],
  }));

  return (
    <Animated.View
      className="size-[330px] items-center justify-center overflow-hidden"
      style={animatedStyle}
      accessibilityElementsHidden
    >
      <Image
        source={
          theme === "dark"
            ? require("../../../../assets/images/zen-breathing-field-dark.png")
            : require("../../../../assets/images/zen-breathing-field.png")
        }
        contentFit="contain"
        style={{ height: 350, width: 350 }}
      />
    </Animated.View>
  );
}
