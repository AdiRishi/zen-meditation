import { View } from "react-native";

import { MossCard } from "@/components/ui/moss/moss-card";
import { Typography } from "@/components/ui/typography";

const PRIVACY_POINTS = [
  {
    title: "Stored on this device",
    description: "Your practice history, schedule, and preferences stay on this device.",
  },
  {
    title: "No account, no ads",
    description: "You don’t need to sign in, and Moss doesn’t show advertising.",
  },
  {
    title: "Crash reports and diagnostics",
    description: "Moss sends anonymous technical reports to help fix bugs. They never include your practice history.",
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
