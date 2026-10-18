import { AppLanguage } from '../../types';

// Ambient definitions for Web Speech API to satisfy TypeScript strict mode
interface SpeechRecognitionResultAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface ISpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface IWindowSpeechRecognition extends Window {
  SpeechRecognition?: { new (): ISpeechRecognitionInstance };
  webkitSpeechRecognition?: { new (): ISpeechRecognitionInstance };
}

let activeRecognition: ISpeechRecognitionInstance | null = null;
let listenTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
let isStoppingExplicitly = false;

// Audio Monitor and Gain Booster state
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let analyserNode: AnalyserNode | null = null;
let audioLevelTimer: ReturnType<typeof setInterval> | null = null;
let currentRemainingMs = 0;
let lastResultAlternatives: string[] = [];
let hasDeliveredFinalResult = false;

export const isSpeechRecognitionSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as IWindowSpeechRecognition;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
};

export interface StartListeningOptions {
  lang: AppLanguage;
  timeoutSeconds?: number;
  onResult: (transcript: string, alternatives?: string[]) => void;
  onInterimResult?: (transcript: string, alternatives?: string[]) => void;
  onAudioLevel?: (level: number) => void;
  onError: (errorType: 'permission' | 'no-speech' | 'unavailable' | 'unknown') => void;
  onEnd: () => void;
  onStart?: () => void;
}

export const getRecognitionLocale = (lang: AppLanguage): string => {
  switch (lang) {
    case 'fr':
      return 'fr-FR';
    case 'ary':
      return 'ar-MA';
    case 'ar':
    default:
      return 'ar-SA';
  }
};

/**
 * Initializes microphone with hardware/software Auto Gain Control (AGC)
 * and feeds a Web Audio Analyser for live visual feedback.
 * AGC ensures soft / timid child speech is amplified so it easily triggers recognition.
 */
const startAudioMonitor = async (
  onAudioLevel?: (level: number) => void,
  onVoiceActivity?: () => void
): Promise<void> => {
  stopAudioMonitor();

  if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
    return;
  }

  try {
    // Requesting autoGainControl explicitly boosts quiet voices on the device
    // echoCancellation prevents speaker spill
    // noiseSuppression is disabled so high-pitched or soft child phonemes are not cut
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: false,
      },
    });
    mediaStream = stream;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtx) return;

    audioContext = new AudioCtx();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 128;
    analyserNode.smoothingTimeConstant = 0.4;
    source.connect(analyserNode);

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    audioLevelTimer = setInterval(() => {
      if (!analyserNode) return;
      analyserNode.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      // Map 0-128 average to 0-100%
      const normalizedLevel = Math.min(100, Math.round((average / 80) * 100));
      onAudioLevel?.(normalizedLevel);

      if (normalizedLevel > 12) {
        onVoiceActivity?.();
      }
    }, 50);
  } catch (err) {
    // MediaStream permission failure or browser restriction: fallback cleanly to SpeechRecognition
    console.debug('Audio monitor AGC fallback notice:', err);
  }
};

const stopAudioMonitor = (): void => {
  if (audioLevelTimer) {
    clearInterval(audioLevelTimer);
    audioLevelTimer = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // ignore
      }
    });
    mediaStream = null;
  }
  if (analyserNode) {
    try {
      analyserNode.disconnect();
    } catch {
      // ignore
    }
    analyserNode = null;
  }
  if (audioContext) {
    try {
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    } catch {
      // ignore
    }
    audioContext = null;
  }
};

/**
 * Starts listening to speech input safely with child-friendly optimizations:
 * - Interim streaming results for instant zero-lag validation
 * - Up to 6 alternatives extracted per utterance
 * - Hardware Auto Gain Control via Web Audio API to capture quiet voices
 * - Adaptive timeout that extends when a child is speaking
 */
