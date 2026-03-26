import { useState, useEffect } from 'react';
import { ModelManager } from '../runanywhere';
import type { ModelLoadState } from '../types/documind';

interface ModelLoaderProps {
  onReady: () => void;
}

export function ModelLoader({ onReady }: ModelLoaderProps) {
  const [loadState, setLoadState] = useState<ModelLoadState>({
    isLoading: false,
    isReady: false,
    progress: 0,
    error: null,
    modelName: null,
  });

  const [hasWebGPU, setHasWebGPU] = useState<boolean | null>(null);

  // Check WebGPU support
  useEffect(() => {
    const checkWebGPU = async () => {
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu?.requestAdapter();
          setHasWebGPU(!!adapter);
        } catch {
          setHasWebGPU(false);
        }
      } else {
        setHasWebGPU(false);
      }
    };
    checkWebGPU();
  }, []);

  // Load model
  const loadModel = async () => {
    const modelId = 'lfm2-350m-q4_k_m'; // Using the small fast model
    
    setLoadState({
      isLoading: true,
      isReady: false,
      progress: 0,
      error: null,
      modelName: 'LFM2 350M',
    });

    try {
      // Check if model needs downloading
      const models = ModelManager.getModels();
      const model = models.find(m => m.id === modelId);
      
      if (model && model.status !== 'downloaded' && model.status !== 'loaded') {
        await ModelManager.downloadModel(modelId);
      }

      // Load the model
      const success = await ModelManager.loadModel(modelId);
      
      if (!success) {
        throw new Error('Failed to load model');
      }

      setLoadState(prev => ({
        ...prev,
        isLoading: false,
        isReady: true,
        progress: 100,
      }));

      onReady();
    } catch (err) {
      setLoadState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load model',
      }));
    }
  };

  // WebGPU detection UI
  if (hasWebGPU === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Detecting hardware capabilities...</p>
      </div>
    );
  }

  // WebGPU not supported
  if (hasWebGPU === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 px-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">WebGPU Not Supported</h1>
          <p className="text-gray-700 mb-6">
            DocuMind requires WebGPU to run AI models locally in your browser. 
            Please use a modern browser with WebGPU support:
          </p>
          <ul className="text-left text-gray-600 space-y-2 mb-6">
            <li>✓ Chrome 113+ (Recommended)</li>
            <li>✓ Edge 113+</li>
            <li>✓ Opera 99+</li>
          </ul>
          <p className="text-sm text-gray-500">
            Note: Firefox and Safari support is coming soon
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadState.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 px-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Model Load Error</h1>
          <p className="text-gray-700 mb-6">{loadState.error}</p>
          <button
            onClick={loadModel}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Model ready
  if (loadState.isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Model Ready!</h1>
          <p className="text-gray-600">Initializing DocuMind...</p>
        </div>
      </div>
    );
  }

  // Loading / Initial state
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo and Branding */}
        <div className="mb-8">
          <div className="text-7xl mb-4">📝</div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">DocuMind</h1>
          <p className="text-xl text-gray-600 italic">
            Your code. Your docs. Your device.
          </p>
        </div>

        {/* WebGPU Badge */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
            ✓ WebGPU Supported
          </span>
        </div>

        {/* Loading state */}
        {loadState.isLoading ? (
          <div className="space-y-4">
            <p className="text-gray-700 font-medium">Loading {loadState.modelName}...</p>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${loadState.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">{loadState.progress}% complete</p>
            <p className="text-xs text-gray-400">First load: ~5-10MB download</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-700 mb-4">
              All AI inference runs locally in your browser. No cloud APIs. No data transmission.
            </p>
            <button
              onClick={loadModel}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Load Model & Start
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Model: LFM2 350M (optimized for code analysis)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
