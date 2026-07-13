import { NavigationBar } from "expo-navigation-bar";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { useUniwind } from "uniwind";

import { useThemeColors } from "@/hooks/use-theme-colors";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useUniwind();
  const colors = useThemeColors();
  const nativeTheme = theme === "dark" ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...nativeTheme,
        colors: {
          ...nativeTheme.colors,
          primary: colors.accent,
          background: colors.background,
          card: colors.surface,
          text: colors.foreground,
          border: colors.border,
          notification: colors.accent,
        },
      }}
    >
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <NavigationBar style={theme === "dark" ? "light" : "dark"} />
      {children}
    </ThemeProvider>
  );
}
