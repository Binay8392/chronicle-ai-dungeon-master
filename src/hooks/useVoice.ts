import { useCallback, useRef, useState } from 'react';
import { ModelCategory, AudioCapture, AudioPlayback } from '@runanywhere/web';
import { STT, TTS } from '@runanywhere/web-onnx';
import { useModelLoader } from './useModelLoader';

interface UseVoiceResult {
  sttReady: boolean;
  ttsReady: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  startRecording: () => Promise<string | null>;
  stopRecording: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  ensureSTT: () => Promise<boolean>;
  ensureTTS: () => Promise<boolean>;
}

export function useVoice(): UseVoiceResult {
  const sttLoader = useModelLoader(ModelCategory.SpeechRecognition, true);
  const ttsLoader = useModelLoader(ModelCategory.SpeechSynthesis, true);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const micRef = useRef<AudioCapture | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const playbackRef = useRef<AudioPlayback | null>(null);

  const ensureSTT = useCallback(async () => {
    return await sttLoader.ensure();
  }, [sttLoader]);

  const ensureTTS = useCallback(async () => {
    return await ttsLoader.ensure();
  }, [ttsLoader]);

  const startRecording = useCallback(async (): Promise<string | null> => {
    if (sttLoader.state !== 'ready') {
      const ok = await ensureSTT();
      if (!ok) return null;
    }

    try {
      // Start microphone
      const mic = new AudioCapture({ sampleRate: 16000 });
      micRef.current = mic;
      audioBufferRef.current = [];
      setIsRecording(true);

      // Collect audio for 3 seconds (simple approach)
      return new Promise((resolve) => {
        mic.start(
          (chunk) => {
            audioBufferRef.current.push(chunk);
          }
        );

        setTimeout(async () => {
          mic.stop();
          setIsRecording(false);

          // Concatenate all audio chunks
          const totalLength = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
          const combined = new Float32Array(totalLength);
          let offset = 0;
          for (const chunk of audioBufferRef.current) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }

          // Transcribe
          if (combined.length > 0) {
            try {
              const result = await STT.transcribe(combined);
              resolve(result.text || null);
            } catch (err) {
              console.error('STT error:', err);
              resolve(null);
            }
          } else {
            resolve(null);
          }

          audioBufferRef.current = [];
        }, 3000); // Record for 3 seconds
      });
    } catch (err) {
      console.error('Recording error:', err);
      setIsRecording(false);
      return null;
    }
  }, [sttLoader.state, ensureSTT]);

  const stopRecording = useCallback(() => {
    micRef.current?.stop();
    setIsRecording(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (ttsLoader.state !== 'ready') {
      const ok = await ensureTTS();
      if (!ok) return;
    }

    try {
      setIsSpeaking(true);
      const result = await TTS.synthesize(text);
      
      if (result.audio && result.sampleRate) {
        const playback = new AudioPlayback({ sampleRate: result.sampleRate });
        playbackRef.current = playback;
        await playback.play(result.audio as Float32Array, result.sampleRate);
        playback.dispose();
      }
    } catch (err) {
      console.error('TTS error:', err);
    } finally {
      setIsSpeaking(false);
      playbackRef.current = null;
    }
  }, [ttsLoader.state, ensureTTS]);

  const stopSpeaking = useCallback(() => {
    playbackRef.current?.stop();
    setIsSpeaking(false);
  }, []);

  return {
    sttReady: sttLoader.state === 'ready',
    ttsReady: ttsLoader.state === 'ready',
    isRecording,
    isSpeaking,
    startRecording,
    stopRecording,
    speak,
    stopSpeaking,
    ensureSTT,
    ensureTTS,
  };
}
