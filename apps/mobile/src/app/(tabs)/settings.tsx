import { ObservedRoute } from "@/components/observed-route";
import { SettingsScreen } from "@/screens/settings-screen";

export default function Settings() {
  return (
    <ObservedRoute>
      <SettingsScreen />
    </ObservedRoute>
  );
}
