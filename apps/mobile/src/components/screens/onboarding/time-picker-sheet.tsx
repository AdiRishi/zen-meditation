import DateTimePicker from "@react-native-community/datetimepicker";
import { Modal, View } from "react-native";

import { AndroidTimePickerControl } from "@/components/screens/onboarding/android-time-picker-control";
import { ScreenContainerScopeProvider } from "@/components/ui/screen-containers/screen-container-scope";
import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";
import { Typography } from "@/components/ui/typography";
import { ZenPrimaryButton, ZenSecondaryButton } from "@/components/ui/zen/zen-button";
import { dateForPracticeTime } from "@/domain/date-time";
import type { PracticeTime } from "@/domain/meditation";
import { useMeditation } from "@/providers/meditation-provider";

type TimePickerSheetProps = {
  practiceTime: PracticeTime;
  onChange: (practiceTime: PracticeTime) => void;
  onClose: () => void;
};

export function TimePickerSheet({ practiceTime, onChange, onClose }: TimePickerSheetProps) {
  const { reducedMotion } = useMeditation();

  const value = dateForPracticeTime(practiceTime);

  return (
    <Modal
      visible
      animationType={reducedMotion ? "none" : "slide"}
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <ScreenContainerScopeProvider scope="contained">
        <StickyFooterScrollView.Root>
          <StickyFooterScrollView.Body contentContainerClassName="gap-6 pt-8">
            <View className="gap-6">
              <Typography accessibilityRole="header" variant="h2" align="center">
                {practiceTime.label}
              </Typography>
              {process.env.EXPO_OS === "android" ? (
                <AndroidTimePickerControl practiceTime={practiceTime} onChange={onChange} />
              ) : (
                <DateTimePicker
                  testID="onboarding.time-picker"
                  value={value}
                  mode="time"
                  display="spinner"
                  minuteInterval={5}
                  onValueChange={(_, date) =>
                    onChange({ ...practiceTime, hour: date.getHours(), minute: date.getMinutes(), enabled: true })
                  }
                />
              )}
            </View>
          </StickyFooterScrollView.Body>
          <StickyFooterScrollView.Footer>
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
          </StickyFooterScrollView.Footer>
        </StickyFooterScrollView.Root>
      </ScreenContainerScopeProvider>
    </Modal>
  );
}
