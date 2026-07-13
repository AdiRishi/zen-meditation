import * as SplashScreen from "expo-splash-screen";
import { Button } from "heroui-native";
import { useEffect } from "react";
import { Alert, View } from "react-native";

import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import { useAsyncAction } from "@/hooks/use-async-action";

type LocalDataErrorScreenProps = {
  onRetry(): void | Promise<void>;
  onReset(): void | Promise<void>;
};

export function LocalDataErrorScreen({ onRetry, onReset }: LocalDataErrorScreenProps) {
  const resetAction = useAsyncAction();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  const confirmReset = () => {
    Alert.alert(
      "Reset local data?",
      "Your practice history, schedule, reminders, and preferences will be removed from this device. This can’t be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Local Data",
          style: "destructive",
          onPress: () =>
            void resetAction.run(async () => {
              await onReset();
            }),
        },
      ],
    );
  };

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
        <Button variant="primary" size="lg" isDisabled={resetAction.isPending} onPress={onRetry}>
          <Button.Label className="font-sans">Try again</Button.Label>
        </Button>
        <Button variant="outline" size="lg" isDisabled={resetAction.isPending} onPress={confirmReset}>
          <Button.Label className="font-sans">
            {resetAction.isPending ? "Resetting local data…" : "Reset local data"}
          </Button.Label>
        </Button>
        {resetAction.error ? (
          <Typography variant="small" tone="danger" align="center">
            Your local data couldn’t be reset. Please try again.
          </Typography>
        ) : null}
        <Typography variant="caption" tone="muted" align="center">
          Reset removes settings and practice history stored on this device.
        </Typography>
      </View>
    </StandardScrollView>
  );
}
