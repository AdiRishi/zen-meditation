import { act, render } from "@testing-library/react-native";
import { useObserve } from "expo-observe";
import { Text } from "react-native";

import { ObservedRoute } from "@/components/observed-route";

jest.mock("expo-observe", () => ({
  useObserve: jest.fn(),
}));

const mockUseObserve = jest.mocked(useObserve);
const markInteractive = jest.fn();
const animationFrames = new Map<number, FrameRequestCallback>();
let nextAnimationFrame = 1;

describe("ObservedRoute", () => {
  beforeEach(() => {
    markInteractive.mockClear();
    animationFrames.clear();
    nextAnimationFrame = 1;
    mockUseObserve.mockReturnValue({ markInteractive });
    jest.spyOn(global, "requestAnimationFrame").mockImplementation((callback) => {
      const frame = nextAnimationFrame++;
      animationFrames.set(frame, callback);
      return frame;
    });
    jest.spyOn(global, "cancelAnimationFrame").mockImplementation((frame) => {
      if (typeof frame === "number") {
        animationFrames.delete(frame);
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("marks rendered route content interactive after its first frame", () => {
    const { getByText } = render(
      <ObservedRoute>
        <Text>Ready route</Text>
      </ObservedRoute>,
    );

    getByText("Ready route");
    expect(markInteractive).not.toHaveBeenCalled();

    act(() => {
      animationFrames.get(1)?.(0);
    });

    expect(markInteractive).toHaveBeenCalledTimes(1);
  });

  test("does not mark route content removed before its first frame", () => {
    const { unmount } = render(
      <ObservedRoute>
        <Text>Redirecting route</Text>
      </ObservedRoute>,
    );

    unmount();

    expect(animationFrames.size).toBe(0);
    expect(markInteractive).not.toHaveBeenCalled();
  });
});
