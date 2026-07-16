import type { ErrorBoundaryProps } from "expo-router";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppProviders } from "@/components/app-providers";
import { AppThemeProvider } from "@/components/app-theme-provider";
import { MeditationDataBoundary } from "@/components/meditation-data-boundary";
import "@/global.css";
import { useMeditation } from "@/providers/meditation-provider";
import { GenericErrorScreen } from "@/screens/error/generic-error-screen";
import { configureForegroundNotificationHandling } from "@/services/local-notifications";

void SplashScreen.preventAutoHideAsync();
configureForegroundNotificationHandling();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider>
          <AppThemeProvider>
            <GenericErrorScreen
              title="Something went wrong"
              message="Moss ran into an unexpected issue. Your practice data remains on this device."
              errorDetails={{ status: error.message }}
              onRetry={retry}
            />
          </AppThemeProvider>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { isReady, reducedMotion } = useMeditation();

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  return (
    <MeditationDataBoundary>
      <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? "fade" : "default" }}>
        <Stack.Screen name="meditation" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="session-complete" options={{ animation: "fade", gestureEnabled: false }} />
      </Stack>
    </MeditationDataBoundary>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <RootNavigator />
      </AppProviders>
    </GestureHandlerRootView>
  );
}
