import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";
import { Newsreader_400Regular } from "@expo-google-fonts/newsreader/400Regular";
import { Newsreader_500Medium } from "@expo-google-fonts/newsreader/500Medium";
import { useFonts } from "expo-font";
import type { ErrorBoundaryProps } from "expo-router";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppProviders } from "@/components/app-providers";
import "@/global.css";
import { GenericErrorScreen } from "@/screens/error/generic-error-screen";
import { configureForegroundNotificationHandling } from "@/services/local-notifications";

void SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <HeroUINativeProvider>
            <GenericErrorScreen
              title="Something went wrong"
              message="Zen ran into an unexpected issue. Your practice data remains on this device."
              errorDetails={{ status: error.message }}
              onRetry={retry}
            />
          </HeroUINativeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Newsreader_400Regular,
    Newsreader_500Medium,
  });

  useEffect(() => {
    configureForegroundNotificationHandling();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
          <Stack.Screen name="meditation" options={{ gestureEnabled: false }} />
          <Stack.Screen name="session-complete" options={{ gestureEnabled: false }} />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
