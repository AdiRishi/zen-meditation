import { createContext, type ReactNode, use, useMemo, useState } from "react";

type ScreenFooterContextValue = {
  footerHeight: number;
  setFooterHeight: (height: number) => void;
};

const ScreenFooterContext = createContext<ScreenFooterContextValue | null>(null);

export function ScreenFooterProvider({ children }: { children: ReactNode }) {
  const [footerHeight, setFooterHeight] = useState(0);
  const value = useMemo(() => ({ footerHeight, setFooterHeight }), [footerHeight]);

  return <ScreenFooterContext value={value}>{children}</ScreenFooterContext>;
}

/** Height of the pinned screen footer, or 0 when the screen has none. */
export function useScreenFooterHeight() {
  return use(ScreenFooterContext)?.footerHeight ?? 0;
}

export function useScreenFooterControls() {
  const context = use(ScreenFooterContext);

  if (!context) {
    throw new Error("Screen footers must be rendered within StickyFooterScrollView.Root.");
  }

  return context;
}
