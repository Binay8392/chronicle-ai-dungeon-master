import { useEffect, useRef, useState } from 'react';
import type { StoryEntry } from '../types/game';

interface StoryLogProps {
  story: StoryEntry[];
}

export function StoryLog({ story }: StoryLogProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const [typingIndex, setTypingIndex] = useState<number | null>(null);
  const [displayText, setDisplayText] = useState('');

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [story.length, displayText]);

  // Typing animation for the latest DM entry
  useEffect(() => {
    if (story.length === 0) return;

    const lastEntry = story[story.length - 1];
    
    // Only animate DM responses, not player actions
    if (lastEntry.role === 'dm' && typingIndex !== story.length - 1) {
      setTypingIndex(story.length - 1);
      setDisplayText('');

      let currentIndex = 0;
      const text = lastEntry.text;
      const speed = 30; // milliseconds per character

      const interval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
          setTypingIndex(null);
        }
      }, speed);

      return () => clearInterval(interval);
    }
  }, [story, typingIndex]);

  return (
    <div className="story-log" ref={logRef}>
      {story.map((entry, idx) => {
        const isTyping = idx === typingIndex;
        const text = isTyping ? displayText : entry.text;

        return (
          <div key={idx} className={`story-entry ${entry.role}`}>
            <div className="entry-label">
              {entry.role === 'dm' ? 'Dungeon Master' : 'You'}
            </div>
            <div className="entry-text">
              {text}
              {isTyping && <span className="typing-cursor" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
