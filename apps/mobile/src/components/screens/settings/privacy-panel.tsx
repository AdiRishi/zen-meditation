import { View } from "react-native";

import { MossCard } from "@/components/ui/moss/moss-card";
import { Typography } from "@/components/ui/typography";

const PRIVACY_POINTS = [
  {
    title: "Stored on this device",
    description: "Your practice history, schedule, and preferences stay on this device.",
  },
  {
    title: "No account or ads",
    description: "Moss does not ask you to sign in, create a profile, or view advertising.",
  },
  {
    title: "Anonymous performance data",
    description:
      "Moss sends technical logs, crash reports, diagnostics, and performance data, never details about your practice.",
  },
] as const;

export function PrivacySummary() {
  return (
    <View className="gap-3">
      {PRIVACY_POINTS.map((point) => (
        <MossCard key={point.title} className="gap-1 px-4 py-4">
          <Typography variant="bodyBold">{point.title}</Typography>
          <Typography variant="small" tone="muted">
            {point.description}
          </Typography>
        </MossCard>
      ))}
    </View>
  );
}
