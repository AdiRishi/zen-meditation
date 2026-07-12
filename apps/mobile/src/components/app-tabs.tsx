import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useThemeColors } from "@/hooks/use-theme-colors";

export function AppTabs() {
  const colors = useThemeColors();

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.accentSoft}
      tintColor={colors.accent}
      labelVisibilityMode="labeled"
      labelStyle={{
        default: { color: colors.muted },
        selected: { color: colors.accent },
      }}
    >
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} md="bar_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
