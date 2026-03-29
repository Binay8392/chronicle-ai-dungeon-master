import { useState, useCallback, useRef } from 'react';
import { ModelManager, ModelCategory, EventBus } from '@runanywhere/web';

export type LoaderState = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

interface ModelLoaderResult {
  state: LoaderState;
  progress: number;
  error: string | null;
  ensure: () => Promise<boolean>;
}

/**
 * Hook to download + load models for a given category.
 * Tracks download progress and loading state.
 *
 * @param category - Which model category to ensure is loaded.
 * @param coexist  - If true, only unload same-category models (allows STT+LLM+TTS to coexist).
 */
export function useModelLoader(category: ModelCategory, coexist = false): ModelLoaderResult {
  const [state, setState] = useState<LoaderState>(() =>
    ModelManager.getLoadedModel(category) ? 'ready' : 'idle',
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inflightRef = useRef<Promise<boolean> | null>(null);

  const ensure = useCallback(async (): Promise<boolean> => {
    // Already loaded
    if (ModelManager.getLoadedModel(category)) {
      setState('ready');
      setError(null);
      setProgress(1);
      return true;
    }

    if (inflightRef.current) {
      return inflightRef.current;
    }

    const task = (async (): Promise<boolean> => {
      setError(null);

      let unsubDownloadProgress: (() => void) | null = null;

      try {
        // Find a model for this category
        const models = ModelManager.getModels().filter((m) => m.modality === category);
        if (models.length === 0) {
          setError(`No ${category} model registered`);
          setState('error');
          return false;
        }

        const model = models[0];

        // Download if needed
        if (model.status !== 'downloaded' && model.status !== 'loaded') {
          setState('downloading');
          setProgress(0);

          unsubDownloadProgress = EventBus.shared.on('model.downloadProgress', (evt) => {
            if (evt.modelId === model.id) {
              setProgress(evt.progress ?? 0);
            }
          });

          await ModelManager.downloadModel(model.id);
          setProgress(1);
        }

        // Load
        setState('loading');
        const ok = await ModelManager.loadModel(model.id, { coexist });
        if (ok) {
          setState('ready');
          setError(null);
          setProgress(1);
          return true;
        } else {
          setError('Failed to load model');
          setState('error');
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setState('error');
        return false;
      } finally {
        unsubDownloadProgress?.();
        inflightRef.current = null;
      }
    })();

    inflightRef.current = task;
    return task;
  }, [category, coexist]);

  return { state, progress, error, ensure };
}
