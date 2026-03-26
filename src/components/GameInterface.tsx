import { useState, useCallback, useRef, useEffect } from 'react';
import { ModelCategory } from '@runanywhere/web';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { useModelLoader } from '../hooks/useModelLoader';
import { useVoice } from '../hooks/useVoice';
import { StoryLog } from './StoryLog';
import { StatsPanel } from './StatsPanel';
import type { Character, WorldTheme, GameStats, StoryEntry } from '../types/game';
import { createDMSystemPrompt, parseStatChanges, applyStatChanges } from '../utils/dm';

interface GameInterfaceProps {
  character: Character;
  theme: WorldTheme;
  initialStats: GameStats;
  onExport: (story: StoryEntry[]) => void;
}

export function GameInterface({ character, theme, initialStats, onExport }: GameInterfaceProps) {
  const loader = useModelLoader(ModelCategory.Language);
  const voice = useVoice();
  const [stats, setStats] = useState<GameStats>(initialStats);
  const [story, setStory] = useState<StoryEntry[]>([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const systemPromptRef = useRef<string>('');
  const hasGeneratedOpening = useRef(false);
  const storyRef = useRef<StoryEntry[]>([]);
  const generatingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    storyRef.current = story;
  }, [story]);

  useEffect(() => {
    generatingRef.current = generating;
  }, [generating]);

  // Initialize system prompt but don't auto-generate opening
  useEffect(() => {
    if (systemPromptRef.current) return; // Already initialized
    
    systemPromptRef.current = createDMSystemPrompt(character, theme, stats);
    
    // Add a welcome message instead of auto-generating
    const welcomeEntry: StoryEntry = {
      role: 'dm',
      text: `Welcome, ${character.name} the ${character.race} ${character.class}! Your adventure in this ${theme} world is about to begin. What would you like to do?`,
      timestamp: Date.now(),
    };
    setStory([welcomeEntry]);
    storyRef.current = [welcomeEntry];
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateDMResponse = async (playerAction: string, isOpening = false) => {
    console.log('[DEBUG] generateDMResponse called', { playerAction, isOpening, generating: generatingRef.current });
    
    if (generatingRef.current) {
      console.log('[DEBUG] Already generating, returning');
      return;
    }

    console.log('[DEBUG] Starting generation');
    setGenerating(true);
    generatingRef.current = true;

    try {
      // Add player action to story (unless it's the opening)
      if (!isOpening) {
        const playerEntry: StoryEntry = {
          role: 'player',
          text: playerAction,
          timestamp: Date.now(),
        };
        setStory(prev => [...prev, playerEntry]);
        storyRef.current = [...storyRef.current, playerEntry];
        console.log('[DEBUG] Added player entry to story');
      }

      // Build conversation context using the ref
      let contextPrompt = systemPromptRef.current + '\n\n';
      
      // Add recent story history (last 10 entries to keep context manageable)
      const recentStory = storyRef.current.slice(-10);
      for (const entry of recentStory) {
        if (entry.role === 'dm') {
          contextPrompt += `Dungeon Master: ${entry.text}\n\n`;
        } else {
          contextPrompt += `Player: ${entry.text}\n\n`;
        }
      }

      // Add current player action
      if (!isOpening) {
        contextPrompt += `Player: ${playerAction}\n\nDungeon Master:`;
      } else {
        contextPrompt += `Dungeon Master:`;
      }

      console.log('[DEBUG] Context prompt length:', contextPrompt.length);
      console.log('[DEBUG] Calling TextGeneration.generateStream');

      const { stream, result: resultPromise, cancel } = await TextGeneration.generateStream(
        contextPrompt,
        {
          maxTokens: 256,
          temperature: 0.85,
        }
      );
      cancelRef.current = cancel;

      console.log('[DEBUG] Stream started, reading tokens...');

      let accumulated = '';
      for await (const token of stream) {
        accumulated += token;
      }

      console.log('[DEBUG] Stream complete, accumulated:', accumulated.length, 'chars');

      const result = await resultPromise;
      const responseText = result.text || accumulated;

      console.log('[DEBUG] Response text:', responseText.substring(0, 100));

      // Add DM response to story
      const dmEntry: StoryEntry = {
        role: 'dm',
        text: responseText,
        timestamp: Date.now(),
      };
      setStory(prev => [...prev, dmEntry]);
      storyRef.current = [...storyRef.current, dmEntry];

      console.log('[DEBUG] Added DM response to story');

      // Parse and apply stat changes
      const changes = parseStatChanges(responseText);
      if (Object.keys(changes).length > 0) {
        console.log('[DEBUG] Stat changes detected:', changes);
        setStats(prev => {
          const newStats = applyStatChanges(prev, changes);
          // Update system prompt with new stats
          systemPromptRef.current = createDMSystemPrompt(character, theme, newStats);
          return newStats;
        });
      }

      // TTS narration if enabled
      if (ttsEnabled && voice.ttsReady) {
        console.log('[DEBUG] Speaking response via TTS');
        await voice.speak(responseText);
      }
      
    } catch (err) {
      console.error('[DEBUG] DM generation error:', err);
      const errorEntry: StoryEntry = {
        role: 'dm',
        text: 'The Dungeon Master momentarily loses focus... Try again.',
        timestamp: Date.now(),
      };
      setStory(prev => [...prev, errorEntry]);
      storyRef.current = [...storyRef.current, errorEntry];
    } finally {
      console.log('[DEBUG] Generation complete, resetting state');
      cancelRef.current = null;
      setGenerating(false);
      generatingRef.current = false;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = input.trim();
    console.log('[DEBUG] handleSend called', { action, generating: generatingRef.current, loaderState: loader.state });
    
    if (!action || generatingRef.current) {
      console.log('[DEBUG] Skipping send - no action or already generating');
      return;
    }

    // Ensure model is loaded before generating
    if (loader.state !== 'ready') {
      console.log('[DEBUG] Model not ready, ensuring load...');
      const ok = await loader.ensure();
      if (!ok) {
        console.log('[DEBUG] Model load failed');
        return;
      }
      console.log('[DEBUG] Model loaded successfully');
    }

    setInput('');
    console.log('[DEBUG] Calling generateDMResponse');
    await generateDMResponse(action);
    console.log('[DEBUG] generateDMResponse completed');
  };

  const handleVoiceClick = async () => {
    if (voice.isRecording) {
      voice.stopRecording();
      return;
    }

    const transcript = await voice.startRecording();
    if (transcript && transcript.trim()) {
      setInput(transcript);
    }
  };

  const handleExport = () => {
    onExport(story);
  };

  return (
    <div className="game-container">
      <div className="game-main">
        <header className="game-header">
          <h1 className="game-title">ChronicleAI</h1>
          <div className="game-controls">
            <button 
              className={`btn-icon ${ttsEnabled ? 'active' : ''}`}
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title="Toggle voice narration"
            >
              🔊
            </button>
            <button 
              className="btn-icon"
              onClick={handleExport}
              title="Export story"
              disabled={story.length === 0}
            >
              📥
            </button>
          </div>
        </header>

        {loader.state === 'downloading' || loader.state === 'loading' ? (
          <div className="chronicle-loading">
            <h1>Loading AI Dungeon Master...</h1>
            <div className="chronicle-spinner" />
            {loader.state === 'downloading' && (
              <p className="subtitle">{Math.round(loader.progress * 100)}% downloaded</p>
            )}
          </div>
        ) : loader.state === 'error' ? (
          <div className="chronicle-loading">
            <h1>Error</h1>
            <p className="subtitle">{loader.error}</p>
            <button className="btn-adventure" onClick={loader.ensure}>Retry</button>
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
                  🎙️
                </button>
                <input
                  type="text"
                  className="action-input"
                  placeholder="What do you do?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={generating}
                />
                <button 
                  type="submit" 
                  className="btn-send"
                  disabled={!input.trim() || generating}
                >
                  {generating ? 'Generating...' : 'Send'}
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
