import { HeaderShownContext } from "expo-router/react-navigation";
import { use } from "react";
import { useWindowDimensions, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useScreenContainerScope } from "./screen-container-scope";
import { useScreenFooterHeight } from "./screen-footer-context";

type ScreenContainerInsetsStyle = Readonly<
  Pick<ViewStyle, "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft">
>;

const ZERO_INSETS = {
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
} satisfies ScreenContainerInsetsStyle;

export function useScreenContainerInsets(edgeToEdge?: boolean): ScreenContainerInsetsStyle {
  const scope = useScreenContainerScope();
  const headerShown = use(HeaderShownContext);
  const insets = useSafeAreaInsets();

  if (edgeToEdge) {
    return ZERO_INSETS;
  }

  const shouldSkipTopInset = Boolean(headerShown);
  const shouldSkipBottomInset = process.env.EXPO_OS === "android" && scope === "tabs";

  return {
    paddingTop: shouldSkipTopInset ? 0 : insets.top,
    paddingRight: insets.right,
    paddingBottom: shouldSkipBottomInset ? 0 : insets.bottom,
    paddingLeft: insets.left,
  };
}

export function useScreenContainerScrollInsets(edgeToEdge?: boolean): ScreenContainerInsetsStyle {
  const insets = useScreenContainerInsets(edgeToEdge);

  if (process.env.EXPO_OS === "ios") {
    return ZERO_INSETS;
  }

  return insets;
}

/** Minimum content height for full-window scroll surfaces, or null for scoped surfaces without a viewport guarantee. */
export function useScreenContainerViewportMinHeight(edgeToEdge?: boolean): number | null {
  const scope = useScreenContainerScope();
  const headerShown = use(HeaderShownContext);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const footerHeight = useScreenFooterHeight();

  if (scope !== "default") {
    return null;
  }
  if (edgeToEdge) {
    return windowHeight;
  }

  const topInset = headerShown ? 0 : insets.top;
  const footerOwnsBottomInset = footerHeight > 0 && process.env.EXPO_OS === "ios";
  const bottomInset = footerOwnsBottomInset ? 0 : insets.bottom;

  return windowHeight - topInset - bottomInset;
}
