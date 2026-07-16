import { render } from "@testing-library/react-native";

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
  it("routes a returning person as soon as local data is ready", () => {
    mockedUseMeditation.mockReturnValue({
      activeSession: null,
      isReady: true,
      pendingCompletion: null,
      preferences: { ...DEFAULT_PREFERENCES, onboardingCompleted: true, onboardingStep: "complete" },
    } as ReturnType<typeof useMeditation>);

    render(<LaunchScreen />);

    expect(mockRedirect).toHaveBeenCalledWith({ href: "/(tabs)/today" });
  });
});
