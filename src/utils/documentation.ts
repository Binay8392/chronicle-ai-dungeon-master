/**
 * DocuMind - System Prompt for Documentation Generation
 */

import type { CodeLanguage } from '../types/documind';

export function createDocumentationPrompt(code: string, language: CodeLanguage): string {
  return `Document this ${language} code. Output ONLY valid Markdown. No preamble.

## Overview
1-2 sentences describing what the code does.

## Parameters
For each function parameter: name, type, description (table format).

## Usage
One short runnable example.

Code:
\`\`\`${language}
${code}
\`\`\``;
}
