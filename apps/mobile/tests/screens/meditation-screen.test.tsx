import { act, waitFor } from "@testing-library/react-native";
import { renderWithSafeArea } from "@tests/testing-utils/render-meditation-screen";
import { AppState } from "react-native";

import type { ActiveSession, CompletedSession } from "@/domain/meditation";
import { useMeditation } from "@/providers/meditation-provider";
import { MeditationScreen } from "@/screens/meditation-screen";

const mockReplace = jest.fn();
const mockRedirect = jest.fn((_props: { href: unknown }) => null);

jest.mock("expo-keep-awake", () => ({ useKeepAwake: jest.fn() }));
jest.mock("expo-router", () => ({
  Redirect: (props: { href: unknown }) => mockRedirect(props),
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock("@/providers/meditation-provider", () => ({ useMeditation: jest.fn() }));

const mockedUseMeditation = jest.mocked(useMeditation);
const STARTED_AT_MS = new Date(2026, 6, 13, 7, 0).getTime();

function activeSession(): ActiveSession {
  return {
    id: "racing-session",
    plannedDurationMs: 5 * 60_000,
    startedAtMs: STARTED_AT_MS,
    accumulatedActiveMs: 0,
    resumedAtMs: STARTED_AT_MS,
    status: "running",
    completionSound: "soft-chime",
    completionLocalDate: "2026-07-13",
    completionTimezoneOffsetMinutes: new Date(STARTED_AT_MS).getTimezoneOffset(),
  };
}

function completedSession(): CompletedSession {
  return {
    id: "racing-session",
    startedAtMs: STARTED_AT_MS,
    completedAtMs: STARTED_AT_MS + 5 * 60_000,
    localDate: "2026-07-13",
    timezoneOffsetMinutes: new Date(STARTED_AT_MS).getTimezoneOffset(),
    durationMs: 5 * 60_000,
    completionSound: "soft-chime",
    feeling: null,
    acknowledgedAtMs: null,
  };
}

function meditationValue(overrides: Partial<ReturnType<typeof useMeditation>> = {}) {
  return {
    abandonSession: jest.fn(),
    activeSession: activeSession(),
    completeSession: jest.fn(async () => null),
    notificationPermission: "denied",
    pauseSession: jest.fn(),
    pendingCompletion: null,
    reducedMotion: true,
    resumeSession: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useMeditation>;
}

describe("MeditationScreen completion navigation", () => {
  let appStateListener: ((state: string) => void) | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(STARTED_AT_MS);
    jest.clearAllMocks();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
      appStateListener = listener as (state: string) => void;
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("keeps the observed session id when completion loses the write race", async () => {
    jest.setSystemTime(STARTED_AT_MS + 5 * 60_000);
    mockedUseMeditation.mockReturnValue(meditationValue());

    renderWithSafeArea(<MeditationScreen />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/session-complete",
        params: { id: "racing-session", playSound: "1" },
      }),
    );
  });

  it("plays a local signal when refresh publishes a denied-permission completion first", () => {
    mockedUseMeditation.mockReturnValue(meditationValue());
    const screen = renderWithSafeArea(<MeditationScreen />);

    mockedUseMeditation.mockReturnValue(
      meditationValue({ activeSession: null, pendingCompletion: completedSession() }),
    );
    screen.rerender(<MeditationScreen />);

    expect(mockRedirect).toHaveBeenLastCalledWith({
      href: {
        pathname: "/session-complete",
        params: { id: "racing-session", playSound: "1" },
      },
    });
  });

  it("does not duplicate a completion signal that may have played in the background", () => {
    mockedUseMeditation.mockReturnValue(meditationValue({ notificationPermission: "granted" }));
    const screen = renderWithSafeArea(<MeditationScreen />);
    act(() => appStateListener?.("background"));

    mockedUseMeditation.mockReturnValue(
      meditationValue({
        activeSession: null,
        notificationPermission: "granted",
        pendingCompletion: completedSession(),
      }),
    );
    screen.rerender(<MeditationScreen />);

    expect(mockRedirect).toHaveBeenLastCalledWith({
      href: {
        pathname: "/session-complete",
        params: { id: "racing-session" },
      },
    });
  });
});
