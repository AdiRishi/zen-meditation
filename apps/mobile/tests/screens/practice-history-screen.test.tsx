import { act, fireEvent, waitFor, within } from "@testing-library/react-native";
import { expectedWallClockTime } from "@tests/testing-utils/date-time";
import { InMemoryMeditationStore } from "@tests/testing-utils/in-memory-meditation-store";
import { renderMeditationScreen } from "@tests/testing-utils/render-meditation-screen";

import type { CompletedSession } from "@/domain/meditation";
import { PracticeHistoryScreen } from "@/screens/practice-history-screen";

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockUseFocusEffect = jest.fn();
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const SESSION_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void) => mockUseFocusEffect(effect),
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
    mockUseFocusEffect.mockClear();
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
    const { getAllByLabelText, getByText } = renderMeditationScreen(<PracticeHistoryScreen />, { store });

    await waitFor(() => getByText("Recent sessions"));

    const firstWeek = getAllByLabelText(/practice completed|no practice recorded/).slice(0, 7);
    expect(firstWeek.map((day) => day.props.accessibilityLabel.endsWith(", practice completed"))).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(within(firstWeek[2]).getByText("1")).toBeOnTheScreen();

    const sessionRows = getAllByLabelText(/ session, /).map((row) => row.props.accessibilityLabel);
    expect(sessionRows).toEqual([
      `Morning session, Today, ${expectedWallClockTime(7, 15)}, 15 minutes`,
      `Evening session, Yesterday, ${expectedWallClockTime(19, 10)}, 10 minutes`,
      `Morning session, ${SESSION_DATE_FORMATTER.format(new Date(2026, 6, 1))}, ${expectedWallClockTime(7, 5)}, 5 minutes`,
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
      expect(getByLabelText(`Morning session, Today, ${expectedWallClockTime(0, 10)}, 15 minutes`)).toBeOnTheScreen();
    });
  });

  test("labels midday sessions as afternoon", async () => {
    const store = new InMemoryMeditationStore({
      completedSessions: [createCompletedSession({ id: "afternoon", day: 15, hour: 12, durationMinutes: 30 })],
    });
    const { getByLabelText } = renderMeditationScreen(<PracticeHistoryScreen />, { store });

    await waitFor(() => {
      expect(
        getByLabelText(`Afternoon session, Today, ${expectedWallClockTime(12, 30)}, 30 minutes`),
      ).toBeOnTheScreen();
    });
  });

  test("moves one month at a time and keeps an empty month invitational", async () => {
    const store = new InMemoryMeditationStore({
      completedSessions: [createCompletedSession({ id: "july", day: 15, durationMinutes: 15 })],
    });
    const { getByRole, getByText } = renderMeditationScreen(<PracticeHistoryScreen />, { store });

    await waitFor(() => getByText(MONTH_FORMATTER.format(new Date(2026, 6, 1))));
    fireEvent.press(getByRole("button", { name: "Show next month" }));

    expect(getByText(MONTH_FORMATTER.format(new Date(2026, 7, 1)))).toBeOnTheScreen();
    expect(getByText("No sessions this month")).toBeOnTheScreen();

    fireEvent.press(getByRole("button", { name: "Begin" }));
    expect(mockPush).toHaveBeenCalledWith("/session-setup");
  });

  test("follows the current month across a rollover while preserving manual browsing", async () => {
    jest.setSystemTime(new Date(2026, 6, 31, 23, 59));
    const store = new InMemoryMeditationStore({
      completedSessions: [createCompletedSession({ id: "august", day: 1, monthIndex: 7, durationMinutes: 10 })],
    });
    const { getByRole, getByText } = renderMeditationScreen(<PracticeHistoryScreen />, { store });

    await waitFor(() => getByText(MONTH_FORMATTER.format(new Date(2026, 6, 1))));
    jest.setSystemTime(new Date(2026, 7, 1, 0, 1));
    act(() => mockUseFocusEffect.mock.calls.at(-1)?.[0]());

    await waitFor(() => getByText(MONTH_FORMATTER.format(new Date(2026, 7, 1))));
    expect(getByText("10 min")).toBeOnTheScreen();

    fireEvent.press(getByRole("button", { name: "Show previous month" }));
    fireEvent.press(getByRole("button", { name: "Show previous month" }));
    expect(getByText(MONTH_FORMATTER.format(new Date(2026, 5, 1)))).toBeOnTheScreen();

    jest.setSystemTime(new Date(2026, 7, 2, 12, 0));
    act(() => mockUseFocusEffect.mock.calls.at(-1)?.[0]());
    expect(getByText(MONTH_FORMATTER.format(new Date(2026, 5, 1)))).toBeOnTheScreen();
  });
});
