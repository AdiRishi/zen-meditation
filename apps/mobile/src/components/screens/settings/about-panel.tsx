import { View } from "react-native";

import { Typography } from "@/components/ui/typography";
import { EnsoMark } from "@/components/ui/zen/brand-assets";
import { ZenCard } from "@/components/ui/zen/zen-card";

export function AboutPanel({ version }: { version: string }) {
  return (
    <View className="gap-8">
      <View className="items-center gap-3 pt-4">
        <EnsoMark size={88} />
        <View className="items-center gap-1">
          <Typography variant="h2" align="center">
            Zen
          </Typography>
          <Typography variant="small" tone="muted" align="center">
            A quiet rhythm for daily practice.
          </Typography>
        </View>
      </View>

      <ZenCard className="gap-2 px-5 py-5">
        <Typography variant="label" tone="muted">
          PRODUCT PROMISE
        </Typography>
        <Typography variant="h3">Support the practice without becoming the focus of it.</Typography>
      </ZenCard>

      <Typography variant="small" tone="muted" align="center" selectable>
        Version {version}
      </Typography>
    </View>
  );
}
