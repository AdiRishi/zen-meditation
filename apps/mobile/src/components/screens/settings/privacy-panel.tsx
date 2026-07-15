import { View } from "react-native";

import { MossCard } from "@/components/ui/moss/moss-card";
import { Typography } from "@/components/ui/typography";

const PRIVACY_POINTS = [
  {
    title: "Stored on this device",
    description: "Your practice history, schedule, and preferences stay on this device.",
  },
  {
    title: "No account",
    description: "Moss does not ask you to sign in or create a profile.",
  },
  {
    title: "No tracking",
    description: "Moss does not track your activity or send analytics about your practice.",
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
