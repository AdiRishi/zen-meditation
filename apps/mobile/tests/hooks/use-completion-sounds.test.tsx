import { act, renderHook } from "@testing-library/react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { useCompletionSounds } from "@/hooks/use-completion-sounds";

jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn(),
  useAudioPlayer: jest.fn(),
  useAudioPlayerStatus: jest.fn(),
}));

function createPlayer() {
  return {
    pause: jest.fn(),
    play: jest.fn(),
    seekTo: jest.fn(async () => undefined),
  };
}

describe("useCompletionSounds", () => {
  it("waits for playback audio mode before playing the first completion sound", async () => {
    let resolveAudioMode!: () => void;
    const audioModeReady = new Promise<void>((resolve) => {
      resolveAudioMode = resolve;
    });
    jest.mocked(setAudioModeAsync).mockReturnValue(audioModeReady);

    const players = [createPlayer(), createPlayer(), createPlayer()];
    jest
      .mocked(useAudioPlayer)
      .mockReturnValueOnce(players[0] as unknown as ReturnType<typeof useAudioPlayer>)
      .mockReturnValueOnce(players[1] as unknown as ReturnType<typeof useAudioPlayer>)
      .mockReturnValueOnce(players[2] as unknown as ReturnType<typeof useAudioPlayer>);
    jest.mocked(useAudioPlayerStatus).mockReturnValue({ playing: false } as ReturnType<typeof useAudioPlayerStatus>);

    const { result } = renderHook(() => useCompletionSounds());
    let playPromise!: Promise<void>;

    act(() => {
      playPromise = result.current.play("soft-chime");
    });

    expect(players[0].play).not.toHaveBeenCalled();

    await act(async () => {
      resolveAudioMode();
      await playPromise;
    });

    expect(players[0].play).toHaveBeenCalled();
  });
});
