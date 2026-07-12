import DateTimePicker from "@react-native-community/datetimepicker";
import { Modal, View } from "react-native";

import { Typography } from "@/components/ui/typography";
import { ZenPrimaryButton, ZenSecondaryButton } from "@/components/ui/zen/zen-button";
import type { PracticeTime } from "@/domain/meditation";

type TimePickerSheetProps = {
  practiceTime: PracticeTime | null;
  onChange: (practiceTime: PracticeTime) => void;
  onClose: () => void;
};

export function TimePickerSheet({ practiceTime, onChange, onClose }: TimePickerSheetProps) {
  if (!practiceTime) {
    return null;
  }

  const value = new Date(2026, 0, 1, practiceTime.hour, practiceTime.minute);

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View className="flex-1 justify-between gap-6 bg-background px-6 pt-8 pb-6">
        <View className="gap-6">
          <Typography accessibilityRole="header" variant="h2" align="center">
            {practiceTime.label}
          </Typography>
          <DateTimePicker
            value={value}
            mode="time"
            display="spinner"
            minuteInterval={5}
            onChange={(_, date) => {
              if (date) {
                onChange({ ...practiceTime, hour: date.getHours(), minute: date.getMinutes(), enabled: true });
              }
            }}
          />
        </View>
        <View className="gap-3">
          <ZenPrimaryButton onPress={onClose}>Done</ZenPrimaryButton>
          <ZenSecondaryButton
            onPress={() => {
              onChange({ ...practiceTime, enabled: false });
              onClose();
            }}
          >
            Keep this time flexible
          </ZenSecondaryButton>
        </View>
      </View>
    </Modal>
  );
}
