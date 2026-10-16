import { useCallback, useState } from 'react';
import { AppLanguage } from '../types';
import {
  playWordAudio,
  playCelebrationFanfare,
  playSparkleSound,
  playEncouragementChime,
  playPopSound,
  stopAllAudio,
} from '../services/audioService';

export const useAudio = (
  volume = 0.85,
  soundEffectsEnabled = true,
  speechSpeed = 0.75
) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const speakWord = useCallback(
    async (
      audioPath: string,
      wordText: string,
      lang: AppLanguage,
      onStart?: () => void,
      onEnd?: () => void,
      customSpeed?: number
    ) => {
      setIsPlaying(true);
      onStart?.();
      const effectiveSpeed = customSpeed ?? speechSpeed;
      try {
        await playWordAudio(
          audioPath,
          wordText,
          lang,
          volume,
          () => {
            setIsPlaying(true);
          },
          () => {
            setIsPlaying(false);
            onEnd?.();
          },
          effectiveSpeed
        );
      } catch (err) {
        console.warn('Word audio playback error', err);
        setIsPlaying(false);
        onEnd?.();
      }
    },
    [volume, speechSpeed]
  );

  const playSuccess = useCallback(() => {
    if (soundEffectsEnabled) {
      playCelebrationFanfare(volume);
      setTimeout(() => playSparkleSound(volume), 400);
    }
  }, [soundEffectsEnabled, volume]);

  const playEncourage = useCallback(() => {
    if (soundEffectsEnabled) {
      playEncouragementChime(volume);
    }
  }, [soundEffectsEnabled, volume]);

  const playPop = useCallback(() => {
    if (soundEffectsEnabled) {
      playPopSound(volume);
    }
  }, [soundEffectsEnabled, volume]);

  const stop = useCallback(() => {
    stopAllAudio();
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    speakWord,
    playSuccess,
    playEncourage,
    playPop,
    stop,
  };
};
