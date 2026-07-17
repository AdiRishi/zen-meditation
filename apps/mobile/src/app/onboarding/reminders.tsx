import { ObservedRoute } from "@/components/observed-route";
import { ReminderPermissionScreen } from "@/screens/onboarding/reminder-permission-screen";

export default function Reminders() {
  return (
    <ObservedRoute>
      <ReminderPermissionScreen />
    </ObservedRoute>
  );
}
