# DocuMind - AI Code Documentation Generator

An AI-powered code documentation generator built for HackXtreme. All AI inference runs **locally in your browser** using on-device LLMs via the RunAnywhere SDK. No cloud APIs. No backend. Zero data transmission.

![DocuMind](https://img.shields.io/badge/HackXtreme-2026-gold) ![RunAnywhere](https://img.shields.io/badge/RunAnywhere-SDK-orange) ![React](https://img.shields.io/badge/React-19-blue)

## Features

### 📝 Smart Documentation Generation
- **AI-Powered Analysis**: Local LLM analyzes your code and generates professional documentation
- **Multi-Language Support**: JavaScript, TypeScript, Python, Java, C++, and Go
- **Structured Output**: Generates Overview, Functions/Methods tables, Return values, Usage examples, and Edge cases
- **Real-time Streaming**: See documentation generate in real-time as the AI thinks

### 🎨 Modern Editor Interface
- **Monaco Editor**: Syntax-highlighted code input with IntelliSense
- **Language Selector**: Easy switching between supported programming languages
- **Two-Panel Layout**: Code on the left, documentation on the right
- **Responsive Design**: Works on desktop, tablet, and mobile

### 🤖 On-Device AI
- **Local LLM**: LFM2 350M model runs entirely in your browser via WebGPU/WASM
- **No Internet Required**: After initial load, everything runs offline
- **Privacy-First**: Your code never leaves your device
- **WebGPU Detection**: Automatic hardware capability detection with friendly fallbacks

### 📤 Export & Share
- **Copy to Clipboard**: One-click copy of generated documentation
- **Download as Markdown**: Export docs as `.md` file
- **Download as Text**: Export docs as `.txt` file
- **Professional Formatting**: Clean, readable markdown output

## Getting Started

### Prerequisites
- Node.js 16+
- Modern browser with WebGPU support (Chrome 113+, Edge 113+)

### Installation

```bash
# Clone the repo
git clone https://github.com/RunanywhereAI/web-starter-app.git
cd web-starter-app

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:5173 in your browser.

### First Run
1. **WebGPU Check**: The app detects if your browser supports WebGPU
2. **Model Loading**: Click "Load Model & Start" to download the LFM2 350M model (~5-10MB)
3. **Code Input**: Paste your code in the left panel or use the provided example
4. **Generate**: Click "Generate Docs" to create documentation
5. **Export**: Copy or download the generated documentation

## Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Editor**: Monaco Editor (VS Code's editor)
- **Markdown**: react-markdown with GitHub Flavored Markdown
- **AI**: RunAnywhere Web SDK v0.1.0-beta.10
  - `@runanywhere/web` - Core SDK
  - `@runanywhere/web-llamacpp` - Local LLM inference (LFM2 350M)
- **TypeScript**: Full type safety

## Deployment

### Vercel

```bash
npm run build
npx vercel --prod
```

The included `vercel.json` sets the required Cross-Origin-Isolation headers.

### Any Static Host

Serve the `dist/` folder with these HTTP headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

## Browser Requirements

- Chrome 96+ or Edge 96+ (recommended: 120+)
- WebAssembly (required)
- SharedArrayBuffer (requires Cross-Origin Isolation headers)
- OPFS (for persistent model cache)
- WebGPU (optional, for GPU acceleration)

## Credits

- **Built for**: HackXtreme Hackathon 2026
- **AI SDK**: [RunAnywhere](https://runanywhere.ai)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Markdown**: [react-markdown](https://github.com/remarkjs/react-markdown)

## License

MIT License - Built for educational purposes.

---

**Ready to document your code?** 📝

Run `npm run dev` and let DocuMind generate professional documentation for your code!
