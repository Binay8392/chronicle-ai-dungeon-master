import { useCallback, useEffect, useRef, useState } from 'react';
import { ModelCategory, AudioCapture, AudioPlayback } from '@runanywhere/web';
import { STT, TTS } from '@runanywhere/web-onnx';
import { useModelLoader } from './useModelLoader';

interface UseVoiceResult {
  sttReady: boolean;
  ttsReady: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  isSpeaking: boolean;
  lastError: string | null;
  startRecording: () => Promise<string | null>;
  stopRecording: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  ensureSTT: () => Promise<boolean>;
  ensureTTS: () => Promise<boolean>;
}

type RecordingStopReason = 'manual' | 'silence' | 'max-duration' | 'no-speech';

const SAMPLE_RATE = 16000;
const MAX_RECORDING_MS = 10000;
const MIN_RECORDING_MS = 1200;
const SILENCE_AUTO_STOP_MS = 1800;
const INITIAL_SPEECH_TIMEOUT_MS = 5000;
const MIN_SPEECH_RMS = 0.006;

export function useVoice(): UseVoiceResult {
  const sttLoader = useModelLoader(ModelCategory.SpeechRecognition, true);
  const ttsLoader = useModelLoader(ModelCategory.SpeechSynthesis, true);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const micRef = useRef<AudioCapture | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const playbackRef = useRef<AudioPlayback | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingResolveRef = useRef<((value: string | null) => void) | null>(null);
  const recordingPromiseRef = useRef<Promise<string | null> | null>(null);
  const finishingRecordingRef = useRef(false);
  const recordingStartedAtRef = useRef<number>(0);
  const lastSpeechAtRef = useRef<number>(0);
  const speechDetectedRef = useRef(false);
  const noiseFloorRmsRef = useRef<number>(0.002);

  const clearRecordingTimers = useCallback(() => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
  }, []);

  const resetRecordingTracking = useCallback(() => {
    recordingStartedAtRef.current = 0;
    lastSpeechAtRef.current = 0;
    speechDetectedRef.current = false;
    noiseFloorRmsRef.current = 0.002;
  }, []);

  const computeRms = useCallback((samples: Float32Array): number => {
    if (samples.length === 0) return 0;
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const x = samples[i];
      sumSquares += x * x;
    }
    return Math.sqrt(sumSquares / samples.length);
  }, []);

  const normalizeForSTT = useCallback((samples: Float32Array): Float32Array => {
    if (samples.length === 0) return samples;

    let mean = 0;
    for (let i = 0; i < samples.length; i += 1) {
      mean += samples[i];
    }
    mean /= samples.length;

    const centered = new Float32Array(samples.length);
    let peak = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const v = samples[i] - mean;
      centered[i] = v;
      const abs = Math.abs(v);
      if (abs > peak) peak = abs;
    }

    if (peak < 1e-4) {
      return centered;
    }

    const targetPeak = 0.85;
    const gain = Math.min(8, targetPeak / peak);
    if (gain <= 1.05) {
      return centered;
    }

    for (let i = 0; i < centered.length; i += 1) {
      centered[i] *= gain;
    }
    return centered;
  }, []);

  const mapMicrophoneError = useCallback((err: unknown): string => {
    const message = err instanceof Error ? err.message : String(err);
    const normalized = message.toLowerCase();
    const secureContext = typeof window !== 'undefined' ? window.isSecureContext : true;

    if (!secureContext) {
      return 'Microphone access needs HTTPS (or localhost). Open the app over a secure origin and try again.';
    }
    if (normalized.includes('notallowed') || normalized.includes('permission')) {
      return 'Microphone permission was denied. Allow microphone access in your browser site settings, then retry.';
    }
    if (normalized.includes('notfound') || normalized.includes('devicesnotfound')) {
      return 'No microphone was found on this device.';
    }
    if (normalized.includes('notreadable') || normalized.includes('trackstarterror')) {
      return 'Microphone is busy in another app. Close other recording apps and retry.';
    }
    if (normalized.includes('overconstrained') || normalized.includes('constraint')) {
      return 'Your microphone does not support the requested audio settings.';
    }
    return `Microphone error: ${message}`;
  }, []);

  const combineAudioChunks = useCallback((): Float32Array => {
    const totalLength = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioBufferRef.current) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined;
  }, []);

  const finishRecording = useCallback(async (reason: RecordingStopReason = 'manual') => {
    if (finishingRecordingRef.current) return;
    finishingRecordingRef.current = true;

    clearRecordingTimers();
    micRef.current?.stop();
    micRef.current = null;
    setIsRecording(false);
    setIsTranscribing(true);

    const resolve = recordingResolveRef.current;
    recordingResolveRef.current = null;
    recordingPromiseRef.current = null;

    try {
      const combined = combineAudioChunks();
      const hadSpeech = speechDetectedRef.current;
      audioBufferRef.current = [];

      if (!hadSpeech && reason === 'no-speech' && combined.length < SAMPLE_RATE / 2) {
        setLastError('No speech detected. Speak clearly and try again.');
        resolve?.(null);
        return;
      }

      if (combined.length === 0) {
        setLastError('No audio captured. Please try again.');
        resolve?.(null);
        return;
      }

      const prepared = normalizeForSTT(combined);
      const result = await STT.transcribe(prepared, { sampleRate: SAMPLE_RATE });
      const transcript = result.text?.trim() || null;

      if (!transcript) {
        setLastError('I could not understand that. Try speaking a bit louder and slower.');
        resolve?.(null);
        return;
      }

      setLastError(null);
      resolve?.(transcript);
    } catch (err) {
      console.error('STT error:', err);
      setLastError('Could not transcribe the recorded audio. Please try again.');
      resolve?.(null);
    } finally {
      setIsTranscribing(false);
      resetRecordingTracking();
      finishingRecordingRef.current = false;
    }
  }, [clearRecordingTimers, combineAudioChunks, resetRecordingTracking]);

  const startMicWithFallback = useCallback(async (
    onLevel?: (level: number) => void,
    onChunk?: (chunk: Float32Array) => void,
  ) => {
    let lastStartError: unknown = null;

    for (const channels of [1, 2]) {
      const mic = new AudioCapture({ sampleRate: SAMPLE_RATE, channels });
      try {
        await mic.start(
          (chunk) => {
            audioBufferRef.current.push(chunk);
            onChunk?.(chunk);
          },
          onLevel,
        );
        return mic;
      } catch (err) {
        mic.stop();
        lastStartError = err;

        const errorText = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
        const canRetryWithDifferentChannels = errorText.includes('constraint') || errorText.includes('overconstrained');
        if (!canRetryWithDifferentChannels) {
          break;
        }
      }
    }

    throw lastStartError ?? new Error('Unable to start microphone');
  }, []);

  const ensureSTT = useCallback(async () => {
    return await sttLoader.ensure();
  }, [sttLoader]);

  const ensureTTS = useCallback(async () => {
    return await ttsLoader.ensure();
  }, [ttsLoader]);

  const startRecording = useCallback(async (): Promise<string | null> => {
    setLastError(null);

    if (recordingPromiseRef.current) {
      return recordingPromiseRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = 'This browser does not support microphone capture.';
      setLastError(msg);
      return null;
    }

    if (sttLoader.state !== 'ready') {
      const ok = await ensureSTT();
      if (!ok) {
        setLastError(sttLoader.error || 'Speech model failed to load.');
        return null;
      }
    }

    audioBufferRef.current = [];
    resetRecordingTracking();

    const recordingPromise = new Promise<string | null>((resolve) => {
      recordingResolveRef.current = resolve;
    });
    recordingPromiseRef.current = recordingPromise;

    try {
      const mic = await startMicWithFallback(undefined, (chunk) => {
        const rms = computeRms(chunk);

        // Continuously adapt a conservative noise floor from low-energy frames.
        if (rms < noiseFloorRmsRef.current * 1.8) {
          noiseFloorRmsRef.current = noiseFloorRmsRef.current * 0.95 + rms * 0.05;
        }

        const dynamicThreshold = Math.max(MIN_SPEECH_RMS, noiseFloorRmsRef.current * 3.2);
        if (rms >= dynamicThreshold) {
          const now = Date.now();
          speechDetectedRef.current = true;
          lastSpeechAtRef.current = now;
        }
      });

      const startTs = Date.now();
      recordingStartedAtRef.current = startTs;
      lastSpeechAtRef.current = startTs;
      micRef.current = mic;
      setIsRecording(true);

      recordingTimerRef.current = setTimeout(() => {
        void finishRecording('max-duration');
      }, MAX_RECORDING_MS);

      silenceIntervalRef.current = setInterval(() => {
        if (!micRef.current?.isCapturing) return;

        const now = Date.now();
        const elapsed = now - recordingStartedAtRef.current;

        if (!speechDetectedRef.current && elapsed >= INITIAL_SPEECH_TIMEOUT_MS) {
          void finishRecording('no-speech');
          return;
        }

        if (
          speechDetectedRef.current
          && elapsed >= MIN_RECORDING_MS
          && now - lastSpeechAtRef.current >= SILENCE_AUTO_STOP_MS
        ) {
          void finishRecording('silence');
        }
      }, 120);

      return recordingPromise;
    } catch (err) {
      const message = mapMicrophoneError(err);
      console.error('Recording error:', err);
      setLastError(message);
      clearRecordingTimers();
      micRef.current?.stop();
      micRef.current = null;
      setIsRecording(false);
      setIsTranscribing(false);
      audioBufferRef.current = [];

      recordingPromiseRef.current = null;
      recordingResolveRef.current = null;
      resetRecordingTracking();
      return null;
    }
  }, [
    sttLoader.state,
    sttLoader.error,
    ensureSTT,
    startMicWithFallback,
    computeRms,
    finishRecording,
    mapMicrophoneError,
    clearRecordingTimers,
    resetRecordingTracking,
  ]);

  const stopRecording = useCallback(() => {
    if (!micRef.current && !recordingPromiseRef.current) {
      return;
    }

    void finishRecording('manual');
  }, [finishRecording]);

  const speak = useCallback(async (text: string) => {
    if (ttsLoader.state !== 'ready') {
      const ok = await ensureTTS();
      if (!ok) return;
    }

    try {
      setIsSpeaking(true);
      setLastError(null);
      const result = await TTS.synthesize(text);

      if (result.audio && result.sampleRate) {
        const playback = new AudioPlayback({ sampleRate: result.sampleRate });
        playbackRef.current = playback;
        await playback.play(result.audio as Float32Array, result.sampleRate);
        playback.dispose();
      }
    } catch (err) {
      console.error('TTS error:', err);
      setLastError('Voice narration failed. Try again in a moment.');
    } finally {
      setIsSpeaking(false);
      playbackRef.current = null;
    }
  }, [ttsLoader.state, ensureTTS]);

  const stopSpeaking = useCallback(() => {
    playbackRef.current?.stop();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      clearRecordingTimers();
      micRef.current?.stop();
      playbackRef.current?.stop();
      recordingResolveRef.current?.(null);
      recordingResolveRef.current = null;
      recordingPromiseRef.current = null;
      finishingRecordingRef.current = false;
      resetRecordingTracking();
    };
  }, [clearRecordingTimers, resetRecordingTracking]);

  return {
    sttReady: sttLoader.state === 'ready',
    ttsReady: ttsLoader.state === 'ready',
    isRecording,
    isTranscribing,
    isSpeaking,
    lastError,
    startRecording,
    stopRecording,
    speak,
    stopSpeaking,
    ensureSTT,
    ensureTTS,
  };
}
