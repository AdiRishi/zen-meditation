/* eslint-disable @typescript-eslint/no-require-imports */

import { fireEvent, waitFor } from "@testing-library/react-native";
import { InMemoryMeditationStore } from "@tests/testing-utils/in-memory-meditation-store";
import { renderMeditationScreen } from "@tests/testing-utils/render-meditation-screen";

import type { CompletedSession } from "@/domain/meditation";
import { ProgressScreen } from "@/screens/progress-screen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn(),
  useRouter: () => ({
    back: jest.fn(),
    push: mockPush,
  }),
}));

jest.mock("@/services/local-notifications", () => ({ localNotifications: undefined }));

jest.mock("@react-native-segmented-control/segmented-control", () => ({
  __esModule: true,
  default: (props: {
    onChange(event: { nativeEvent: { selectedSegmentIndex: number } }): void;
    selectedIndex: number;
    values: string[];
  }) => {
    const React = require("react");
    const { Pressable, Text, View } = require("react-native");
    return React.createElement(
      View,
      null,
      props.values.map((value: string, index: number) =>
        React.createElement(
          Pressable,
          {
            key: value,
            accessibilityRole: "radio",
            accessibilityState: { checked: props.selectedIndex === index },
            onPress: () => props.onChange({ nativeEvent: { selectedSegmentIndex: index } }),
          },
          React.createElement(Text, null, value),
        ),
      ),
    );
  },
}));

function createCompletedSession(
  id: string,
  year: number,
  monthIndex: number,
  day: number,
  durationMinutes: number,
): CompletedSession {
  const startedAtMs = new Date(year, monthIndex, day, 7, 0).getTime();
  const completedAtMs = startedAtMs + durationMinutes * 60_000;
  return {
    id,
    startedAtMs,
    completedAtMs,
    localDate: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    timezoneOffsetMinutes: new Date(startedAtMs).getTimezoneOffset(),
    durationMs: durationMinutes * 60_000,
    completionSound: "soft-chime",
    feeling: null,
    acknowledgedAtMs: completedAtMs,
  };
}

function renderProgress(sessions: CompletedSession[]) {
  const store = new InMemoryMeditationStore({ completedSessions: sessions });
  return renderMeditationScreen(<ProgressScreen />, { store });
}

describe("<ProgressScreen />", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 17, 12, 0));
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("shows exact persisted totals and changes the aggregation period", async () => {
    const sessions = [
      createCompletedSession("monday", 2026, 6, 13, 5),
      createCompletedSession("tuesday", 2026, 6, 14, 10),
      createCompletedSession("wednesday", 2026, 6, 15, 15),
    ];
    const { getByLabelText, getByRole, getByText } = renderProgress(sessions);

    await waitFor(() => {
      expect(getByLabelText("Sessions, 3")).toBeOnTheScreen();
    });
    expect(getByLabelText("Minutes, 30")).toBeOnTheScreen();
    expect(getByLabelText("Day rhythm, 0")).toBeOnTheScreen();
    expect(getByLabelText("Monday, 5 minutes practiced")).toBeOnTheScreen();

    fireEvent.press(getByRole("radio", { name: "July" }));

    expect(getByLabelText("3 sessions, 30 min, across 3 practice days")).toBeOnTheScreen();
    expect(getByText("Minutes by week")).toBeOnTheScreen();
    expect(
      getByRole("button", {
        name: "Minutes by week. Jul 1–7, 0 minutes; Jul 8–14, 15 minutes; Jul 15–17, 15 minutes",
      }),
    ).toBeOnTheScreen();
  });

  test("opens practice history from the trend", async () => {
    const { getByRole, getByText } = renderProgress([createCompletedSession("wednesday", 2026, 6, 15, 15)]);

    await waitFor(() => {
      expect(getByText("Minutes this week")).toBeOnTheScreen();
    });
    fireEvent.press(getByRole("button", { name: /Minutes this week/ }));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/progress/history");
  });

  test("offers a calm return when there are no sessions", async () => {
    const { getByLabelText, getByRole, getByText } = renderProgress([]);

    await waitFor(() => {
      expect(getByText("No sessions yet")).toBeOnTheScreen();
    });
    fireEvent.press(getByRole("button", { name: "Begin" }));
    expect(getByLabelText("Sessions, 0")).toBeOnTheScreen();
    expect(mockPush).toHaveBeenLastCalledWith("/session-setup");
  });
});
