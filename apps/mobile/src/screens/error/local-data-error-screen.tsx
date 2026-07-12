import * as SplashScreen from "expo-splash-screen";
import { Button } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";

import { StandardView } from "@/components/ui/screen-containers/standard-view";
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
    <StandardView className="flex-1 justify-center gap-8">
      <View className="gap-3">
        <Typography accessibilityRole="header" variant="h1">
          Your practice data needs a moment.
        </Typography>
        <Typography tone="muted">
          Zen could not open its local storage. You can try again without changing anything.
        </Typography>
      </View>
      <View className="gap-3">
        <Button variant="primary" size="lg" onPress={onRetry}>
          <Button.Label>Try again</Button.Label>
        </Button>
        <Button variant="outline" size="lg" onPress={onReset}>
          <Button.Label>Reset local data</Button.Label>
        </Button>
        <Typography variant="caption" tone="muted" align="center">
          Reset removes settings and practice history stored on this device.
        </Typography>
      </View>
    </StandardView>
  );
}
