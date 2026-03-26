# ChronicleAI - AI Dungeon Master

An immersive AI-powered Dungeon Master web app built for HackXtreme. All AI inference runs **locally in your browser** using on-device LLMs via the RunAnywhere SDK. No cloud APIs. No backend. Pure client-side magic.

![ChronicleAI](https://img.shields.io/badge/HackXtreme-2026-gold) ![RunAnywhere](https://img.shields.io/badge/RunAnywhere-SDK-orange) ![React](https://img.shields.io/badge/React-19-blue)

## Features

### 🎮 Immersive Gameplay
- **Character Creation**: Choose your name, race (Human/Elf/Dwarf/Orc), class (Warrior/Mage/Rogue)
- **World Themes**: Adventure in Fantasy, Cyberpunk, or Post-Apocalyptic settings
- **Dynamic AI Storytelling**: Local LLM acts as your Dungeon Master, responding to your actions in real-time

### 🤖 On-Device AI
- **Local LLM**: LFM2 350M model runs entirely in your browser via WebGPU/WASM
- **No Internet Required**: After initial load, everything runs offline
- **Privacy-First**: Your adventure stays on your device

### 🎙️ Voice Integration
- **Speech-to-Text**: Speak your actions using RunAnywhere STT (Whisper Tiny)
- **Text-to-Speech**: Toggle narration to hear the DM's responses (Piper TTS)
- **3-Second Recording**: Quick voice input for actions

### 📊 RPG Mechanics
- **Health System**: Visual health bar with color indicators (green → yellow → red)
- **Gold Tracking**: Earn and spend gold throughout your adventure
- **Inventory Management**: Collect items during your journey
- **Stat Parsing**: AI responses automatically update stats (e.g., "You lose 15 health", "You gain 30 gold")

### 🎨 Dark Fantasy Aesthetic
- **Custom Fonts**: Cinzel for headings, Lora for body text
- **Parchment UI**: Textured story log with medieval styling
- **Animated Typing**: DM responses type out character by character
- **Mobile Responsive**: Play on desktop, tablet, or phone

### 💾 Session Persistence
- **Auto-Save**: Game state saves to localStorage automatically
- **Resume Anytime**: Continue your adventure where you left off
- **Export Story**: Download your complete adventure log as a .txt file

## Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: Custom CSS with CSS Variables
- **AI**: RunAnywhere Web SDK v0.1.0-beta.10
  - `@runanywhere/web` - Core SDK
  - `@runanywhere/web-llamacpp` - Local LLM inference (LFM2 350M)
  - `@runanywhere/web-onnx` - STT/TTS models (Whisper Tiny, Piper)
- **TypeScript**: Full type safety
- **Fonts**: Google Fonts (Cinzel, Lora)

## Project Structure

```
src/
├── components/
│   ├── WorldSetup.tsx        # Character creation screen
│   ├── GameInterface.tsx     # Main game UI
│   ├── StoryLog.tsx         # Scrollable story with typing animation
│   └── StatsPanel.tsx       # Health/Gold/Inventory sidebar
├── hooks/
│   ├── useModelLoader.ts    # Model download & loading
│   └── useVoice.ts          # STT/TTS integration
├── types/
│   └── game.ts              # TypeScript interfaces for game state
├── utils/
│   └── dm.ts                # AI system prompt & stat parsing
├── styles/
│   └── chronicle.css        # Dark fantasy styling
└── App.tsx                  # Main app logic & state management
```

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
1. **Initial Load**: The app downloads AI models (~15-20MB) on first launch
2. **Character Creation**: Fill out the character sheet and choose your world
3. **Begin Adventure**: Click "Begin Adventure" to initialize the AI Dungeon Master
4. **Play**: Type or speak your actions, and the AI responds in real-time

### Building for Production

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, GitHub Pages, etc.)

## How It Works

### AI Dungeon Master System
The DM system uses a dynamic prompt that includes:
- Character details (name, race, class)
- World theme (fantasy/cyberpunk/post-apocalyptic)
- Current stats (health, gold, inventory)
- Recent conversation history (last 10 exchanges)

