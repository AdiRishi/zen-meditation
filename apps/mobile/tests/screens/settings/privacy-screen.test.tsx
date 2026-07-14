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

  it("explains the local-only model and deletes all device data only after confirmation", async () => {
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
    fireEvent.press(getByText("Delete All Zen Data"));

    expect(alert).toHaveBeenCalledWith(
      "Delete all Zen data?",
      expect.stringContaining("practice history, active session, schedule, reminders, and settings"),
      expect.any(Array),
    );
    await expect(store.loadPreferences()).resolves.not.toEqual(DEFAULT_PREFERENCES);

    const buttons = alert.mock.calls[0][2];
    const deleteButton = buttons?.find((button) => button.text === "Delete All Zen Data");
    await act(async () => {
      deleteButton?.onPress?.();
    });

    await waitFor(async () => {
      await expect(store.loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
    });
    expect(notifications.clearAllManagedNotifications).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("does not report completion when scheduled notifications cannot be deleted", async () => {
    const notifications = createNotifications("granted");
    notifications.clearAllManagedNotifications.mockRejectedValueOnce(new Error("Notification cleanup failed"));
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

    fireEvent.press(await findByText("Delete All Zen Data"));
    const buttons = alert.mock.calls[0][2];
    const deleteButton = buttons?.find((button) => button.text === "Delete All Zen Data");
    await act(async () => {
      deleteButton?.onPress?.();
    });

    await findByText("Zen couldn’t finish deleting your data. Please try again.");
    getByText("Delete All Zen Data");
    await expect(store.loadPreferences()).resolves.toEqual({
      ...DEFAULT_PREFERENCES,
      onboardingCompleted: true,
      remindersEnabled: true,
      appearance: "dark",
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
