import { useState } from 'react';
import type { Character, CharacterClass, CharacterRace, WorldTheme } from '../types/game';
import { CLASS_DESCRIPTIONS, RACE_DESCRIPTIONS, THEME_DESCRIPTIONS } from '../types/game';

interface WorldSetupProps {
  onBegin: (character: Character, theme: WorldTheme) => void;
}

export function WorldSetup({ onBegin }: WorldSetupProps) {
  const [name, setName] = useState('');
  const [race, setRace] = useState<CharacterRace>('human');
  const [characterClass, setCharacterClass] = useState<CharacterClass>('warrior');
  const [theme, setTheme] = useState<WorldTheme>('fantasy');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onBegin({ name: name.trim(), race, class: characterClass }, theme);
    }
  };

  return (
    <div className="world-setup">
      <div className="setup-card">
        <h1>ChronicleAI</h1>
        <p className="tagline">Your AI Dungeon Master Awaits</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Character Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your character's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Race</label>
            <select
              className="form-select"
              value={race}
              onChange={(e) => setRace(e.target.value as CharacterRace)}
            >
              {Object.entries(RACE_DESCRIPTIONS).map(([key, desc]) => (
                <option key={key} value={key}>
                  {key.charAt(0).toUpperCase() + key.slice(1)} - {desc}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Class</label>
            <select
              className="form-select"
              value={characterClass}
              onChange={(e) => setCharacterClass(e.target.value as CharacterClass)}
            >
              {Object.entries(CLASS_DESCRIPTIONS).map(([key, desc]) => (
                <option key={key} value={key}>
                  {key.charAt(0).toUpperCase() + key.slice(1)} - {desc}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">World Theme</label>
            <select
              className="form-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value as WorldTheme)}
            >
              {Object.entries(THEME_DESCRIPTIONS).map(([key, desc]) => (
                <option key={key} value={key}>
                  {key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - {desc}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-adventure" disabled={!name.trim()}>
            Begin Adventure
          </button>
        </form>
      </div>
    </div>
  );
}
