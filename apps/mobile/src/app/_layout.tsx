import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from "@expo-google-fonts/geist";
import { Newsreader_400Regular, Newsreader_500Medium } from "@expo-google-fonts/newsreader";
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

void SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <HeroUINativeProvider>
            <GenericErrorScreen
              title="Something went wrong"
              message="We encountered an unexpected issue while processing your request. The application has logged this event."
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
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
