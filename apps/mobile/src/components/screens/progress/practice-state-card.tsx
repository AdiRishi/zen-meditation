import { Pressable, View } from "react-native";

import { BreathingField } from "@/components/ui/moss/shaders/breathing-field";
import { Typography } from "@/components/ui/typography";
import { useMeditation } from "@/providers/meditation-provider";

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
      <Typography variant="bodyBold" tone="accent">
        {label}
      </Typography>
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
  const { reducedMotion } = useMeditation();

  return (
    <View accessibilityLiveRegion="polite" className="items-center gap-4 px-6 py-8">
      {showArtwork ? <BreathingField reducedMotion={reducedMotion} ending={false} size={108} /> : null}
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
    </View>
  );
}
