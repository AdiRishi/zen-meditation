import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { InMemoryMeditationStore } from "@tests/testing-utils/in-memory-meditation-store";
import { createNotifications, renderMeditationScreen } from "@tests/testing-utils/render-meditation-screen";
import { Alert } from "react-native";

import { DEFAULT_PREFERENCES } from "@/domain/meditation";
import { PrivacyScreen } from "@/screens/privacy-screen";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: mockReplace }),
}));

describe("<PrivacyScreen />", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockReplace.mockClear();
  });

  it("explains the local-only model and resets device data only after confirmation", async () => {
    const notifications = createNotifications("granted");
    const store = new InMemoryMeditationStore({
      preferences: {
        ...DEFAULT_PREFERENCES,
        onboardingCompleted: true,
        remindersEnabled: true,
        appearance: "dark",
      },
    });
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const { findByText, getByText } = renderMeditationScreen(<PrivacyScreen />, { notifications, store });

    await findByText("Your practice history, schedule, and preferences stay on this device.");
    getByText("Zen does not ask you to sign in or create a profile.");
    getByText("Zen does not track your activity or send analytics about your practice.");
    fireEvent.press(getByText("Reset Local Data"));

    expect(alert).toHaveBeenCalledWith(
      "Reset local data?",
      expect.stringContaining("This can’t be undone."),
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0][2];
    const resetButton = buttons?.find((button) => button.text === "Reset Local Data");
    await act(async () => {
      resetButton?.onPress?.();
    });

    await waitFor(async () => {
      await expect(store.loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
    });
    expect(notifications.rescheduleWeeklyReminders).toHaveBeenCalledWith(DEFAULT_PREFERENCES);
    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});
