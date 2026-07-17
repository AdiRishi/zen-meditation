import SegmentedControl from "@react-native-segmented-control/segmented-control";

import type { ProgressMode } from "@/domain/progress";

type ProgressPeriodControlProps = {
  mode: ProgressMode;
  monthLabel: string;
  onChange(mode: ProgressMode): void;
};

export function ProgressPeriodControl({ mode, monthLabel, onChange }: ProgressPeriodControlProps) {
  return (
    <SegmentedControl
      values={["Week", monthLabel]}
      selectedIndex={mode === "week" ? 0 : 1}
      onChange={({ nativeEvent }) => onChange(nativeEvent.selectedSegmentIndex === 0 ? "week" : "month")}
      accessibilityLabel="Progress period"
      fontStyle={
        process.env.EXPO_OS === "ios"
          ? { fontFamily: "Geist-Regular", fontSize: 14 }
          : { fontFamily: "Geist", fontSize: 14, fontWeight: "400" }
      }
      activeFontStyle={
        process.env.EXPO_OS === "ios"
          ? { fontFamily: "Geist-Medium", fontSize: 14 }
          : { fontFamily: "Geist", fontSize: 14, fontWeight: "500" }
      }
      style={{ alignSelf: "center", height: 44, width: "72%" }}
    />
  );
}
