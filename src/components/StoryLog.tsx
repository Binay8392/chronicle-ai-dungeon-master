import { useEffect, useRef, useState } from 'react';
import type { StoryEntry } from '../types/game';

interface StoryLogProps {
  story: StoryEntry[];
  playerName: string;
}

export function StoryLog({ story, playerName }: StoryLogProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const lastAnimatedTimestampRef = useRef<number | null>(null);
  const [typingIndex, setTypingIndex] = useState<number | null>(null);
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [story.length, displayText]);

  useEffect(() => {
    if (story.length === 0) return;

    const lastIndex = story.length - 1;
    const lastEntry = story[lastIndex];

    if (lastEntry.role !== 'dm') return;
    if (lastAnimatedTimestampRef.current === lastEntry.timestamp) return;

    lastAnimatedTimestampRef.current = lastEntry.timestamp;
    setTypingIndex(lastIndex);
    setDisplayText('');

    let cursor = 0;
    const text = lastEntry.text;
    const interval = setInterval(() => {
      if (cursor < text.length) {
        setDisplayText(text.slice(0, cursor + 1));
        cursor += 1;
      } else {
        clearInterval(interval);
        setTypingIndex(null);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [story]);

  return (
    <div className="story-log" ref={logRef} role="log" aria-live="polite" aria-label="Adventure story log">
      <div className="story-log-head">
        <span>Adventure Log</span>
        <span>{story.length} entries</span>
      </div>
      {story.map((entry, index) => {
        const isTyping = index === typingIndex;
        const text = isTyping ? displayText : entry.text;
        const speaker = entry.role === 'dm' ? 'Dungeon Master' : playerName;
        const entryTime = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
          <article key={`${entry.timestamp}-${index}`} className={`story-entry ${entry.role}`}>
            <div className="entry-meta">
              <span className="entry-label">{speaker}</span>
              <time className="entry-time">{entryTime}</time>
            </div>
            <p className="entry-text">
              {text}
              {isTyping && <span className="typing-cursor" />}
            </p>
          </article>
        );
      })}
    </div>
  );
}
