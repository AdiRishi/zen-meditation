import { act, fireEvent } from "@testing-library/react-native";
import { renderWithTestProviders } from "@tests/testing-utils/render-with-test-providers";
import { Alert } from "react-native";

import { LocalDataErrorScreen } from "@/screens/error/local-data-error-screen";

describe("<LocalDataErrorScreen />", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("resets local data only once after destructive confirmation", async () => {
    let finishReset: (() => void) | undefined;
    const onReset = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishReset = resolve;
        }),
    );
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const { getByText } = renderWithTestProviders(<LocalDataErrorScreen onRetry={jest.fn()} onReset={onReset} />);

    fireEvent.press(getByText("Delete All Moss Data"));
    expect(onReset).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      "Delete all Moss data?",
      expect.stringContaining("This can’t be undone."),
      expect.any(Array),
    );

    const buttons = alert.mock.calls[0][2];
    const resetButton = buttons?.find((button) => button.text === "Delete All Moss Data");
    await act(async () => {
      resetButton?.onPress?.();
      resetButton?.onPress?.();
      await Promise.resolve();
    });

    expect(onReset).toHaveBeenCalledTimes(1);
    getByText("Deleting Moss data…");

    await act(async () => finishReset?.());
  });
});
