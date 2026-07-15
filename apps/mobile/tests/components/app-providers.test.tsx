import { act, fireEvent, render } from "@testing-library/react-native";
import { Alert, Text } from "react-native";

import { AppProviders } from "@/components/app-providers";

const mockDeleteDatabaseAsync = jest.fn();
const mockClearAllManagedNotifications = jest.fn();

jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  initialWindowMetrics: {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, right: 0, bottom: 34, left: 0 },
  },
}));

jest.mock("expo-sqlite", () => {
  const React = jest.requireActual<typeof import("react")>("react");

  return {
    deleteDatabaseAsync: (...args: unknown[]) => mockDeleteDatabaseAsync(...args),
    SQLiteProvider: ({ onError }: { onError: (error: Error) => void }) => {
      React.useEffect(() => {
        onError(new Error("Database unavailable"));
      }, [onError]);
      return null;
    },
  };
});

jest.mock("@/components/app-theme-provider", () => ({
  AppThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/notification-response-navigator", () => ({
  NotificationResponseNavigator: () => null,
}));

jest.mock("@/providers/meditation-provider", () => ({
  SQLiteMeditationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/services/local-notifications", () => ({
  localNotifications: {
    clearAllManagedNotifications: (...args: unknown[]) => mockClearAllManagedNotifications(...args),
  },
}));

describe("<AppProviders />", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockDeleteDatabaseAsync.mockReset();
    mockClearAllManagedNotifications.mockReset();
  });

  it("preserves the database when managed notifications cannot be deleted", async () => {
    mockClearAllManagedNotifications.mockRejectedValueOnce(new Error("Notification cleanup failed"));
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const { findByText } = render(
      <AppProviders>
        <Text>App content</Text>
      </AppProviders>,
    );

    fireEvent.press(await findByText("Delete All Moss Data"));
    const buttons = alert.mock.calls[0][2];
    const deleteButton = buttons?.find((button) => button.text === "Delete All Moss Data");
    await act(async () => {
      deleteButton?.onPress?.();
    });

    await findByText("Moss couldn’t finish deleting your data. Please try again.");
    expect(mockClearAllManagedNotifications).toHaveBeenCalledTimes(1);
    expect(mockDeleteDatabaseAsync).not.toHaveBeenCalled();
  });
});
