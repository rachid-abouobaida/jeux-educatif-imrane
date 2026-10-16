import { AppLanguage } from '../types';

let audioCtx: AudioContext | null = null;
let currentAudioElement: HTMLAudioElement | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Play a cute bubble pop sound for UI interactions
 */
export const playPopSound = (volume = 0.5): void => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startTime = ctx.currentTime;
    osc.frequency.setValueAtTime(350, startTime);
    osc.frequency.exponentialRampToValueAtTime(750, startTime + 0.08);

    gain.gain.setValueAtTime(volume * 0.4, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.09);
  } catch (e) {
    console.debug('Audio context pop sound suppressed', e);
  }
};

/**
 * Play joyful star sparkle chime
 */
export const playSparkleSound = (volume = 0.6): void => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [1046.5, 1318.51, 1567.98, 2093.0]; // C6, E6, G6, C7
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + idx * 0.06;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(volume * 0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch (e) {
    console.debug('Sparkle sound error', e);
  }
};

/**
 * Play warm celebratory fanfare for correct repetition
 */
export const playCelebrationFanfare = (volume = 0.7): void => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const chordNotes = [
      { freq: 523.25, time: 0.00, dur: 0.18 }, // C5
      { freq: 659.25, time: 0.12, dur: 0.18 }, // E5
      { freq: 783.99, time: 0.24, dur: 0.22 }, // G5
      { freq: 1046.5, time: 0.38, dur: 0.50 }, // C6
    ];

    chordNotes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + time;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(volume * 0.35, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    });
  } catch (e) {
    console.debug('Fanfare sound error', e);
  }
};

/**
 * Gentle, comforting tone when encouraging a retry
 */
export const playEncouragementChime = (volume = 0.5): void => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [
      { freq: 440.0, time: 0.0, dur: 0.25 }, // A4
      { freq: 523.25, time: 0.15, dur: 0.35 }, // C5
    ];
    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + time;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(volume * 0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    });
  } catch (e) {
    console.debug('Chime error', e);
  }
};

/**
 * Stop any ongoing audio playback and speech synthesis
 */
export const stopAllAudio = (): void => {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
};

/**
 * Select the best available speech synthesis voice for the target language
 */
const getVoiceForLanguage = (lang: AppLanguage): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  if (lang === 'fr') {
    return (
      voices.find((v) => v.lang.startsWith('fr-FR') && !v.name.includes('Compact')) ||
      voices.find((v) => v.lang.startsWith('fr')) ||
      null
    );
  }

  // Arabic or Moroccan Darija
  return (
    voices.find((v) => v.lang.startsWith('ar-MA')) ||
    voices.find((v) => v.lang.startsWith('ar-SA')) ||
    voices.find((v) => v.lang.startsWith('ar')) ||
    null
  );
};

/**
 * Speaks text using Web Speech API synthesis with child-friendly pitch and pacing
 */
export const speakWithVoice = (
  text: string,
  lang: AppLanguage,
  volume = 1.0,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onStart?.();
      setTimeout(() => {
        onEnd?.();
        resolve();
      }, 1200);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = Math.max(0, Math.min(1, volume));
      // Friendly, cheerful pitch for baby lion
      utterance.pitch = 1.25;
      utterance.rate = 0.90; // slightly deliberate for young ears

      const voice = getVoiceForLanguage(lang);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.lang = lang === 'fr' ? 'fr-FR' : lang === 'ary' ? 'ar-MA' : 'ar-SA';

      utterance.onstart = () => {
        onStart?.();
      };

      utterance.onend = () => {
        onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        console.debug('Speech synthesis error or interrupted:', e);
        onEnd?.();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis invocation failed', e);
      onEnd?.();
      resolve();
    }
  });
};

/**
 * Attempts to play recorded audio file, falling back to speech synthesis if missing
 */
export const playWordAudio = async (
  audioPath: string,
  wordText: string,
  lang: AppLanguage,
  volume = 1.0,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> => {
  stopAllAudio();

  // Try loading real audio file first if it exists
  const tryFile = new Promise<boolean>((resolve) => {
    const audio = new Audio(audioPath);
    currentAudioElement = audio;
    audio.volume = Math.max(0, Math.min(1, volume));

    let resolved = false;
    const cleanup = () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };

    const onPlaying = () => {
      if (!resolved) {
        resolved = true;
        onStart?.();
      }
    };

    const onEnded = () => {
      cleanup();
      currentAudioElement = null;
      onEnd?.();
      resolve(true);
    };

    const onError = () => {
      cleanup();
      currentAudioElement = null;
      resolve(false); // Signal fallback
    };

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    audio.play().catch(() => {
      cleanup();
      currentAudioElement = null;
      resolve(false);
    });
  });

  const fileSucceeded = await tryFile;
  if (!fileSucceeded) {
    // Graceful fallback to speech synthesis
    await speakWithVoice(wordText, lang, volume, onStart, onEnd);
  }
};
