/**
 * DocuMind TypeScript Types
 */

export type CodeLanguage = 'javascript' | 'typescript' | 'python' | 'java' | 'cpp' | 'go';

export interface LanguageInfo {
  id: CodeLanguage;
  label: string;
  monacoId: string;
  extension: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript', extension: '.js' },
  { id: 'typescript', label: 'TypeScript', monacoId: 'typescript', extension: '.ts' },
  { id: 'python', label: 'Python', monacoId: 'python', extension: '.py' },
  { id: 'java', label: 'Java', monacoId: 'java', extension: '.java' },
  { id: 'cpp', label: 'C++', monacoId: 'cpp', extension: '.cpp' },
  { id: 'go', label: 'Go', monacoId: 'go', extension: '.go' },
];

export interface AppState {
  code: string;
  language: CodeLanguage;
  documentation: string;
  isGenerating: boolean;
}

export interface ModelLoadState {
  isLoading: boolean;
  isReady: boolean;
  progress: number;
  error: string | null;
  modelName: string | null;
}
