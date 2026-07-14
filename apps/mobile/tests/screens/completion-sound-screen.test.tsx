import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { InMemoryMeditationStore } from "@tests/testing-utils/in-memory-meditation-store";
import { renderMeditationScreen } from "@tests/testing-utils/render-meditation-screen";

import { CompletionSoundScreen } from "@/screens/completion-sound-screen";

const mockBack = jest.fn();
const mockPlay = jest.fn(async () => undefined);
const mockStop = jest.fn(async () => undefined);

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock("@/hooks/use-completion-sounds", () => ({
  useCompletionSounds: () => ({
    play: mockPlay,
    playingSound: null,
    stop: mockStop,
  }),
}));

describe("CompletionSoundScreen", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPlay.mockClear();
    mockStop.mockClear();
  });

  it("disables actions while saving and offers recovery when persistence fails", async () => {
    const store = new InMemoryMeditationStore();
    let rejectSave: ((error: Error) => void) | undefined;
    jest.spyOn(store, "savePreferences").mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectSave = reject;
        }),
    );
    const { getByLabelText, getByText } = renderMeditationScreen(<CompletionSoundScreen />, { store });

    await waitFor(() => getByText("Completion sound"));
    fireEvent.press(getByLabelText("Low bowl"));

    await waitFor(() => getByText("Working…"));
    expect(getByLabelText("Wood tone").props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));

    await act(async () => rejectSave?.(new Error("storage unavailable")));

    await waitFor(() => getByText("That action couldn’t be completed. Please try again."));
    expect(getByLabelText("Wood tone").props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }));
  });

  it("surfaces preview failures without leaving the screen stuck", async () => {
    mockPlay.mockRejectedValueOnce(new Error("audio unavailable"));
    const { getByLabelText, getByText } = renderMeditationScreen(<CompletionSoundScreen />);

    await waitFor(() => getByText("Completion sound"));
    fireEvent.press(getByLabelText("Preview Soft chime"));

    await waitFor(() => getByText("That action couldn’t be completed. Please try again."));
    expect(getByText("Done")).toBeTruthy();
  });
});
