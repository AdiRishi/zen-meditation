import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useState } from "react";

import type { CompletionSound } from "@/domain/meditation";

const SOFT_CHIME = require("../../assets/sounds/soft_chime.wav");
const LOW_BOWL = require("../../assets/sounds/low_bowl.wav");
const WOOD_TONE = require("../../assets/sounds/wood_tone.wav");

let audioModePromise: Promise<void> | null = null;

function ensurePlaybackAudioMode() {
  if (!audioModePromise) {
    audioModePromise = setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
    }).catch((error: unknown) => {
      audioModePromise = null;
      throw error;
    });
  }

  return audioModePromise;
}

export function useCompletionSounds() {
  const softChime = useAudioPlayer(SOFT_CHIME);
  const lowBowl = useAudioPlayer(LOW_BOWL);
  const woodTone = useAudioPlayer(WOOD_TONE);
  const softChimeStatus = useAudioPlayerStatus(softChime);
  const lowBowlStatus = useAudioPlayerStatus(lowBowl);
  const woodToneStatus = useAudioPlayerStatus(woodTone);
  const [playingSound, setPlayingSound] = useState<CompletionSound | null>(null);

  const stop = useCallback(async () => {
    softChime.pause();
    lowBowl.pause();
    woodTone.pause();
    await Promise.allSettled([softChime.seekTo(0), lowBowl.seekTo(0), woodTone.seekTo(0)]);
    setPlayingSound(null);
  }, [lowBowl, softChime, woodTone]);

  const play = useCallback(
    async (sound: CompletionSound) => {
      await ensurePlaybackAudioMode();
      await stop();
      const player = sound === "soft-chime" ? softChime : sound === "low-bowl" ? lowBowl : woodTone;
      setPlayingSound(sound);
      player.play();
    },
    [lowBowl, softChime, stop, woodTone],
  );

  const selectedPlayerIsPlaying =
    (playingSound === "soft-chime" && softChimeStatus.playing) ||
    (playingSound === "low-bowl" && lowBowlStatus.playing) ||
    (playingSound === "wood-tone" && woodToneStatus.playing);

  return { play, playingSound: selectedPlayerIsPlaying ? playingSound : null, stop };
}
