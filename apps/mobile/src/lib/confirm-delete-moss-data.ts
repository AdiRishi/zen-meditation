import { Alert } from "react-native";

export function confirmDeleteMossData(onConfirm: () => void) {
  Alert.alert(
    "Delete all Moss data?",
    "This permanently deletes your practice history, active session, schedule, reminders, and settings from this device. This can’t be undone.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete All Moss Data", style: "destructive", onPress: onConfirm },
    ],
  );
}
