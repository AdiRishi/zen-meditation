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
});
