import * as SplashScreen from "expo-splash-screen";
import { Button } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";

import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";

type LocalDataErrorScreenProps = {
  onRetry(): void;
  onReset(): void;
};

export function LocalDataErrorScreen({ onRetry, onReset }: LocalDataErrorScreenProps) {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <StandardScrollView contentContainerClassName="min-h-full justify-center gap-8 py-8">
      <View className="gap-3">
        <Typography accessibilityRole="header" variant="h1">
          Your practice data needs a moment.
        </Typography>
        <Typography tone="muted" selectable>
          Zen could not open its local storage. You can try again without changing anything.
        </Typography>
      </View>
      <View className="gap-3">
        <Button variant="primary" size="lg" onPress={onRetry}>
          <Button.Label className="font-sans">Try again</Button.Label>
        </Button>
        <Button variant="outline" size="lg" onPress={onReset}>
          <Button.Label className="font-sans">Reset local data</Button.Label>
        </Button>
        <Typography variant="caption" tone="muted" align="center">
          Reset removes settings and practice history stored on this device.
        </Typography>
      </View>
    </StandardScrollView>
  );
}
