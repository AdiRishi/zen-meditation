import { SymbolView } from "expo-symbols";
import { Card, useThemeColor } from "heroui-native";
import { View } from "react-native";

import { MossPrimaryButton, MossSecondaryButton } from "@/components/ui/moss/moss-button";
import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { Typography } from "@/components/ui/typography";

type ErrorDetails = {
  code?: string | number;
  status?: string;
};

type GenericErrorScreenProps = {
  title?: string;
  message?: string;
  errorDetails?: ErrorDetails;
  onRetry?: () => void;
  onGoHome?: () => void;
};

export function GenericErrorScreen({
  title = "Something went wrong",
  message = "We encountered an unexpected issue while processing your request.",
  errorDetails,
  onRetry,
  onGoHome,
}: GenericErrorScreenProps) {
  const danger = useThemeColor("danger");

  return (
    <StandardScrollView contentContainerClassName="items-center justify-center gap-6 py-8">
      <View className="size-24 items-center justify-center rounded-full bg-danger/10">
        <SymbolView
          name={{ ios: "exclamationmark.triangle", android: "warning", web: "warning" }}
          size={40}
          tintColor={danger}
        />
      </View>

      <View className="items-center gap-2">
        <Typography accessibilityRole="header" variant="h2" align="center">
          {title}
        </Typography>
        <Typography variant="small" tone="muted" align="center" className="max-w-75" selectable>
          {message}
        </Typography>
      </View>

      {errorDetails && (
        <Card variant="tertiary" className="w-full max-w-[320px] p-0">
          <Card.Body className="gap-2 p-3">
            <View className="flex-row items-center gap-1.5">
              <SymbolView
                name={{ ios: "terminal", android: "terminal", web: "terminal" }}
                size={14}
                tintColor={danger}
              />
              <Typography variant="caption" tone="danger" className="font-semibold uppercase">
                Error details
              </Typography>
            </View>
            {errorDetails.code != null && (
              <View className="flex-row justify-between">
                <Typography variant="caption">Code</Typography>
                <Typography variant="code" tone="danger">
                  {errorDetails.code}
                </Typography>
              </View>
            )}
            {errorDetails.status != null && (
              <View className="flex-row justify-between">
                <Typography variant="caption">Status</Typography>
                <Typography variant="code" numberOfLines={2} className="ml-4 shrink text-right" selectable>
                  {errorDetails.status}
                </Typography>
              </View>
            )}
          </Card.Body>
        </Card>
      )}

      <View className="mt-2 w-full max-w-[320px] gap-3">
        {onRetry && <MossPrimaryButton onPress={onRetry}>Try again</MossPrimaryButton>}
        {onGoHome &&
          (onRetry ? (
            <MossSecondaryButton onPress={onGoHome}>Go home</MossSecondaryButton>
          ) : (
            <MossPrimaryButton onPress={onGoHome}>Go home</MossPrimaryButton>
          ))}
      </View>
    </StandardScrollView>
  );
}
