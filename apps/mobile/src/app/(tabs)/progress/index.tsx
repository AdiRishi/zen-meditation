import { ObservedRoute } from "@/components/observed-route";
import { ProgressScreen } from "@/screens/progress-screen";

export default function Progress() {
  return (
    <ObservedRoute>
      <ProgressScreen />
    </ObservedRoute>
  );
}
