import { render, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";

import { NotificationResponseNavigator } from "@/components/notification-response-navigator";
import { useMeditation } from "@/providers/meditation-provider";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock("@/providers/meditation-provider", () => ({
  useMeditation: jest.fn(),
}));

const mockedUseMeditation = jest.mocked(useMeditation);
const mockedUseLastResponse = jest.mocked(Notifications.useLastNotificationResponse);
const mockedClearLastResponse = jest.mocked(Notifications.clearLastNotificationResponse);

function weeklyReminderResponse() {
  return {
    actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
    notification: {
      date: 1_800_000_000_000,
      request: {
        identifier: "zen.weekly-practice-reminder.2.0700",
        content: {
          title: "Zen",
          body: "Time for a quiet pause.",
          data: { zenNotificationKind: "weekly-practice-reminder" },
        },
        trigger: null,
      },
    },
  } as unknown as Notifications.NotificationResponse;
}

describe("NotificationResponseNavigator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedClearLastResponse.mockImplementation(() => undefined);
    mockedUseMeditation.mockReturnValue({
      activeSession: null,
      isReady: true,
      pendingCompletion: null,
      preferences: { onboardingCompleted: true },
      refresh: jest.fn(),
    } as unknown as ReturnType<typeof useMeditation>);
  });

  it("keeps a handled response deduped when native clearing fails", () => {
    mockedClearLastResponse.mockImplementation(() => {
      throw new Error("Native response cache is unavailable");
    });
    mockedUseLastResponse.mockReturnValue(weeklyReminderResponse());
    const screen = render(<NotificationResponseNavigator />);

    expect(mockPush).toHaveBeenCalledTimes(1);

    mockedUseMeditation.mockReturnValue({
      activeSession: { id: "started-session" },
      error: null,
      isReady: true,
      pendingCompletion: null,
      preferences: { onboardingCompleted: true },
      refresh: jest.fn(),
    } as unknown as ReturnType<typeof useMeditation>);
    screen.rerender(<NotificationResponseNavigator />);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("handles a later delivery of the same repeating reminder", () => {
    const response = weeklyReminderResponse();
    mockedUseLastResponse.mockReturnValue(response);
    const screen = render(<NotificationResponseNavigator />);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenLastCalledWith("/session-setup");

    mockedUseLastResponse.mockReturnValue(null);
    screen.rerender(<NotificationResponseNavigator />);
    mockedUseLastResponse.mockReturnValue(response);
    screen.rerender(<NotificationResponseNavigator />);

    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  it("keeps local-data recovery visible when storage cannot be read", () => {
    mockedUseMeditation.mockReturnValue({
      activeSession: null,
      error: new Error("Stored data is unavailable"),
      isReady: true,
      pendingCompletion: null,
      preferences: { onboardingCompleted: true },
      refresh: jest.fn(),
    } as unknown as ReturnType<typeof useMeditation>);
    mockedUseLastResponse.mockReturnValue(weeklyReminderResponse());

    render(<NotificationResponseNavigator />);

    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not route a completion response after refresh fails", async () => {
    const refresh = jest.fn(async () => false);
    mockedUseMeditation.mockReturnValue({
      activeSession: null,
      error: null,
      isReady: true,
      pendingCompletion: null,
      preferences: { onboardingCompleted: true },
      refresh,
    } as unknown as ReturnType<typeof useMeditation>);
    const response = weeklyReminderResponse();
    response.notification.request.identifier = "zen.session-completion.session-42";
    response.notification.request.content.data = {
      zenNotificationKind: "session-completion",
      sessionId: "session-42",
    };
    mockedUseLastResponse.mockReturnValue(response);

    render(<NotificationResponseNavigator />);

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
