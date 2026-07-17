/* eslint-disable @typescript-eslint/no-require-imports */

import { fireEvent, waitFor } from "@testing-library/react-native";
import { createNotifications, renderMeditationScreen } from "@tests/testing-utils/render-meditation-screen";

import { ScheduleScreen } from "@/screens/schedule-screen";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => React.createElement(View, props),
  };
});

describe("<ScheduleScreen />", () => {
  it("saves a changed weekly intention and optional practice times", async () => {
    const notifications = createNotifications();
    const { findByText, getByLabelText, getByTestId, getByText, store } = renderMeditationScreen(<ScheduleScreen />, {
      notifications,
    });

    await findByText("Practice days");
    fireEvent.press(getByLabelText("Saturday"));
    fireEvent.press(getByLabelText("Increase sessions per day"));
    fireEvent(
      getByTestId("schedule.morning.time"),
      "onValueChange",
      { nativeEvent: { timestamp: 0 } },
      new Date(2026, 0, 1, 8, 15),
    );
    fireEvent(getByLabelText("Evening practice time"), "valueChange", false);
    fireEvent.press(getByLabelText("Add a practice time"));
    fireEvent.press(getByText("Save"));

    await waitFor(async () => {
      await expect(store.loadPreferences()).resolves.toMatchObject({
        selectedWeekdays: [1, 2, 3, 4, 5, 6],
        sessionsPerDay: 2,
        practiceTimes: [
          expect.objectContaining({ id: "morning", hour: 8, minute: 15, enabled: true }),
          expect.objectContaining({ id: "evening", enabled: false }),
          expect.objectContaining({
            id: expect.stringMatching(/^practice-/),
            label: "Practice 3",
            hour: 12,
            minute: 0,
            enabled: true,
          }),
        ],
      });
    });
    expect(notifications.rescheduleWeeklyReminders).toHaveBeenCalledWith(
      expect.objectContaining({ sessionsPerDay: 2 }),
    );
  });
});
