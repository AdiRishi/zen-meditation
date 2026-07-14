import { fireEvent, waitFor } from "@testing-library/react-native";
import { expectedWallClockTime } from "@tests/testing-utils/date-time";
import { InMemoryMeditationStore } from "@tests/testing-utils/in-memory-meditation-store";
import { renderMeditationScreen } from "@tests/testing-utils/render-meditation-screen";

import type { CompletedSession } from "@/domain/meditation";
import { SessionCompleteScreen } from "@/screens/session-complete-screen";

const mockReplace = jest.fn();
const mockStop = jest.fn(async () => undefined);

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({ id: "completed-session" }),
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/hooks/use-completion-sounds", () => ({
  useCompletionSounds: () => ({
    play: jest.fn(async () => undefined),
    playingSound: null,
    stop: mockStop,
  }),
}));

function completedSession(): CompletedSession {
  const completedAtMs = new Date(2026, 6, 13, 7, 10).getTime();
  return {
    id: "completed-session",
    startedAtMs: completedAtMs - 10 * 60_000,
    completedAtMs,
    localDate: "2026-07-13",
    timezoneOffsetMinutes: new Date(completedAtMs).getTimezoneOffset(),
    durationMs: 10 * 60_000,
    completionSound: "soft-chime",
    feeling: null,
    acknowledgedAtMs: null,
  };
}

function travelledSession(): CompletedSession {
  const completedAtMs = Date.UTC(2026, 6, 13, 0, 10);
  return {
    ...completedSession(),
    startedAtMs: completedAtMs - 10 * 60_000,
    completedAtMs,
    timezoneOffsetMinutes: -600,
  };
}

describe("SessionCompleteScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockStop.mockClear();
  });

  it("persists an optional feeling and acknowledges the completed session", async () => {
    const store = new InMemoryMeditationStore({ completedSessions: [completedSession()] });
    const { getByText } = renderMeditationScreen(<SessionCompleteScreen />, { store });

    await waitFor(() => getByText("Session complete."));
    fireEvent.press(getByText("Calm"));
    await waitFor(async () => {
      await expect(store.listCompletedSessions()).resolves.toEqual([
        expect.objectContaining({ id: "completed-session", feeling: "calm" }),
      ]);
    });

    fireEvent.press(getByText("Done"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(tabs)/today"));
    await expect(store.listCompletedSessions()).resolves.toEqual([
      expect.objectContaining({ id: "completed-session", acknowledgedAtMs: expect.any(Number) }),
    ]);
    expect(mockStop).toHaveBeenCalled();
  });

  it("keeps a selected feeling when it is pressed again", async () => {
    const store = new InMemoryMeditationStore({ completedSessions: [completedSession()] });
    const { getByText } = renderMeditationScreen(<SessionCompleteScreen />, { store });

    await waitFor(() => getByText("Session complete."));
    fireEvent.press(getByText("Calm"));
    await waitFor(async () => {
      await expect(store.listCompletedSessions()).resolves.toEqual([
        expect.objectContaining({ id: "completed-session", feeling: "calm" }),
      ]);
    });

    fireEvent.press(getByText("Calm"));
    await waitFor(async () => {
      await expect(store.listCompletedSessions()).resolves.toEqual([
        expect.objectContaining({ id: "completed-session", feeling: "calm" }),
      ]);
    });
  });

  it("shows the completion time in the timezone where the session ended", async () => {
    const store = new InMemoryMeditationStore({ completedSessions: [travelledSession()] });
    const { getByText } = renderMeditationScreen(<SessionCompleteScreen />, { store });
    const completionTime = expectedWallClockTime(10, 10);
    const completionTimePattern = new RegExp(completionTime.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    await waitFor(() => getByText(completionTimePattern));
  });
});
