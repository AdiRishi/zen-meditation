import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithSafeArea } from "@tests/testing-utils/render-meditation-screen";

import { AndroidTimePickerControl } from "@/components/screens/onboarding/android-time-picker-control";
import type { PracticeTime } from "@/domain/meditation";

jest.mock("@react-native-community/datetimepicker", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    default: ({
      onDismiss,
      onValueChange,
      testID,
    }: {
      onDismiss: () => void;
      onValueChange: (event: unknown, date: Date) => void;
      testID?: string;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          Pressable,
          {
            testID,
            onPress: () => onValueChange({}, new Date(2026, 0, 1, 8, 35)),
          },
          React.createElement(Text, null, "Select native time"),
        ),
        React.createElement(Pressable, { onPress: onDismiss }, React.createElement(Text, null, "Dismiss native time")),
      ),
  };
});

const PRACTICE_TIME: PracticeTime = {
  id: "morning",
  label: "Morning",
  hour: 7,
  minute: 0,
  enabled: true,
  reminderLeadMinutes: 10,
};

describe("AndroidTimePickerControl", () => {
  it("unmounts the native dialog after selection and lets the user reopen it", async () => {
    const onChange = jest.fn();
    const { getByTestId, getByText, queryByTestId } = renderWithSafeArea(
      <AndroidTimePickerControl practiceTime={PRACTICE_TIME} onChange={onChange} />,
    );

    await waitFor(() => getByTestId("onboarding.time-picker"));
    fireEvent.press(getByTestId("onboarding.time-picker"));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hour: 8, minute: 35, enabled: true }));
    expect(queryByTestId("onboarding.time-picker")).toBeNull();

    fireEvent.press(getByText("Change time"));
    getByTestId("onboarding.time-picker");
  });

  it("unmounts a dismissed dialog without changing the practice time", async () => {
    const onChange = jest.fn();
    const { getByTestId, getByText, queryByTestId } = renderWithSafeArea(
      <AndroidTimePickerControl practiceTime={PRACTICE_TIME} onChange={onChange} />,
    );

    await waitFor(() => getByTestId("onboarding.time-picker"));
    fireEvent.press(getByText("Dismiss native time"));

    expect(onChange).not.toHaveBeenCalled();
    expect(queryByTestId("onboarding.time-picker")).toBeNull();
    expect(getByText("Change time")).toBeOnTheScreen();
  });
});
