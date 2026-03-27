import { useCallback, useEffect, useState } from 'react';
import { initSDK } from './runanywhere';
import { WorldSetup } from './components/WorldSetup';
import { GameInterface } from './components/GameInterface';
import type { Character, GameState, GameStats, StoryEntry, WorldTheme } from './types/game';
import { DEFAULT_STATS } from './types/game';

const STORAGE_KEY = 'chronicleai.save.v1';

function buildFreshState(): GameState {
  return {
    character: { name: 'Aragorn', race: 'elf', class: 'warrior' },
    theme: 'fantasy',
    stats: { ...DEFAULT_STATS },
    story: [],
    initialized: false,
  };
}

function isValidSavedState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GameState>;
  return !!(
    candidate.character &&
    candidate.theme &&
    candidate.stats &&
    Array.isArray(candidate.story) &&
    typeof candidate.initialized === 'boolean'
  );
}

function loadSavedState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidSavedState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function exportStory(character: Character, theme: WorldTheme, story: StoryEntry[]): void {
  const divider = '='.repeat(60);
  const lines = [
    divider,
    'ChronicleAI Adventure Log',
    divider,
    '',
    `Character: ${character.name}`,
    `Race: ${character.race}`,
    `Class: ${character.class}`,
    `World: ${theme}`,
    '',
    divider,
    '',
    ...story.flatMap((entry) => {
      const speaker = entry.role === 'dm' ? 'Dungeon Master' : 'Player';
      const stamp = new Date(entry.timestamp).toLocaleString();
      return [`[${stamp}] ${speaker}:`, entry.text, ''];
    }),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${character.name.toLowerCase()}-chronicle.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function App() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>(() => loadSavedState() ?? buildFreshState());

  useEffect(() => {
    initSDK()
      .then(() => setSdkReady(true))
      .catch((err) => {
        setSdkError(err instanceof Error ? err.message : 'Unknown error');
      });
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  const handleBegin = useCallback((character: Character, theme: WorldTheme) => {
    setGameState({
      character,
      theme,
      stats: { ...DEFAULT_STATS },
      story: [],
      initialized: true,
    });
  }, []);

  const handleProgress = useCallback((stats: GameStats, story: StoryEntry[]) => {
    setGameState((prev) => {
      if (prev.stats === stats && prev.story === story) return prev;
      return { ...prev, stats, story, initialized: true };
    });
  }, []);

  const handleNewAdventure = useCallback(() => {
    setGameState(buildFreshState());
  }, []);

  const handleExport = useCallback((story: StoryEntry[]) => {
    exportStory(gameState.character, gameState.theme, story);
  }, [gameState.character, gameState.theme]);

  if (!sdkReady && !sdkError) {
    return (
      <div className="chronicle-loading">
        <h1>ChronicleAI</h1>
        <div className="chronicle-spinner" />
        <p className="subtitle">Summoning your on-device Dungeon Master...</p>
      </div>
    );
  }

  if (sdkError) {
    return (
      <div className="chronicle-loading">
        <h1>Arcane Failure</h1>
        <p className="subtitle">{sdkError}</p>
        <button className="btn-adventure" onClick={() => window.location.reload()}>
          Reload Chronicle
        </button>
      </div>
    );
  }

  if (!gameState.initialized) {
    return <WorldSetup onBegin={handleBegin} />;
  }

  return (
    <GameInterface
      character={gameState.character}
      theme={gameState.theme}
      initialStats={gameState.stats}
      initialStory={gameState.story}
      onExport={handleExport}
      onProgress={handleProgress}
      onNewAdventure={handleNewAdventure}
    />
  );
}
