import { ObservedRoute } from "@/components/observed-route";
import { RemindersScreen } from "@/screens/reminders-screen";

export default function Reminders() {
  return (
    <ObservedRoute>
      <RemindersScreen />
    </ObservedRoute>
  );
}
