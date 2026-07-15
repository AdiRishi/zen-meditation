import * as SplashScreen from "expo-splash-screen";
import { Button } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";

import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";
import { useAsyncAction } from "@/hooks/use-async-action";
import { confirmDeleteMossData } from "@/lib/confirm-delete-moss-data";

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
    confirmDeleteMossData(
      () =>
        void resetAction.run(async () => {
          await onReset();
        }),
    );
  };

  return (
    <StandardScrollView contentContainerClassName="justify-center gap-8 py-8">
      <View className="gap-3">
        <Typography accessibilityRole="header" variant="h1">
          Your practice data needs a moment.
        </Typography>
        <Typography tone="muted" selectable>
          Moss could not open its local storage. You can try again without changing anything.
        </Typography>
      </View>
      <View className="gap-3">
        <Button variant="primary" size="lg" isDisabled={resetAction.isPending} onPress={onRetry}>
          <Button.Label className="font-sans">Try again</Button.Label>
        </Button>
        <Button variant="outline" size="lg" isDisabled={resetAction.isPending} onPress={confirmReset}>
          <Button.Label className="font-sans">
            {resetAction.isPending ? "Deleting Moss data…" : "Delete All Moss Data"}
          </Button.Label>
        </Button>
        {resetAction.error ? (
          <Typography variant="small" tone="danger" align="center">
            Moss couldn’t finish deleting your data. Please try again.
          </Typography>
        ) : null}
        <Typography variant="caption" tone="muted" align="center">
          This permanently deletes settings and practice history stored on this device.
        </Typography>
      </View>
    </StandardScrollView>
  );
}
