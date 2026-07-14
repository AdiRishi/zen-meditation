import { useThemeColor } from "heroui-native";
import type { Ref } from "react";
import { ScrollView, type ScrollViewProps, type StyleProp, View, type ViewStyle } from "react-native";
import { type VariantProps, tv } from "tailwind-variants";

import { useScreenContainerScrollInsets } from "./use-screen-container-insets";

const screenScrollViewVariants = tv({
  base: "flex-1 bg-background px-6",
});

export type ScreenScrollViewBaseProps = ScrollViewProps &
  VariantProps<typeof screenScrollViewVariants> & {
    containerStyle?: StyleProp<ViewStyle>;
    edgeToEdge?: boolean;
    ref?: Ref<ScrollView>;
  };

export function ScreenScrollViewBase({
  automaticallyAdjustsScrollIndicatorInsets,
  children,
  className,
  containerStyle,
  contentInsetAdjustmentBehavior,
  contentContainerClassName,
  edgeToEdge,
  ref,
  showsHorizontalScrollIndicator = false,
  showsVerticalScrollIndicator = false,
  style,
  ...props
}: ScreenScrollViewBaseProps) {
  const safeAreaInsets = useScreenContainerScrollInsets(edgeToEdge);
  const backgroundColor = useThemeColor("background");

  return (
    <View style={[{ flex: 1, backgroundColor }, safeAreaInsets, containerStyle]}>
      <ScrollView
        ref={ref}
        automaticallyAdjustsScrollIndicatorInsets={automaticallyAdjustsScrollIndicatorInsets ?? !edgeToEdge}
        className={screenScrollViewVariants({ class: className })}
        contentContainerClassName={contentContainerClassName}
        contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior ?? (edgeToEdge ? "never" : "automatic")}
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        style={style}
        {...props}
      >
        {children}
      </ScrollView>
    </View>
  );
}
