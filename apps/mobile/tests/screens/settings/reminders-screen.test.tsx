/* eslint-disable @typescript-eslint/no-require-imports */

import { fireEvent, waitFor } from "@testing-library/react-native";
import { InMemoryMeditationStore } from "@tests/testing-utils/in-memory-meditation-store";
import {
  createNotifications,
  notificationPermission,
  renderMeditationScreen,
} from "@tests/testing-utils/render-meditation-screen";

import { DEFAULT_PREFERENCES } from "@/domain/meditation";
import { RemindersScreen } from "@/screens/reminders-screen";

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

describe("<RemindersScreen />", () => {
  it("requests permission once and schedules the saved reminder choices", async () => {
    const notifications = createNotifications("undetermined");
    const { findByText, getByLabelText, getByTestId, getByText, store } = renderMeditationScreen(<RemindersScreen />, {
      notifications,
    });

    await findByText("Reminder timing");
    fireEvent(getByLabelText("Practice reminders"), "valueChange", true);
    fireEvent.press(getByLabelText("Evening, 15 min before"));
    fireEvent(
      getByTestId("reminders.quiet-hours.start"),
      "onValueChange",
      { nativeEvent: { timestamp: 0 } },
      new Date(2026, 0, 1, 22, 30),
    );
    fireEvent.press(getByText("Save"));

    await waitFor(() => expect(notifications.requestPermission).toHaveBeenCalledTimes(1));
    await waitFor(async () => {
      await expect(store.loadPreferences()).resolves.toMatchObject({
        remindersEnabled: true,
        quietHours: { startMinute: 22 * 60 + 30, endMinute: 7 * 60 },
        practiceTimes: expect.arrayContaining([expect.objectContaining({ id: "evening", reminderLeadMinutes: 15 })]),
      });
    });
    expect(notifications.rescheduleWeeklyReminders).toHaveBeenCalledWith(
      expect.objectContaining({ remindersEnabled: true }),
    );
  });

  it("keeps denied permission calm and preserves the person’s notification choices", async () => {
    const notifications = createNotifications("denied");
    const preferences = { ...DEFAULT_PREFERENCES, remindersEnabled: true };
    const { findByText, getByText, store } = renderMeditationScreen(<RemindersScreen />, {
      notifications,
      store: new InMemoryMeditationStore({ preferences }),
    });

    await findByText("Notifications are off in your device settings. Your choices here will apply once you allow them.");
    fireEvent.press(getByText("Save"));

    await findByText("Saved. To get notifications, allow them for Moss in your device settings.");
    expect(notifications.requestPermission).not.toHaveBeenCalled();
    await expect(store.loadPreferences()).resolves.toMatchObject({
      backgroundCompletionAlertsEnabled: true,
      remindersEnabled: true,
    });
  });

  it("does not treat a permission read failure as a denial", async () => {
    const notifications = createNotifications("granted");
    notifications.getPermission.mockRejectedValue(new Error("Permissions unavailable"));
    const preferences = { ...DEFAULT_PREFERENCES, remindersEnabled: true };
    const { findByText, getByText, store } = renderMeditationScreen(<RemindersScreen />, {
      notifications,
      store: new InMemoryMeditationStore({ preferences }),
    });

    await findByText("Reminder timing");
    fireEvent.press(getByText("Save"));

    await waitFor(() => expect(notifications.requestPermission).toHaveBeenCalledTimes(1));
    await expect(store.loadPreferences()).resolves.toMatchObject({ remindersEnabled: true });
  });

  it("keeps saved choices when device scheduling needs to be retried", async () => {
    const notifications = createNotifications("granted");
    const { findByText, getByLabelText, getByText, store } = renderMeditationScreen(<RemindersScreen />, {
      notifications,
    });

    await findByText("Reminder timing");
    notifications.rescheduleWeeklyReminders.mockRejectedValueOnce(new Error("Scheduling unavailable"));
    fireEvent(getByLabelText("Practice reminders"), "valueChange", true);
    fireEvent.press(getByText("Save"));

    await findByText("Your choices are saved, but notifications couldn’t be updated. Try saving again.");
    await expect(store.loadPreferences()).resolves.toMatchObject({ remindersEnabled: true });
  });

  it("explains when iOS authorization is granted without notification sounds", async () => {
    const notifications = createNotifications(notificationPermission("granted", { allowsSound: false }));
    const { findByText, getByText } = renderMeditationScreen(<RemindersScreen />, { notifications });

    await findByText("Notification sounds are off in your device settings, so session endings will be silent.");
    fireEvent.press(getByText("Save"));

    await findByText("Saved. Notification sounds are off in your device settings, so session endings will be silent.");
  });
});
