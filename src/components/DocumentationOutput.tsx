import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';

interface DocumentationOutputProps {
  documentation: string;
  isGenerating: boolean;
}

export function DocumentationOutput({ documentation, isGenerating }: DocumentationOutputProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(documentation);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadMd = () => {
    const blob = new Blob([documentation], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documentation-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([documentation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documentation-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Documentation Output</h2>
        
        {documentation && !isGenerating && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              title="Copy to clipboard"
            >
              {copySuccess ? (
                <>
                  <span>✓</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copy</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleDownloadMd}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-1.5"
              title="Download as Markdown"
            >
              <span>⬇️</span>
              <span>.md</span>
            </button>
            
            <button
              onClick={handleDownloadTxt}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-1.5"
              title="Download as Text"
            >
              <span>⬇️</span>
              <span>.txt</span>
            </button>
          </div>
        )}
      </div>

      {/* Documentation content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 font-medium">Generating documentation...</p>
            <p className="text-sm text-gray-400 mt-2">AI is analyzing your code</p>
          </div>
        ) : documentation ? (
          <div className="markdown-output">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {documentation}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-lg font-medium text-gray-500">No documentation yet</p>
            <p className="text-sm mt-2">
              Paste your code in the left panel and click "Generate Docs"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
