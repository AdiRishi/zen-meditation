import { ObservedRoute } from "@/components/observed-route";
import { PracticeHistoryScreen } from "@/screens/practice-history-screen";

export default function PracticeHistory() {
  return (
    <ObservedRoute>
      <PracticeHistoryScreen />
    </ObservedRoute>
  );
}
