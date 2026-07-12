import SegmentedControl from "@react-native-segmented-control/segmented-control";

import type { ProgressMode } from "@/domain/progress";

type ProgressPeriodControlProps = {
  mode: ProgressMode;
  onChange(mode: ProgressMode): void;
};

export function ProgressPeriodControl({ mode, onChange }: ProgressPeriodControlProps) {
  return (
    <SegmentedControl
      values={["Week", "Month"]}
      selectedIndex={mode === "week" ? 0 : 1}
      onChange={({ nativeEvent }) => onChange(nativeEvent.selectedSegmentIndex === 0 ? "week" : "month")}
      accessibilityLabel="Progress period"
      fontStyle={{ fontFamily: "Geist_400Regular", fontSize: 14 }}
      activeFontStyle={{ fontFamily: "Geist_500Medium", fontSize: 14 }}
      style={{ alignSelf: "center", height: 44, width: "72%" }}
    />
  );
}
