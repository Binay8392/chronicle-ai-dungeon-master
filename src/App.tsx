import { useState, useEffect } from 'react';
import { initSDK } from './runanywhere';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { ModelLoader } from './components/ModelLoader';
import { CodeEditor } from './components/CodeEditor';
import { DocumentationOutput } from './components/DocumentationOutput';
import { createDocumentationPrompt } from './utils/documentation';
import type { CodeLanguage } from './types/documind';

const DEFAULT_CODE = `// Paste your code here or try the example below

function calculateTotal(items, taxRate = 0.08) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  
  return {
    subtotal,
    tax,
    total
  };
}`;

export function App() {
  const [sdkReady, setSdkReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState<CodeLanguage>('javascript');
  const [documentation, setDocumentation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize SDK
  useEffect(() => {
    initSDK()
      .then(() => setSdkReady(true))
      .catch((err) => {
        console.error('SDK init failed:', err);
      });
  }, []);

  // Generate documentation using RunAnywhere LLM
  const handleGenerateDocs = async () => {
    if (!code.trim() || !modelReady) return;

    setIsGenerating(true);
    setDocumentation('');

    try {
      const prompt = createDocumentationPrompt(code, language);
      
      // Use TextGeneration.generateStream for streaming
      const { stream, result } = await TextGeneration.generateStream(prompt, {
        temperature: 0.3,
        maxTokens: 512,  // Reduced for faster generation; docs are concise
        topP: 0.9,
      });

      // Stream the response
      let fullResponse = '';
      for await (const token of stream) {
        fullResponse += token;
        setDocumentation(fullResponse);
      }

      // Wait for final result
      await result;

    } catch (err) {
      console.error('Documentation generation failed:', err);
      setDocumentation(`# Error\n\nFailed to generate documentation: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Show ModelLoader if SDK is ready but model is not
  if (sdkReady && !modelReady) {
    return <ModelLoader onReady={() => setModelReady(true)} />;
  }

  // Show loading screen while SDK initializes
  if (!sdkReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Initializing DocuMind...</p>
      </div>
    );
  }

  // Main application UI
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📝</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">DocuMind</h1>
              <p className="text-sm text-gray-500 italic">Your code. Your docs. Your device.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
              ✓ Model Ready
            </span>
            <button
              onClick={handleGenerateDocs}
              disabled={isGenerating || !code.trim()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isGenerating ? 'Generating...' : 'Generate Docs'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Two Panel Layout */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-screen-2xl mx-auto h-full px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left Panel - Code Editor */}
            <div className="h-full min-h-[400px]">
              <CodeEditor
                code={code}
                language={language}
                onCodeChange={setCode}
                onLanguageChange={setLanguage}
              />
            </div>

            {/* Right Panel - Documentation Output */}
            <div className="h-full min-h-[400px]">
              <DocumentationOutput
                documentation={documentation}
                isGenerating={isGenerating}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-3">
        <div className="max-w-screen-2xl mx-auto px-6">
          <p className="text-center text-xs text-gray-500">
            Powered by RunAnywhere SDK • All AI runs locally in your browser • No data transmission
          </p>
        </div>
      </footer>
    </div>
  );
}
