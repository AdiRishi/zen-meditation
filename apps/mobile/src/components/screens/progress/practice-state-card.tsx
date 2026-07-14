import { Pressable, View } from "react-native";

import { Typography } from "@/components/ui/typography";
import { LandscapeArtwork } from "@/components/ui/zen/brand-assets";
import { ZenCard } from "@/components/ui/zen/zen-card";

type PracticeStateCardProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  showArtwork?: boolean;
};

function StateAction({ label, onPress }: { label: string; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-11 min-w-24 items-center justify-center rounded-xl px-4"
      onPress={onPress}
    >
      <Typography variant="bodyBold">{label}</Typography>
    </Pressable>
  );
}

export function PracticeStateCard({
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  showArtwork = false,
}: PracticeStateCardProps) {
  return (
    <ZenCard accessibilityLiveRegion="polite" className="items-center gap-4 px-6 py-6">
      {showArtwork ? <LandscapeArtwork className="w-24 rounded-full" height={96} /> : null}
      <View className="items-center gap-1.5">
        <Typography variant="h3" align="center">
          {title}
        </Typography>
        <Typography variant="small" tone="muted" align="center">
          {message}
        </Typography>
      </View>
      {actionLabel && onAction ? <StateAction label={actionLabel} onPress={onAction} /> : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <Pressable
          accessibilityRole="button"
          className="min-h-11 items-center justify-center px-4"
          onPress={onSecondaryAction}
        >
          <Typography variant="small" tone="muted">
            {secondaryActionLabel}
          </Typography>
        </Pressable>
      ) : null}
    </ZenCard>
  );
}
