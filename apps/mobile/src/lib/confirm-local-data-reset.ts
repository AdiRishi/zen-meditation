import { Alert } from "react-native";

export function confirmLocalDataReset(onConfirm: () => void) {
  Alert.alert(
    "Reset local data?",
    "Your practice history, schedule, reminders, and preferences will be removed from this device. This can’t be undone.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Reset Local Data", style: "destructive", onPress: onConfirm },
    ],
  );
}
