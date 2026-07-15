import { View } from "react-native";

import { Typography } from "@/components/ui/typography";
import { SessionRing } from "@/components/ui/zen/session-ring";
import { fromLocalDateKey } from "@/domain/date-time";
import type { ProgressBucket, ProgressMode } from "@/domain/progress";

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const MONTH_BUCKET_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
});

/** Partial practice draws part of the circle; only a completed day closes it to the ensō gap. */
const PARTIAL_SWEEP_LIMIT = 0.72;

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

function bucketRingProgress(bucket: ProgressBucket, maxMinutes: number) {
  if (bucket.completed) {
    return 1;
  }
  if (bucket.minutes <= 0) {
    return 0;
  }
  return Math.max(0.12, (bucket.minutes / maxMinutes) * PARTIAL_SWEEP_LIMIT);
}

export function PracticeRhythm({ buckets, mode }: PracticeRhythmProps) {
  const maxMinutes = Math.max(...buckets.map((bucket) => bucket.minutes), 1);

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
          className="flex-1 items-center"
        >
          <SessionRing size={42} strokeWidth={2} progress={bucketRingProgress(bucket, maxMinutes)}>
            <Typography
              variant="smallBold"
              align="center"
              tabularNums
              className={
                bucket.completed ? "text-accent" : bucket.minutes > 0 ? "text-foreground" : "text-muted opacity-60"
              }
            >
              {bucket.label}
            </Typography>
          </SessionRing>
        </View>
      ))}
    </View>
  );
}
