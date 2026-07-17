import { ObservedRoute } from "@/components/observed-route";
import { SessionCompleteScreen } from "@/screens/session-complete-screen";

export default function SessionComplete() {
  return (
    <ObservedRoute>
      <SessionCompleteScreen />
    </ObservedRoute>
  );
}
