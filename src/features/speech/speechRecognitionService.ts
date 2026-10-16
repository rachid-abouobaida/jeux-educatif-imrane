import { AppLanguage } from '../../types';

// Ambient definitions for Web Speech API to satisfy TypeScript strict mode
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: {
    length: number;
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface ISpeechRecognitionEvent extends Event {
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

export const isSpeechRecognitionSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as IWindowSpeechRecognition;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
};

export interface StartListeningOptions {
  lang: AppLanguage;
  timeoutSeconds?: number;
  onResult: (transcript: string) => void;
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
 * Starts listening to speech input safely with timeout and error handling
 */
export const startListening = (options: StartListeningOptions): void => {
  stopListening();

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
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    let receivedResult = false;

    recognition.onstart = () => {
      options.onStart?.();
      const timeoutMs = (options.timeoutSeconds || 6) * 1000;
      listenTimeoutTimer = setTimeout(() => {
        if (activeRecognition) {
          try {
            activeRecognition.stop();
          } catch {
            // ignore
          }
        }
      }, timeoutMs);
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      receivedResult = true;
      if (listenTimeoutTimer) {
        clearTimeout(listenTimeoutTimer);
        listenTimeoutTimer = null;
      }

      let bestTranscript = '';
      if (event.results && event.results.length > 0) {
        const result = event.results[0];
        if (result && result.length > 0) {
          bestTranscript = result[0].transcript;
        }
      }
      options.onResult(bestTranscript);
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      if (listenTimeoutTimer) {
        clearTimeout(listenTimeoutTimer);
        listenTimeoutTimer = null;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        options.onError('permission');
      } else if (event.error === 'no-speech') {
        options.onError('no-speech');
      } else {
        options.onError('unknown');
      }
    };

    recognition.onend = () => {
      if (listenTimeoutTimer) {
        clearTimeout(listenTimeoutTimer);
        listenTimeoutTimer = null;
      }
      if (!receivedResult) {
        // Recognition ended without results
      }
      activeRecognition = null;
      options.onEnd();
    };

    recognition.start();
  } catch (err) {
    console.warn('Failed to start speech recognition', err);
    options.onError('unknown');
    options.onEnd();
  }
};

/**
 * Stop any active listening session cleanly
 */
export const stopListening = (): void => {
  if (listenTimeoutTimer) {
    clearTimeout(listenTimeoutTimer);
    listenTimeoutTimer = null;
  }
  if (activeRecognition) {
    try {
      activeRecognition.abort();
    } catch {
      // ignore
    }
    activeRecognition = null;
  }
};
