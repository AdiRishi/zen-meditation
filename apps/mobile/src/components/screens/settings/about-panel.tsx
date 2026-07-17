import { View } from "react-native";

import { EnsoMark } from "@/components/ui/moss/brand-assets";
import { Typography } from "@/components/ui/typography";

import { AppVersionLabel } from "./app-version-label";

export function AboutPanel({ version }: { version: string }) {
  return (
    <View className="gap-8">
      <View className="items-center gap-3 pt-4">
        <EnsoMark size={88} />
        <View className="items-center gap-1">
          <Typography variant="h2" align="center">
            Moss
          </Typography>
          <Typography variant="reflection" tone="muted" align="center" className="text-base leading-6">
            A quiet rhythm for daily practice.
          </Typography>
        </View>
      </View>

      <Typography variant="small" tone="muted" align="center" className="px-4">
        Moss is a small meditation timer for keeping a steady daily practice. There are no accounts, streaks, or
        feeds. Just your schedule, a timer, and a bell.
      </Typography>

      <AppVersionLabel version={version} />
    </View>
  );
}
