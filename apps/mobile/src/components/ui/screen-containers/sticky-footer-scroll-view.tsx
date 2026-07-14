import type { LayoutChangeEvent, ViewProps } from "react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/cn";

import { FormScrollView } from "./form-scroll-view";
import { ScreenFooterProvider, useScreenFooterControls, useScreenFooterHeight } from "./screen-footer-context";
import { StandardScrollView } from "./standard-scroll-view";

/** Scrollable screen body with an absolutely positioned, safe-area-aware footer. */

type StickyFooterScrollViewRootProps = {
  children: React.ReactNode;
};

function Root({ children }: StickyFooterScrollViewRootProps) {
  return (
    <ScreenFooterProvider>
      <View className="flex-1 bg-background">{children}</View>
    </ScreenFooterProvider>
  );
}

function useBodyPadding() {
  const footerHeight = useScreenFooterHeight();
  return footerHeight > 0 ? { paddingBottom: footerHeight } : null;
}

function Body({ contentContainerStyle, ...props }: React.ComponentProps<typeof StandardScrollView>) {
  const padding = useBodyPadding();
  return <StandardScrollView contentContainerStyle={[contentContainerStyle, padding]} {...props} />;
}

function FormBody({ contentContainerStyle, ...props }: React.ComponentProps<typeof FormScrollView>) {
  const padding = useBodyPadding();
  return <FormScrollView contentContainerStyle={[contentContainerStyle, padding]} {...props} />;
}

function Footer({ children, className, style, onLayout, ...props }: ViewProps) {
  const insets = useSafeAreaInsets();
  const { setFooterHeight } = useScreenFooterControls();

  const handleLayout = (event: LayoutChangeEvent) => {
    setFooterHeight(Math.ceil(event.nativeEvent.layout.height));
    onLayout?.(event);
  };

  return (
    <View
      className={cn("absolute right-0 bottom-0 left-0 bg-background px-6 pt-4", className)}
      style={[{ paddingBottom: Math.max(insets.bottom, 16) }, style]}
      onLayout={handleLayout}
      {...props}
    >
      {children}
    </View>
  );
}

export const StickyFooterScrollView = {
  Root,
  Body,
  FormBody,
  Footer,
};
