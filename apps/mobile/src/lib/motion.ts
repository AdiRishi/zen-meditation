import { Easing, FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

/**
 * Shared Moss durations, curves, and builders keep sibling screens moving
 * with the same quiet, responsive character.
 *
 * Reduced motion means gentler, not gone: movement and stagger drop away,
 * opacity fades stay, because a hard cut is its own kind of loud.
 */

export const durations = {
  /** Press feedback arriving under the finger. */
  pressIn: 110,
  /** Press feedback releasing back to rest. */
  pressOut: 130,
  /** heroui Button press (one config covers press and release). */
  buttonPress: 150,
  /** Content crossfades: state swaps, selection fills, month pages. */
  crossfade: 200,
  /** The outgoing half of a crossfade — exits step aside faster. */
  crossfadeOut: 150,
  /** Entrance on rare, unhurried surfaces such as first-run welcome. */
  entranceSlow: 450,
  /** Completion content that should settle without withholding controls. */
  completionEntrance: 280,
  /** Reduced-motion fades retain state continuity without spatial movement. */
  reducedFade: 200,
  /** Layout easing to a new position (a banner arriving above a button). */
  glide: 250,
  /** Settling: the wind-down dim, the meditation ring's first draw. */
  settle: 900,
  /** Half of the 2.8s brand breath; the completion ring draws over one exhale. */
  halfBreath: 1400,
} as const;

export const easings = {
  /** Strong ease-out for entrances and anything answering the user. */
  enter: Easing.bezier(0.23, 1, 0.32, 1),
  /** Strong ease-out for feedback and small exits. */
  exit: Easing.bezier(0.23, 1, 0.32, 1),
  /** Strong ease-in-out for functional movement and state interpolation. */
  move: Easing.bezier(0.77, 0, 0.175, 1),
  /** Quiet ease-in-out for the brand's ambient breathing motion. */
  ambient: Easing.inOut(Easing.ease),
  /** Ring draws share one deceleration so every ensō closes the same way. */
  draw: Easing.out(Easing.cubic),
} as const;

/** Stable opacity builders for frequently rerendering state surfaces. */
export const crossfadeIn = FadeIn.duration(durations.crossfade).easing(easings.enter);
export const crossfadeOut = FadeOut.duration(durations.crossfadeOut).easing(easings.exit);
export const reducedFadeIn = FadeIn.duration(durations.reducedFade).easing(easings.enter);

/** Ease a view toward its new layout instead of teleporting. */
export function glide(reducedMotion: boolean) {
  return reducedMotion ? undefined : LinearTransition.duration(durations.glide).easing(easings.move);
}

/**
 * Press feedback for heroui Buttons. The library default (300ms) reads mushy;
 * 150ms answers inside the press-feedback budget while keeping the library's
 * own curve and width-compensated scale.
 */
export const buttonPressAnimation = {
  scale: {
    value: 0.97,
    timingConfig: { duration: durations.buttonPress, easing: easings.enter },
  },
} as const;

export const reducedButtonPressAnimation = {
  scale: {
    value: 1,
    timingConfig: { duration: durations.buttonPress, easing: easings.enter },
  },
} as const;
