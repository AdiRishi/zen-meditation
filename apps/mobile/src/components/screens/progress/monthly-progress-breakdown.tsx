import { View } from "react-native";

import { MossCard } from "@/components/ui/moss/moss-card";
import { MossIcon } from "@/components/ui/moss/moss-icon";
import { MossPressable } from "@/components/ui/moss/moss-pressable";
import { Typography } from "@/components/ui/typography";
import { fromLocalDateKey } from "@/domain/date-time";
import type { ProgressBucket } from "@/domain/progress";
import { useThemeColors } from "@/hooks/use-theme-colors";

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "short" });

function bucketRangeLabel(bucket: ProgressBucket) {
  const start = fromLocalDateKey(bucket.dateKey);
  const end = fromLocalDateKey(bucket.endDateKey);
  const month = MONTH_FORMATTER.format(start);

  return `${month} ${start.getDate()}–${end.getDate()}`;
}

function minuteLabel(minutes: number) {
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

type MonthlyProgressBreakdownProps = {
  buckets: ProgressBucket[];
  onOpenHistory(): void;
};

export function MonthlyProgressBreakdown({ buckets, onOpenHistory }: MonthlyProgressBreakdownProps) {
  const colors = useThemeColors();
  const maxMinutes = Math.max(...buckets.map((bucket) => bucket.minutes), 1);

  return (
    <MossPressable
      accessibilityLabel={`Minutes by week. ${buckets
        .map((bucket) => `${bucketRangeLabel(bucket)}, ${minuteLabel(bucket.minutes)}`)
        .join("; ")}`}
      accessibilityHint="Opens practice history"
      accessibilityRole="button"
      feedback="scale"
      pressedScale={0.98}
      className="rounded-[20px]"
      onPress={onOpenHistory}
    >
      <MossCard className="gap-6 p-5">
        <View className="flex-row items-center justify-between gap-3">
          <Typography variant="smallBold">Minutes by week</Typography>
          <View className="flex-row items-center gap-1">
            <Typography variant="label" tone="muted">
              History
            </Typography>
            <MossIcon name="forward" size={14} tintColor={colors.muted} />
          </View>
        </View>

        <View className="gap-5" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {buckets.map((bucket) => {
            const progress = bucket.minutes === 0 ? 0 : Math.max(0.08, bucket.minutes / maxMinutes);
            return (
              <View key={bucket.dateKey} className="gap-2">
                <View className="flex-row items-center justify-between gap-3">
                  <Typography variant="small" tone="muted" tabularNums>
                    {bucketRangeLabel(bucket)}
                  </Typography>
                  <Typography variant="smallBold" tabularNums>
                    {bucket.minutes} min
                  </Typography>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-surface-secondary">
                  <View className="h-full rounded-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
                </View>
              </View>
            );
          })}
        </View>
      </MossCard>
    </MossPressable>
  );
}
