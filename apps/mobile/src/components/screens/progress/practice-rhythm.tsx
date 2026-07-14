import { View } from "react-native";

import { Typography } from "@/components/ui/typography";
import { fromLocalDateKey } from "@/domain/date-time";
import type { ProgressBucket, ProgressMode } from "@/domain/progress";

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const MONTH_BUCKET_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
});

function bucketAccessibilityLabel(bucket: ProgressBucket, index: number, mode: ProgressMode) {
  const period =
    mode === "week"
      ? WEEKDAY_NAMES[index]
      : `Week beginning ${MONTH_BUCKET_FORMATTER.format(fromLocalDateKey(bucket.dateKey))}`;
  const minutesPracticed = `${bucket.minutes} ${bucket.minutes === 1 ? "minute" : "minutes"} practiced`;
  const status = bucket.minutes > 0 ? minutesPracticed : "no practice recorded";

  return `${period}, ${status}`;
}

type PracticeRhythmProps = {
  buckets: ProgressBucket[];
  mode: ProgressMode;
};

export function PracticeRhythm({ buckets, mode }: PracticeRhythmProps) {
  return (
    <View
      accessibilityLabel={mode === "week" ? "This week’s practice rhythm" : "This month’s practice rhythm"}
      accessibilityRole="summary"
      className="flex-row justify-between gap-2"
    >
      {buckets.map((bucket, index) => (
        <View
          key={bucket.dateKey}
          accessible
          accessibilityLabel={bucketAccessibilityLabel(bucket, index, mode)}
          className="flex-1 items-center gap-2"
        >
          <Typography variant="label" tone="muted" align="center" tabularNums>
            {bucket.label}
          </Typography>
          <View
            className={`size-10 rounded-full ${bucket.completed ? "border-2 border-accent" : "border border-stone"}`}
          />
        </View>
      ))}
    </View>
  );
}