Example system prompt:
```
You are a creative, dramatic Dungeon Master running a medieval fantasy 
realm RPG. The player is Aragorn, an elf warrior.

RULES:
- Keep responses to 3-4 sentences max
- Always end with a clear choice or challenge
- Track player stats and update them in responses
- Add dice rolls for dramatic moments
- Never break character
```

### Stat Parsing
The app uses regex patterns to extract stat changes from AI responses:

- **Health**: `"lose 15 health"` → -15 HP
- **Gold**: `"gain 30 gold"` → +30 gold
- **Items**: `"find a silver dagger"` → Added to inventory

### Session Persistence
Game state is saved to localStorage after every change:
```typescript
{
  character: { name, race, class },
  theme: "fantasy",
  stats: { health: 85, maxHealth: 100, gold: 45, inventory: [...] },
  story: [{ role: "dm", text: "...", timestamp: ... }, ...],
  initialized: true
}
```

## Voice Commands

1. **Enable Voice Input**: Click the microphone button (🎙️)
2. **Speak Action**: Speak for 3 seconds (auto-stop)
3. **Text Appears**: Your transcribed action fills the input box
4. **Send**: Click "Send" to submit

## Export Story

Click the download icon (📥) to export your adventure:
```
============================================================
ChronicleAI Adventure Log
============================================================

Character: Aragorn
Race: elf
Class: warrior
World: fantasy

============================================================

[3/26/2026, 2:30:15 PM] Dungeon Master:
You awaken in a dark forest...

[3/26/2026, 2:30:45 PM] Player:
I look around for any signs of danger
...
```

## Development

### Key Files to Modify

- **DM Personality**: `src/utils/dm.ts` → `createDMSystemPrompt()`
- **Stat Parsing**: `src/utils/dm.ts` → `parseStatChanges()`
- **Styling**: `src/styles/chronicle.css`
- **Character Options**: `src/types/game.ts` → `RACE_DESCRIPTIONS`, `CLASS_DESCRIPTIONS`

### Adding New Features

**Example: Add a new stat (e.g., Mana)**
1. Update `GameStats` interface in `src/types/game.ts`
2. Add parsing logic in `src/utils/dm.ts`
3. Display in `src/components/StatsPanel.tsx`
4. Update system prompt to track it

## Deployment

### Vercel

```bash
npm run build
npx vercel --prod
```

The included `vercel.json` sets the required Cross-Origin-Isolation headers.

### Netlify

Add a `_headers` file:

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless
```

### Any static host

Serve the `dist/` folder with these HTTP headers on all responses:

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

## Known Limitations

- **Model Size**: First load downloads ~15-20MB of AI models
- **Browser Support**: Requires modern browser with WASM support
- **Context Length**: Keeps last 10 story entries for context (to manage memory)
- **Voice Recording**: Fixed 3-second recording window

## Future Enhancements

- [ ] Dice rolling system with visual animations
- [ ] Combat encounter mechanics
- [ ] Multiple save slots
- [ ] Character portraits with AI-generated art
- [ ] Sound effects and background music
- [ ] Multiplayer co-op adventures
- [ ] Custom world creation tools
- [ ] Achievement system
- [ ] Quest tracking

## Credits

- **Built for**: HackXtreme Hackathon 2026
- **AI SDK**: [RunAnywhere](https://runanywhere.ai)
- **Fonts**: [Google Fonts](https://fonts.google.com) (Cinzel, Lora)
- **Icons**: Unicode emoji

## Documentation

- [RunAnywhere SDK Docs](https://docs.runanywhere.ai)
- [npm package](https://www.npmjs.com/package/@runanywhere/web)
- [GitHub](https://github.com/RunanywhereAI/runanywhere-sdks)

## License

MIT License - Built for educational purposes.

---

**Ready to embark on your adventure?** ⚔️🗡️🛡️

Run `npm run dev` and let the ChronicleAI Dungeon Master guide your journey!
