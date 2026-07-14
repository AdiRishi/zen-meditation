import { Alert } from "react-native";

export function confirmDeleteZenData(onConfirm: () => void) {
  Alert.alert(
    "Delete all Zen data?",
    "This permanently deletes your practice history, active session, schedule, reminders, and settings from this device. This can’t be undone.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete All Zen Data", style: "destructive", onPress: onConfirm },
    ],
  );
}
