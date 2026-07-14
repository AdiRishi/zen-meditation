import {
  type RenderHookOptions,
  type RenderHookResult,
  type RenderOptions,
  render,
  renderHook,
} from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";
import { type Metrics, SafeAreaProvider } from "react-native-safe-area-context";

type RenderWithTestProvidersOptions = Omit<RenderOptions, "wrapper">;
type RenderHookWithTestProvidersOptions<TProps> = Omit<RenderHookOptions<TProps>, "wrapper">;

const DEFAULT_SAFE_AREA_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

export function createTestProviders() {
  function TestProviders({ children }: { children: ReactNode }) {
    return <SafeAreaProvider initialMetrics={DEFAULT_SAFE_AREA_METRICS}>{children}</SafeAreaProvider>;
  }

  return TestProviders;
}

export function renderWithTestProviders(ui: ReactElement, options: RenderWithTestProvidersOptions = {}) {
  const wrapper = createTestProviders();
  const result = render(ui, { ...options, wrapper });

  return result;
}

export function renderHookWithTestProviders<TResult, TProps>(
  renderCallback: (initialProps: TProps) => TResult,
  options: RenderHookWithTestProvidersOptions<TProps> = {},
): RenderHookResult<TResult, TProps> {
  const wrapper = createTestProviders();
  const result = renderHook(renderCallback, { ...options, wrapper });

  return result;
}
