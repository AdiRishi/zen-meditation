import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { View } from "react-native";

import { Typography } from "@/components/ui/typography";
import { ZenSecondaryButton } from "@/components/ui/zen/zen-button";
import { dateForPracticeTime, formatPracticeTime } from "@/domain/date-time";
import type { PracticeTime } from "@/domain/meditation";

type AndroidTimePickerControlProps = {
  practiceTime: PracticeTime;
  onChange: (practiceTime: PracticeTime) => void;
};

export function AndroidTimePickerControl({ practiceTime, onChange }: AndroidTimePickerControlProps) {
  const [isOpen, setIsOpen] = useState(true);
  const value = dateForPracticeTime(practiceTime);

  return (
    <View className="items-center gap-4">
      <Typography variant="h3" tabularNums>
        {formatPracticeTime(practiceTime)}
      </Typography>
      {isOpen ? (
        <DateTimePicker
          testID="onboarding.time-picker"
          value={value}
          mode="time"
          display="default"
          minuteInterval={5}
          onDismiss={() => setIsOpen(false)}
          onValueChange={(_, date) => {
            setIsOpen(false);
            onChange({
              ...practiceTime,
              hour: date.getHours(),
              minute: date.getMinutes(),
              enabled: true,
            });
          }}
        />
      ) : (
        <ZenSecondaryButton onPress={() => setIsOpen(true)}>Change time</ZenSecondaryButton>
      )}
    </View>
  );
}
