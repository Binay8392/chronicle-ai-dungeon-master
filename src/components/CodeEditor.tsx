import Editor from '@monaco-editor/react';
import type { CodeLanguage } from '../types/documind';
import { SUPPORTED_LANGUAGES } from '../types/documind';

interface CodeEditorProps {
  code: string;
  language: CodeLanguage;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: CodeLanguage) => void;
}

export function CodeEditor({ code, language, onCodeChange, onLanguageChange }: CodeEditorProps) {
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.id === language);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header with language selector */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Code Input</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="language-selector" className="text-sm text-gray-600 font-medium">
            Language:
          </label>
          <select
            id="language-selector"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as CodeLanguage)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={currentLang?.monacoId || 'javascript'}
          value={code}
          onChange={(value) => onCodeChange(value || '')}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>
    </div>
  );
}
