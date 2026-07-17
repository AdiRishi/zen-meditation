import { View } from "react-native";

import { Typography } from "@/components/ui/typography";
import type { ProgressSummary } from "@/domain/progress";

type MonthlyPracticeSummaryProps = Pick<ProgressSummary, "sessions" | "minutes" | "practiceDays">;

function sessionLabel(sessions: number) {
  return `${sessions} ${sessions === 1 ? "session" : "sessions"}`;
}

function practiceDayLabel(practiceDays: number) {
  return `${practiceDays} practice ${practiceDays === 1 ? "day" : "days"}`;
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}

export function MonthlyPracticeSummary({ sessions, minutes, practiceDays }: MonthlyPracticeSummaryProps) {
  const sessionsText = sessionLabel(sessions);
  const durationText = durationLabel(minutes);
  const practiceDaysText = practiceDayLabel(practiceDays);

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${sessionsText}, ${durationText}, across ${practiceDaysText}`}
      className="items-center gap-1 py-2"
    >
      <Typography variant="h3" align="center" tabularNums>
        {sessionsText} · {durationText}
      </Typography>
      <Typography variant="small" tone="muted" align="center" tabularNums>
        Across {practiceDaysText}
      </Typography>
    </View>
  );
}
