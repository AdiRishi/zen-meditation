import { Pressable, View } from "react-native";

import { Typography } from "@/components/ui/typography";
import { ZenCard } from "@/components/ui/zen/zen-card";
import { ZenIcon } from "@/components/ui/zen/zen-icon";
import type { ProgressBucket, ProgressMode } from "@/domain/progress";
import { useThemeColors } from "@/hooks/use-theme-colors";

const BAR_AREA_HEIGHT = 132;
const EMPTY_BAR_HEIGHT = 3;

function chartAccessibilityLabel(buckets: ProgressBucket[], mode: ProgressMode) {
  const period = mode === "week" ? "this week" : "this month";
  const values = buckets
    .map((bucket) => `${bucket.label}, ${bucket.minutes} ${bucket.minutes === 1 ? "minute" : "minutes"}`)
    .join("; ");
  return `Minutes ${period}. ${values}`;
}

type ProgressChartProps = {
  buckets: ProgressBucket[];
  mode: ProgressMode;
  onOpenHistory(): void;
};

export function ProgressChart({ buckets, mode, onOpenHistory }: ProgressChartProps) {
  const colors = useThemeColors();
  const maxMinutes = Math.max(...buckets.map((bucket) => bucket.minutes), 1);
  const peakMinutes = Math.max(...buckets.map((bucket) => bucket.minutes), 0);

  return (
    <Pressable
      accessibilityLabel={chartAccessibilityLabel(buckets, mode)}
      accessibilityHint="Opens practice history"
      accessibilityRole="button"
      className="rounded-[20px]"
      onPress={onOpenHistory}
    >
      <ZenCard className="gap-6 p-5">
        <View className="flex-row items-center justify-between gap-3">
          <Typography variant="smallBold">Minutes this {mode}</Typography>
          <View className="flex-row items-center gap-1">
            <Typography variant="label" tone="muted">
              History
            </Typography>
            <ZenIcon name="forward" size={14} tintColor={colors.muted} />
          </View>
        </View>

        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <View className="flex-row items-end justify-between gap-3">
            {buckets.map((bucket) => {
              const isPeak = bucket.minutes > 0 && bucket.minutes === peakMinutes;
              const barHeight =
                bucket.minutes > 0 ? Math.max(10, (bucket.minutes / maxMinutes) * BAR_AREA_HEIGHT) : EMPTY_BAR_HEIGHT;
              return (
                <View key={bucket.dateKey} className="flex-1 items-center gap-2">
                  <View className="w-full items-center justify-end gap-1.5" style={{ height: BAR_AREA_HEIGHT + 20 }}>
                    {bucket.minutes > 0 ? (
                      <Typography variant="caption" tone="muted" align="center" tabularNums>
                        {bucket.minutes}
                      </Typography>
                    ) : null}
                    <View
                      className={`w-full max-w-6 rounded-full ${
                        bucket.minutes > 0 ? (isPeak ? "bg-accent" : "bg-accent-soft") : "bg-surface-secondary"
                      }`}
                      style={{ height: barHeight }}
                    />
                  </View>
                  <Typography variant="caption" tone="muted" align="center" tabularNums>
                    {bucket.label}
                  </Typography>
                </View>
              );
            })}
          </View>
        </View>
      </ZenCard>
    </Pressable>
  );
}
