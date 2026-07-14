import Constants from "expo-constants";

import { AboutPanel } from "@/components/screens/settings/about-panel";
import { SettingsScreenLayout } from "@/components/screens/settings/settings-layout";

export function AboutScreen() {
  return (
    <SettingsScreenLayout title="About">
      <AboutPanel version={Constants.expoConfig?.version ?? "1.0.0"} />
    </SettingsScreenLayout>
  );
}
