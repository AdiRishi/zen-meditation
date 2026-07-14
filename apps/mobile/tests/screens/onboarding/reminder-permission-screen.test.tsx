import { fireEvent, waitFor } from "@testing-library/react-native";
import { createNotifications, renderMeditationScreen } from "@tests/testing-utils/render-meditation-screen";

import { ReminderPermissionScreen } from "@/screens/onboarding/reminder-permission-screen";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe("ReminderPermissionScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it("finishes onboarding without reminders when native scheduling is unavailable", async () => {
    const notifications = createNotifications("denied");
    notifications.rescheduleWeeklyReminders.mockRejectedValue(new Error("Notifications unavailable"));
    const { getByText, store } = renderMeditationScreen(<ReminderPermissionScreen />, { notifications });

    fireEvent.press(getByText("Not now"));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(tabs)/today"));
    await expect(store.loadPreferences()).resolves.toMatchObject({
      onboardingCompleted: true,
      onboardingStep: "complete",
      remindersEnabled: false,
    });
    expect(notifications.requestPermission).not.toHaveBeenCalled();
  });

  it("turns reminders back off when scheduling observes denied permission", async () => {
    const notifications = createNotifications("undetermined");
    notifications.rescheduleWeeklyReminders.mockResolvedValue({
      permissionStatus: "denied",
      scheduledCount: 0,
    });
    const { getByText, store } = renderMeditationScreen(<ReminderPermissionScreen />, { notifications });

    fireEvent.press(getByText("Allow reminders"));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(tabs)/today"));
    await expect(store.loadPreferences()).resolves.toMatchObject({
      onboardingCompleted: true,
      remindersEnabled: false,
    });
    expect(notifications.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("preserves granted reminder intent when native scheduling needs a retry", async () => {
    const notifications = createNotifications("undetermined");
    notifications.rescheduleWeeklyReminders.mockRejectedValueOnce(new Error("Scheduling unavailable"));
    const { getByText, store } = renderMeditationScreen(<ReminderPermissionScreen />, { notifications });

    fireEvent.press(getByText("Allow reminders"));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(tabs)/today"));
    await expect(store.loadPreferences()).resolves.toMatchObject({
      onboardingCompleted: true,
      remindersEnabled: true,
    });
  });
});
