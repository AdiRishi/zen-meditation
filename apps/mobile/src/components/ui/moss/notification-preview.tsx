import { View } from "react-native";

import { Typography } from "../typography";
import { EnsoMark } from "./brand-assets";
import { MossCard } from "./moss-card";

export function NotificationPreview({ message = "Time for a quiet pause." }: { message?: string }) {
  return (
    <MossCard className="px-4 py-3">
      <View className="flex-row items-center gap-3">
        <EnsoMark size={40} />
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center justify-between">
            <Typography variant="label">MOSS</Typography>
            <Typography variant="caption" tone="muted">
              now
            </Typography>
          </View>
          <Typography variant="small" tone="muted">
            {message}
          </Typography>
        </View>
      </View>
    </MossCard>
  );
}
