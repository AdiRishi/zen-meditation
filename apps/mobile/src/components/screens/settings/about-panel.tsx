import { View } from "react-native";

import { EnsoMark } from "@/components/ui/moss/brand-assets";
import { MossCard } from "@/components/ui/moss/moss-card";
import { Typography } from "@/components/ui/typography";

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

      <MossCard className="gap-2 px-5 py-5">
        <Typography variant="eyebrow">Product promise</Typography>
        <Typography variant="h3">Support the practice without becoming the focus of it.</Typography>
      </MossCard>

      <Typography variant="small" tone="muted" align="center" selectable>
        Version {version}
      </Typography>
    </View>
  );
}
