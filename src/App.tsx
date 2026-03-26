import { useState, useEffect } from 'react';
import { initSDK, getAccelerationMode } from './runanywhere';
import { WorldSetup } from './components/WorldSetup';
import { GameInterface } from './components/GameInterface';
import type { Character, WorldTheme, GameState, StoryEntry } from './types/game';
import { DEFAULT_STATS } from './types/game';
import './styles/chronicle.css';

const STORAGE_KEY = 'chronicle-ai-save';

export function App() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Initialize SDK
  useEffect(() => {
    initSDK()
      .then(() => setSdkReady(true))
      .catch((err) => setSdkError(err instanceof Error ? err.message : String(err)));
  }, []);

  // Load saved game from localStorage
  useEffect(() => {
    if (sdkReady) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const state = JSON.parse(saved) as GameState;
          setGameState(state);
        }
      } catch (err) {
        console.error('Failed to load saved game:', err);
      }
    }
  }, [sdkReady]);

  // Save game to localStorage whenever it changes
  useEffect(() => {
    if (gameState && gameState.initialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
      } catch (err) {
        console.error('Failed to save game:', err);
      }
    }
  }, [gameState]);

  const handleBeginAdventure = (character: Character, theme: WorldTheme) => {
    const newState: GameState = {
      character,
      theme,
      stats: { ...DEFAULT_STATS },
      story: [],
      initialized: true,
    };
    setGameState(newState);
  };

  const handleExport = (story: StoryEntry[]) => {
    if (!gameState) return;

    const lines = [
      '='.repeat(60),
      'ChronicleAI Adventure Log',
      '='.repeat(60),
      '',
      `Character: ${gameState.character.name}`,
      `Race: ${gameState.character.race}`,
      `Class: ${gameState.character.class}`,
      `World: ${gameState.theme}`,
      '',
      '='.repeat(60),
      '',
    ];

    for (const entry of story) {
      const timestamp = new Date(entry.timestamp).toLocaleString();
      const speaker = entry.role === 'dm' ? 'Dungeon Master' : 'Player';
      lines.push(`[${timestamp}] ${speaker}:`);
      lines.push(entry.text);
      lines.push('');
    }

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronicle-ai-${gameState.character.name}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Loading screen
  if (sdkError) {
    return (
      <div className="chronicle-loading">
        <h1>ChronicleAI</h1>
        <p className="subtitle" style={{ color: 'var(--health-low)' }}>{sdkError}</p>
      </div>
    );
  }

  if (!sdkReady) {
    return (
      <div className="chronicle-loading">
        <h1>ChronicleAI</h1>
        <div className="chronicle-spinner" />
        <p className="subtitle">Initializing on-device AI engine</p>
        {getAccelerationMode() && (
          <p className="subtitle">Mode: {getAccelerationMode()}</p>
        )}
      </div>
    );
  }

  // Game flow
  if (!gameState || !gameState.initialized) {
    return <WorldSetup onBegin={handleBeginAdventure} />;
  }

  return (
    <GameInterface
      character={gameState.character}
      theme={gameState.theme}
      initialStats={gameState.stats}
      onExport={handleExport}
    />
  );
}
