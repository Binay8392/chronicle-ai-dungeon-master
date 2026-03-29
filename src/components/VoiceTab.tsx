import { useState, useRef, useCallback, useEffect } from 'react';
import {
  VoicePipeline,
  ModelCategory,
  ModelManager,
  AudioCapture,
  AudioPlayback,
  SpeechActivity,
} from '@runanywhere/web';
import { VAD } from '@runanywhere/web-onnx';
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelBanner } from './ModelBanner';

type VoiceState = 'idle' | 'loading-models' | 'listening' | 'processing' | 'speaking';

function mapMicrophoneError(err: unknown): string {
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
    return 'Microphone is in use by another application.';
  }
  return `Microphone error: ${message}`;
}

export function VoiceTab() {
  const llmLoader = useModelLoader(ModelCategory.Language, true);
  const sttLoader = useModelLoader(ModelCategory.SpeechRecognition, true);
  const ttsLoader = useModelLoader(ModelCategory.SpeechSynthesis, true);
  const vadLoader = useModelLoader(ModelCategory.Audio, true);

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const micRef = useRef<AudioCapture | null>(null);
  const pipelineRef = useRef<VoicePipeline | null>(null);
  const vadUnsubRef = useRef<(() => void) | null>(null);
  const processingRef = useRef(false);

  const cleanupListening = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;
    vadUnsubRef.current?.();
    vadUnsubRef.current = null;
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupListening();
    };
  }, [cleanupListening]);

  // Ensure all 4 models are loaded
  const ensureModels = useCallback(async (): Promise<boolean> => {
    setVoiceState('loading-models');
    setError(null);

    const results = await Promise.all([
      vadLoader.ensure(),
      sttLoader.ensure(),
      llmLoader.ensure(),
      ttsLoader.ensure(),
    ]);

    if (results.every(Boolean)) {
      setVoiceState('idle');
      return true;
    }

    setError('Failed to load one or more voice models');
    setVoiceState('idle');
    return false;
  }, [vadLoader, sttLoader, llmLoader, ttsLoader]);

  // Process a speech segment through the full pipeline
  const processSpeech = useCallback(async (audioData: Float32Array) => {
    if (processingRef.current) return;

    const pipeline = pipelineRef.current;
    if (!pipeline) return;

    processingRef.current = true;

    // Stop mic during processing
    cleanupListening();
    setVoiceState('processing');

    try {
      const result = await pipeline.processTurn(audioData, {
        maxTokens: 60,
        temperature: 0.7,
        systemPrompt: 'You are a helpful voice assistant. Keep responses concise - 1-2 sentences max.',
      }, {
        onTranscription: (text) => {
          setTranscript(text);
        },
        onResponseToken: (_token, accumulated) => {
          setResponse(accumulated);
        },
        onResponseComplete: (text) => {
          setResponse(text);
        },
        onSynthesisComplete: async (audio, sampleRate) => {
          setVoiceState('speaking');
          const player = new AudioPlayback({ sampleRate });
          await player.play(audio, sampleRate);
          player.dispose();
        },
        onStateChange: (s) => {
          if (s === 'processingSTT' || s === 'generatingResponse') setVoiceState('processing');
          if (s === 'playingTTS') setVoiceState('speaking');
        },
      });

      if (result) {
        setTranscript(result.transcription);
        setResponse(result.response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      processingRef.current = false;
      setVoiceState('idle');
      setAudioLevel(0);
    }
  }, [cleanupListening]);

  // Start listening
  const startListening = useCallback(async () => {
    setTranscript('');
    setResponse('');
    setError(null);
    cleanupListening();

    // Load models if needed
    const anyMissing = !ModelManager.getLoadedModel(ModelCategory.Audio)
      || !ModelManager.getLoadedModel(ModelCategory.SpeechRecognition)
      || !ModelManager.getLoadedModel(ModelCategory.Language)
      || !ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis);

    if (anyMissing) {
      const ok = await ensureModels();
      if (!ok) return;
    }

    if (!pipelineRef.current) {
      pipelineRef.current = new VoicePipeline();
    }

    const mic = new AudioCapture({ sampleRate: 16000 });
    micRef.current = mic;

    // Start VAD + mic
    VAD.reset();
    vadUnsubRef.current = VAD.onSpeechActivity((activity) => {
      if (activity !== SpeechActivity.Ended || processingRef.current) return;

      const segment = VAD.popSpeechSegment();
      if (segment && segment.samples.length > 1600) {
        void processSpeech(segment.samples);
      }
    });

    try {
      await mic.start(
        (chunk) => {
          VAD.processSamples(chunk);
        },
        (level) => {
          setAudioLevel(level);
        },
      );
      setVoiceState('listening');
    } catch (err) {
      cleanupListening();
      setVoiceState('idle');
      setError(mapMicrophoneError(err));
    }
  }, [cleanupListening, ensureModels, processSpeech]);

  const stopListening = useCallback(() => {
    cleanupListening();
    setVoiceState('idle');
    setAudioLevel(0);
  }, [cleanupListening]);

  // Which loaders are still loading?
  const pendingLoaders = [
    { label: 'VAD', loader: vadLoader },
    { label: 'STT', loader: sttLoader },
    { label: 'LLM', loader: llmLoader },
    { label: 'TTS', loader: ttsLoader },
  ].filter((l) => l.loader.state !== 'ready');

  return (
    <div className="tab-panel voice-panel">
      {pendingLoaders.length > 0 && voiceState === 'idle' && (
        <ModelBanner
          state={pendingLoaders[0].loader.state}
          progress={pendingLoaders[0].loader.progress}
          error={pendingLoaders[0].loader.error}
          onLoad={ensureModels}
          label={`Voice (${pendingLoaders.map((l) => l.label).join(', ')})`}
        />
      )}

      {error && <div className="model-banner"><span className="error-text">{error}</span></div>}

      <div className="voice-center">
        <div className="voice-orb" data-state={voiceState} style={{ '--level': audioLevel } as React.CSSProperties}>
          <div className="voice-orb-inner" />
        </div>

        <p className="voice-status">
          {voiceState === 'idle' && 'Tap to start listening'}
          {voiceState === 'loading-models' && 'Loading models...'}
          {voiceState === 'listening' && 'Listening... speak now'}
          {voiceState === 'processing' && 'Processing...'}
          {voiceState === 'speaking' && 'Speaking...'}
        </p>

        {voiceState === 'idle' || voiceState === 'loading-models' ? (
          <button
            className="btn btn-primary btn-lg"
            onClick={() => { void startListening(); }}
            disabled={voiceState === 'loading-models'}
          >
            Start Listening
          </button>
        ) : voiceState === 'listening' ? (
          <button className="btn btn-lg" onClick={stopListening}>
            Stop
          </button>
        ) : null}
      </div>

      {transcript && (
        <div className="voice-transcript">
          <h4>You said:</h4>
          <p>{transcript}</p>
        </div>
      )}

      {response && (
        <div className="voice-response">
          <h4>AI response:</h4>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}
