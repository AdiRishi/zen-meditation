import { ObservedRoute } from "@/components/observed-route";
import { TodayScreen } from "@/screens/today-screen";

export default function Today() {
  return (
    <ObservedRoute>
      <TodayScreen />
    </ObservedRoute>
  );
}
