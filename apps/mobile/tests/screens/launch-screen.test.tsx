import { act } from "@testing-library/react-native";
import { renderWithSafeArea } from "@tests/testing-utils/render-meditation-screen";

import { DEFAULT_PREFERENCES } from "@/domain/meditation";
import { useMeditation } from "@/providers/meditation-provider";
import { LaunchScreen } from "@/screens/launch-screen";

const mockRedirect = jest.fn((_props: { href: unknown }) => null);

jest.mock("expo-router", () => ({
  Redirect: (props: { href: unknown }) => mockRedirect(props),
}));

jest.mock("@/providers/meditation-provider", () => ({
  useMeditation: jest.fn(),
}));

const mockedUseMeditation = jest.mocked(useMeditation);

describe("LaunchScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows the brand moment before routing a returning person", () => {
    mockedUseMeditation.mockReturnValue({
      activeSession: null,
      isReady: true,
      pendingCompletion: null,
      preferences: { ...DEFAULT_PREFERENCES, onboardingCompleted: true, onboardingStep: "complete" },
      reducedMotion: false,
    } as ReturnType<typeof useMeditation>);

    const screen = renderWithSafeArea(<LaunchScreen />);

    expect(screen.getByText("Moss")).toBeOnTheScreen();
    expect(screen.getByText(/A quiet rhythm/)).toBeOnTheScreen();
    expect(mockRedirect).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1_100));

    expect(mockRedirect).toHaveBeenCalledWith({ href: "/(tabs)/today" });
  });
});
