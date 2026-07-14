import React, { createContext, use } from "react";
import type { LayoutChangeEvent, ViewProps } from "react-native";
import { View } from "react-native";

import { cn } from "@/lib/cn";

import { FormScrollView } from "./form-scroll-view";

type StickyFooterFormScrollViewContextValue = {
  footerHeight: number;
  setFooterHeight: (height: number) => void;
};

const StickyFooterFormScrollViewContext = createContext<StickyFooterFormScrollViewContextValue | null>(null);

type StickyFooterFormScrollViewRootProps = {
  children: React.ReactNode;
};

type StickyFooterFormScrollViewBodyProps = React.ComponentProps<typeof FormScrollView>;

type StickyFooterFormScrollViewFooterProps = ViewProps;

function Root({ children }: StickyFooterFormScrollViewRootProps) {
  const [footerHeight, setFooterHeight] = React.useState(0);

  return (
    <StickyFooterFormScrollViewContext
      value={{
        footerHeight,
        setFooterHeight,
      }}
    >
      <View className="flex-1 bg-background">{children}</View>
    </StickyFooterFormScrollViewContext>
  );
}

function Body({ contentContainerStyle, ...props }: StickyFooterFormScrollViewBodyProps) {
  const { footerHeight } = useStickyFooterFormScrollView();

  return (
    <FormScrollView
      contentContainerStyle={[contentContainerStyle, footerHeight > 0 ? { paddingBottom: footerHeight } : null]}
      {...props}
    />
  );
}

function Footer({ children, className, onLayout, ...props }: StickyFooterFormScrollViewFooterProps) {
  const { setFooterHeight } = useStickyFooterFormScrollView();

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setFooterHeight(nextHeight);
    onLayout?.(event);
  };

  return (
    <View className={cn("absolute right-0 bottom-0 left-0", className)} onLayout={handleLayout} {...props}>
      {children}
    </View>
  );
}

function useStickyFooterFormScrollView() {
  const context = use(StickyFooterFormScrollViewContext);

  if (!context) {
    throw new Error("StickyFooterFormScrollView components must be rendered within StickyFooterFormScrollView.Root.");
  }

  return context;
}

export const StickyFooterFormScrollView = {
  Root,
  Body,
  Footer,
};