export const startListening = (options: StartListeningOptions): void => {
  stopListening();
  isStoppingExplicitly = false;
  hasDeliveredFinalResult = false;
  lastResultAlternatives = [];

  if (!isSpeechRecognitionSupported()) {
    options.onError('unavailable');
    options.onEnd();
    return;
  }

  const win = window as unknown as IWindowSpeechRecognition;
  const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    options.onError('unavailable');
    options.onEnd();
    return;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    activeRecognition = recognition;

    recognition.lang = getRecognitionLocale(options.lang);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 6;

    const initialTimeoutMs = (options.timeoutSeconds || 9) * 1000;
    currentRemainingMs = initialTimeoutMs;

    const resetTimeoutTimer = (ms: number) => {
      if (listenTimeoutTimer) {
        clearTimeout(listenTimeoutTimer);
      }
      currentRemainingMs = ms;
      listenTimeoutTimer = setTimeout(() => {
        if (activeRecognition) {
          try {
            activeRecognition.stop();
          } catch {
            // ignore
          }
        }
      }, ms);
    };

    // Voice activity callback to extend listening window if child is speaking
    const handleVoiceActivity = () => {
      if (currentRemainingMs < 3500) {
        resetTimeoutTimer(3500);
      }
    };

    // Engage Auto Gain Control and Audio Monitor
    startAudioMonitor(options.onAudioLevel, handleVoiceActivity);

    recognition.onstart = () => {
      options.onStart?.();
      resetTimeoutTimer(initialTimeoutMs);
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      // Whenever speech result is received, extend timer slightly so child can finish
      handleVoiceActivity();

      const alternatives: string[] = [];
      let bestTranscript = '';
      let isFinalResult = false;

      if (event.results && event.results.length > 0) {
        // Collect transcripts from all available results and alternatives
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) isFinalResult = true;

          for (let j = 0; j < res.length; j++) {
            const text = res[j]?.transcript?.trim();
            if (text && !alternatives.includes(text)) {
              alternatives.push(text);
            }
          }
        }

        if (alternatives.length > 0) {
          bestTranscript = alternatives[0];
          lastResultAlternatives = [...alternatives];
        }
      }

      // 1. Emit interim result immediately for ultra-responsive early match
      if (options.onInterimResult && bestTranscript) {
        options.onInterimResult(bestTranscript, alternatives);
      }

      // 2. If browser finalized this segment, deliver onResult
      if (isFinalResult && bestTranscript && !hasDeliveredFinalResult) {
        hasDeliveredFinalResult = true;
        if (listenTimeoutTimer) {
          clearTimeout(listenTimeoutTimer);
          listenTimeoutTimer = null;
        }
        options.onResult(bestTranscript, alternatives);
      }
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      if (listenTimeoutTimer) {
        clearTimeout(listenTimeoutTimer);
        listenTimeoutTimer = null;
      }

      if (isStoppingExplicitly || event.error === 'aborted') {
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        options.onError('permission');
      } else if (event.error === 'no-speech') {
        // If we accumulated partial results, deliver them instead of failing on silence
        if (lastResultAlternatives.length > 0 && !hasDeliveredFinalResult) {
          hasDeliveredFinalResult = true;
          options.onResult(lastResultAlternatives[0], lastResultAlternatives);
        } else {
          options.onError('no-speech');
        }
      } else {
        options.onError('unknown');
      }
    };

    recognition.onend = () => {
      if (listenTimeoutTimer) {
        clearTimeout(listenTimeoutTimer);
        listenTimeoutTimer = null;
      }
      stopAudioMonitor();
      activeRecognition = null;

      // If recognition ended with unsubmitted results, deliver them cleanly
      if (lastResultAlternatives.length > 0 && !hasDeliveredFinalResult && !isStoppingExplicitly) {
        hasDeliveredFinalResult = true;
        options.onResult(lastResultAlternatives[0], lastResultAlternatives);
      }

      if (!isStoppingExplicitly) {
        options.onEnd();
      }
      isStoppingExplicitly = false;
    };

    recognition.start();
  } catch (err) {
    console.warn('Failed to start speech recognition', err);
    stopAudioMonitor();
    options.onError('unknown');
    options.onEnd();
  }
};

/**
 * Stop any active listening session cleanly and release microphone resources
 */
export const stopListening = (): void => {
  isStoppingExplicitly = true;
  if (listenTimeoutTimer) {
    clearTimeout(listenTimeoutTimer);
    listenTimeoutTimer = null;
  }
  stopAudioMonitor();
  if (activeRecognition) {
    try {
      activeRecognition.abort();
    } catch {
      // ignore
    }
    activeRecognition = null;
  }
  setTimeout(() => {
    isStoppingExplicitly = false;
  }, 100);
};
