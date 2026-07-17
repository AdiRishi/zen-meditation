import { ObservedRoute } from "@/components/observed-route";
import { SessionSetupScreen } from "@/screens/session-setup-screen";

export default function SessionSetup() {
  return (
    <ObservedRoute>
      <SessionSetupScreen />
    </ObservedRoute>
  );
}
