import { useEffect, useRef, useState } from 'react';
import { ModelCategory } from '@runanywhere/web';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { useModelLoader } from '../hooks/useModelLoader';
import { useVoice } from '../hooks/useVoice';
import { StoryLog } from './StoryLog';
import { StatsPanel } from './StatsPanel';
import type { Character, GameStats, StoryEntry, WorldTheme } from '../types/game';
import {
  applyStatChanges,
  createDMSystemPrompt,
  enforceDMResponseRules,
  parseStatChanges,
} from '../utils/dm';

interface GameInterfaceProps {
  character: Character;
  theme: WorldTheme;
  initialStats: GameStats;
  initialStory?: StoryEntry[];
  onExport: (story: StoryEntry[]) => void;
  onProgress?: (stats: GameStats, story: StoryEntry[]) => void;
  onNewAdventure?: () => void;
}

function areStatsEqual(a: GameStats, b: GameStats): boolean {
  if (a.health !== b.health || a.maxHealth !== b.maxHealth || a.gold !== b.gold) return false;
  if (a.inventory.length !== b.inventory.length) return false;
  return a.inventory.every((item, index) => item === b.inventory[index]);
}

export function GameInterface({
  character,
  theme,
  initialStats,
  initialStory = [],
  onExport,
  onProgress,
  onNewAdventure,
}: GameInterfaceProps) {
  const loader = useModelLoader(ModelCategory.Language);
  const voice = useVoice();

  const [stats, setStats] = useState<GameStats>(initialStats);
  const [story, setStory] = useState<StoryEntry[]>(initialStory);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const cancelRef = useRef<(() => void) | null>(null);
  const storyRef = useRef<StoryEntry[]>(initialStory);
  const statsRef = useRef<GameStats>(initialStats);
  const generatingRef = useRef(false);
  const systemPromptRef = useRef('');

  useEffect(() => {
    storyRef.current = story;
  }, [story]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    generatingRef.current = generating;
  }, [generating]);

  useEffect(() => {
    systemPromptRef.current = createDMSystemPrompt(character, theme, statsRef.current);

    if (storyRef.current.length === 0) {
      const opening: StoryEntry = {
        role: 'dm',
        text: enforceDMResponseRules(
          `${character.name}, moonlight strikes the shattered gates of Blackthorn Keep while undead sentries prowl the walls. You hear chained prisoners crying beneath the courtyard and a war drum rising from the crypt below.`,
          statsRef.current,
        ),
        timestamp: Date.now(),
      };
      setStory([opening]);
      storyRef.current = [opening];
    }
  }, [character, theme]);

  useEffect(() => {
    onProgress?.(stats, story);
  }, [stats, story, onProgress]);

  const handleCancelGeneration = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    generatingRef.current = false;
    setGenerating(false);
  };

  const generateDMResponse = async (playerAction: string) => {
    if (generatingRef.current) return;

    setGenerating(true);
    generatingRef.current = true;

    try {
      const playerEntry: StoryEntry = {
        role: 'player',
        text: playerAction,
        timestamp: Date.now(),
      };

      const nextStoryWithPlayer = [...storyRef.current, playerEntry];
      setStory(nextStoryWithPlayer);
      storyRef.current = nextStoryWithPlayer;

      let contextPrompt = `${systemPromptRef.current}\n\n`;
      for (const entry of nextStoryWithPlayer.slice(-10)) {
        contextPrompt += `${entry.role === 'dm' ? 'Dungeon Master' : 'Player'}: ${entry.text}\n\n`;
      }
      contextPrompt += 'Dungeon Master:';

      const { stream, result, cancel } = await TextGeneration.generateStream(contextPrompt, {
        maxTokens: 280,
        temperature: 0.85,
      });

      cancelRef.current = cancel;

      let streamedText = '';
      for await (const token of stream) {
        streamedText += token;
      }

      const resolved = await result;
      const rawText = (resolved.text || streamedText || '').trim();

      const parsedChanges = parseStatChanges(rawText);
      const updatedStats = applyStatChanges(statsRef.current, parsedChanges);

      if (!areStatsEqual(updatedStats, statsRef.current)) {
        statsRef.current = updatedStats;
        setStats(updatedStats);
      }

      systemPromptRef.current = createDMSystemPrompt(character, theme, updatedStats);

      const compliantResponse = enforceDMResponseRules(rawText, updatedStats);
      const dmEntry: StoryEntry = {
        role: 'dm',
        text: compliantResponse,
        timestamp: Date.now(),
      };

      const nextStory = [...storyRef.current, dmEntry];
      setStory(nextStory);
      storyRef.current = nextStory;

      if (ttsEnabled && voice.ttsReady) {
        await voice.speak(compliantResponse);
      }
    } catch {
      const fallback: StoryEntry = {
        role: 'dm',
        text: enforceDMResponseRules(
          'A violent gust kills the torchlight and armored footsteps close in from every corridor.',
          statsRef.current,
        ),
        timestamp: Date.now(),
      };
      const nextStory = [...storyRef.current, fallback];
      setStory(nextStory);
      storyRef.current = nextStory;
    } finally {
      cancelRef.current = null;
      generatingRef.current = false;
      setGenerating(false);
    }
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const action = input.trim();
    if (!action || generatingRef.current) return;

    if (loader.state !== 'ready') {
      const ready = await loader.ensure();
      if (!ready) return;
    }

    setInput('');
    await generateDMResponse(action);
  };

  const handleVoiceClick = async () => {
    if (voice.isRecording) {
      voice.stopRecording();
      return;
    }

    const transcript = await voice.startRecording();
    if (transcript && transcript.trim()) {
      setInput(transcript.trim());
    }
  };

  return (
    <div className="game-container">
      <div className="game-main">
        <div className="game-graphics" aria-hidden="true">
          <div className="moon-disc" />
          <div className="fog-layer fog-layer-one" />
          <div className="fog-layer fog-layer-two" />
          <div className="castle-silhouette" />
        </div>
        <header className="game-header">
          <div>
            <h1 className="game-title">ChronicleAI</h1>
            <p className="game-subtitle">
              {character.name} the {character.race} {character.class} in a {theme.replace('-', ' ')} realm
            </p>
          </div>

          <div className="game-controls">
            {generating && (
              <button className="btn-icon" onClick={handleCancelGeneration} title="Cancel generation">
                Stop
              </button>
            )}
            <button
              className={`btn-icon ${ttsEnabled ? 'active' : ''}`}
              onClick={() => setTtsEnabled((prev) => !prev)}
              title="Toggle voice narration"
            >
              Voice
            </button>
            <button className="btn-icon" onClick={() => onExport(story)} title="Export story" disabled={story.length === 0}>
              Export
            </button>
            {onNewAdventure && (
              <button className="btn-icon" onClick={onNewAdventure} title="Start new adventure">
                New
              </button>
            )}
          </div>
        </header>

        {loader.state === 'downloading' || loader.state === 'loading' ? (
          <div className="chronicle-loading panel-loading">
            <h1>Preparing Dungeon Master</h1>
            <div className="chronicle-spinner" />
            {loader.state === 'downloading' && (
              <p className="subtitle">Model download: {Math.round(loader.progress * 100)}%</p>
            )}
          </div>
        ) : loader.state === 'error' ? (
          <div className="chronicle-loading panel-loading">
            <h1>Model Error</h1>
            <p className="subtitle">{loader.error}</p>
            <button className="btn-adventure" onClick={loader.ensure}>
              Retry Load
            </button>
          </div>
        ) : (
          <>
            <StoryLog story={story} />

            <form className="player-input" onSubmit={handleSend}>
              <div className="input-row">
                <button
                  type="button"
                  className={`btn-voice ${voice.isRecording ? 'recording' : ''}`}
                  onClick={handleVoiceClick}
                  title="Voice input"
                  disabled={generating}
                >
                  Mic
                </button>
                <input
                  type="text"
                  className="action-input"
                  placeholder={`What does ${character.name} do next?`}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={generating}
                />
                <button type="submit" className="btn-send" disabled={!input.trim() || generating}>
                  {generating ? 'Narrating...' : 'Act'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <StatsPanel character={character} stats={stats} />
    </div>
  );
}
