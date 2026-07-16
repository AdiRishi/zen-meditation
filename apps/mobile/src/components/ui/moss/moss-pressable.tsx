import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { durations, easings } from "@/lib/motion";
import { useReducedMotionPreference } from "@/providers/meditation-provider";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type MossPressableProps = Omit<PressableProps, "style" | "children"> & {
  /**
   * How the surface answers the touch:
   * - "scale": settles toward the finger (chips, round controls, cards)
   * - "highlight": the paper darkens under the press (list rows)
   * - "dim": a quiet opacity dip (icon and text buttons)
   */
  feedback?: "scale" | "highlight" | "dim";
  /** Pressed scale for the "scale" feedback. Keep subtle: 0.95–0.98. */
  pressedScale?: number;
  children?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A Pressable that always answers the finger. Feedback rides the gesture
 * (press-in/press-out), never the async work behind the tap: highlights land
 * instantly, scale eases in fast, and release always glides back.
 *
 * Under reduced motion the scale variant becomes a dim — feedback stays,
 * movement goes.
 */
export function MossPressable({
  feedback = "scale",
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  children,
  style,
  ...props
}: MossPressableProps) {
  const reducedMotion = useReducedMotionPreference();
  const pressed = useSharedValue(0);
  const mode = feedback === "scale" && reducedMotion ? "dim" : feedback;

  const handlePressIn = (event: GestureResponderEvent) => {
    // Highlights and dims land on the same frame as the touch; scale eases.
    pressed.set(mode === "scale" ? withTiming(1, { duration: durations.pressIn, easing: easings.exit }) : 1);
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    pressed.set(withTiming(0, { duration: durations.pressOut, easing: easings.exit }));
    onPressOut?.(event);
  };

  const surfaceStyle = useAnimatedStyle(() => {
    const value = pressed.get();
    if (mode === "dim") {
      return { opacity: 1 - 0.24 * value };
    }
    if (mode === "scale") {
      return { transform: [{ scale: 1 - (1 - pressedScale) * value }] };
    }
    return {};
  });

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: mode === "highlight" ? pressed.get() : 0,
  }));

  return (
    <AnimatedPressable style={[surfaceStyle, style]} onPressIn={handlePressIn} onPressOut={handlePressOut} {...props}>
      {mode === "highlight" ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, highlightStyle]}
          className="bg-surface-secondary"
        />
      ) : null}
      {children}
    </AnimatedPressable>
  );
}
