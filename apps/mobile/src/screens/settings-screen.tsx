import { type Href, useRouter } from "expo-router";

import { SettingsScreenLayout } from "@/components/screens/settings/settings-layout";
import { SettingsMenu } from "@/components/screens/settings/settings-menu";

export function SettingsScreen() {
  const router = useRouter();

  return (
    <SettingsScreenLayout title="Settings" showBack={false}>
      <SettingsMenu onNavigate={(href) => router.push(href as Href)} />
    </SettingsScreenLayout>
  );
}
