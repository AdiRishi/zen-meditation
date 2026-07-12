import { fireEvent, waitFor } from "@testing-library/react-native";
import { InMemoryMeditationStore } from "@tests/testing-utils/in-memory-meditation-store";
import { renderMeditationScreen } from "@tests/testing-utils/render-meditation-screen";

import type { CompletedSession } from "@/domain/meditation";
import { PracticeHistoryScreen } from "@/screens/practice-history-screen";

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn(),
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock("@/services/local-notifications", () => ({ localNotifications: undefined }));

function createCompletedSession({
  day,
  durationMinutes,
  hour = 7,
  id,
  monthIndex = 6,
}: {
  day: number;
  durationMinutes: number;
  hour?: number;
  id: string;
  monthIndex?: number;
}): CompletedSession {
  const startedAtMs = new Date(2026, monthIndex, day, hour, 0).getTime();
  const completedAtMs = startedAtMs + durationMinutes * 60_000;
  return {
    id,
    startedAtMs,
    completedAtMs,
    localDate: `2026-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    timezoneOffsetMinutes: new Date(startedAtMs).getTimezoneOffset(),
    durationMs: durationMinutes * 60_000,
    completionSound: "soft-chime",
    feeling: null,
    acknowledgedAtMs: completedAtMs,
  };
}

describe("<PracticeHistoryScreen />", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 15, 12, 0));
    mockBack.mockClear();
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("shows completed calendar dates and recent sessions newest first", async () => {
    const store = new InMemoryMeditationStore({
      completedSessions: [
        createCompletedSession({ id: "first", day: 1, durationMinutes: 5 }),
        createCompletedSession({ id: "yesterday", day: 14, hour: 19, durationMinutes: 10 }),
        createCompletedSession({ id: "today", day: 15, durationMinutes: 15 }),
      ],
    });
    const { getAllByLabelText, getByLabelText, getByText } = renderMeditationScreen(<PracticeHistoryScreen />, {
      store,
    });

    await waitFor(() => {
      expect(getByText("July 2026")).toBeOnTheScreen();
    });
    expect(getByLabelText(/Wednesday, July 1, 2026, practice completed/)).toBeOnTheScreen();
    expect(getByLabelText(/Thursday, July 2, 2026, no practice recorded/)).toBeOnTheScreen();
    expect(
      getAllByLabelText(/practice completed|no practice recorded/)
        .slice(0, 7)
        .map((day) => day.props.accessibilityLabel),
    ).toEqual([
      "Monday, June 29, 2026, no practice recorded",
      "Tuesday, June 30, 2026, no practice recorded",
      "Wednesday, July 1, 2026, practice completed",
      "Thursday, July 2, 2026, no practice recorded",
      "Friday, July 3, 2026, no practice recorded",
      "Saturday, July 4, 2026, no practice recorded",
      "Sunday, July 5, 2026, no practice recorded",
    ]);

    const sessionRows = getAllByLabelText(/ session, /).map((row) => row.props.accessibilityLabel);
    expect(sessionRows).toEqual([
      "Morning session, Today, 7:15 AM, 15 minutes",
      "Evening session, Yesterday, 7:10 PM, 10 minutes",
      "Morning session, Jul 1, 7:05 AM, 5 minutes",
    ]);
  });

  test("labels a session that crosses midnight with its completion date and time", async () => {
    const startedAtMs = new Date(2026, 6, 14, 23, 55).getTime();
    const completedAtMs = new Date(2026, 6, 15, 0, 10).getTime();
    const overnightSession: CompletedSession = {
      id: "overnight",
      startedAtMs,
      completedAtMs,
      localDate: "2026-07-15",
      timezoneOffsetMinutes: new Date(completedAtMs).getTimezoneOffset(),
      durationMs: 15 * 60_000,
      completionSound: "soft-chime",
      feeling: null,
      acknowledgedAtMs: completedAtMs,
    };
    const store = new InMemoryMeditationStore({ completedSessions: [overnightSession] });
    const { getByLabelText } = renderMeditationScreen(<PracticeHistoryScreen />, { store });

    await waitFor(() => {
      expect(getByLabelText("Morning session, Today, 12:10 AM, 15 minutes")).toBeOnTheScreen();
    });
  });

  test("moves one month at a time and keeps an empty month invitational", async () => {
    const store = new InMemoryMeditationStore({
      completedSessions: [createCompletedSession({ id: "july", day: 15, durationMinutes: 15 })],
    });
    const { getByRole, getByText } = renderMeditationScreen(<PracticeHistoryScreen />, { store });

    await waitFor(() => {
      expect(getByText("July 2026")).toBeOnTheScreen();
    });
    fireEvent.press(getByRole("button", { name: "Show next month" }));

    expect(getByText("August 2026")).toBeOnTheScreen();
    expect(getByText("No sessions this month")).toBeOnTheScreen();

    fireEvent.press(getByRole("button", { name: "Begin" }));
    expect(mockPush).toHaveBeenCalledWith("/session-setup");
  });
});
