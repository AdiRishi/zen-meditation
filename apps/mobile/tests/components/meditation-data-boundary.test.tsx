import { fireEvent } from "@testing-library/react-native";
import { renderWithSafeArea } from "@tests/testing-utils/render-meditation-screen";
import { Text } from "react-native";

import { MeditationDataBoundary } from "@/components/meditation-data-boundary";
import { useMeditation } from "@/providers/meditation-provider";

jest.mock("@/providers/meditation-provider", () => ({
  useMeditation: jest.fn(),
}));

const mockedUseMeditation = jest.mocked(useMeditation);

describe("MeditationDataBoundary", () => {
  it("keeps every route behind local-data readiness and recovery", () => {
    const refresh = jest.fn();
    const resetAllData = jest.fn();
    mockedUseMeditation.mockReturnValue({
      error: new Error("Stored session is unavailable"),
      isReady: true,
      refresh,
      resetAllData,
    } as unknown as ReturnType<typeof useMeditation>);

    const screen = renderWithSafeArea(
      <MeditationDataBoundary>
        <Text>Session setup</Text>
      </MeditationDataBoundary>,
    );

    expect(screen.queryByText("Session setup")).not.toBeOnTheScreen();
    expect(screen.getByText("Your practice data needs a moment.")).toBeOnTheScreen();

    fireEvent.press(screen.getByText("Try again"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
