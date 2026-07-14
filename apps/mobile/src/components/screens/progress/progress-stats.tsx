import { View } from "react-native";

import { Typography } from "@/components/ui/typography";
import type { ProgressSummary } from "@/domain/progress";

type ProgressStatsProps = Pick<ProgressSummary, "sessions" | "minutes" | "dayRhythm">;

function ProgressStat({ label, value }: { label: string; value: number }) {
  return (
    <View accessible accessibilityLabel={`${label}, ${value}`} className="min-w-0 flex-1 items-center gap-1 px-1">
      <Typography variant="h2" align="center" tabularNums>
        {value}
      </Typography>
      <Typography variant="small" tone="muted" align="center">
        {label}
      </Typography>
    </View>
  );
}

export function ProgressStats({ sessions, minutes, dayRhythm }: ProgressStatsProps) {
  return (
    <View className="flex-row items-stretch py-1">
      <ProgressStat label="Sessions" value={sessions} />
      <View className="w-px bg-separator" />
      <ProgressStat label="Minutes" value={minutes} />
      <View className="w-px bg-separator" />
      <ProgressStat label="Day rhythm" value={dayRhythm} />
    </View>
  );
}
