import { useObserve } from "expo-observe";
import { useEffect, type ReactNode } from "react";

type ObservedRouteProps = {
  children: ReactNode;
};

export function ObservedRoute({ children }: ObservedRouteProps) {
  const { markInteractive } = useObserve();

  useEffect(() => {
    const frame = requestAnimationFrame(() => markInteractive());
    return () => cancelAnimationFrame(frame);
  }, [markInteractive]);

  return children;
}
