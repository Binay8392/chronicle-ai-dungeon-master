import { useState } from 'react';
import type { Character, CharacterClass, CharacterRace, WorldTheme } from '../types/game';
import { CLASS_DESCRIPTIONS, RACE_DESCRIPTIONS, THEME_DESCRIPTIONS } from '../types/game';

interface WorldSetupProps {
  onBegin: (character: Character, theme: WorldTheme) => void;
}

export function WorldSetup({ onBegin }: WorldSetupProps) {
  const [name, setName] = useState('Aragorn');
  const [race, setRace] = useState<CharacterRace>('elf');
  const [characterClass, setCharacterClass] = useState<CharacterClass>('warrior');
  const [theme, setTheme] = useState<WorldTheme>('fantasy');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onBegin({ name: trimmedName, race, class: characterClass }, theme);
  };

  return (
    <div className="world-setup">
      <div className="setup-card">
        <div className="setup-graphics" aria-hidden="true">
          <div className="sigil sigil-a" />
          <div className="sigil sigil-b" />
          <div className="sigil sigil-c" />
          <div className="ember-trail" />
        </div>
        <div className="setup-card-head">
          <p className="setup-kicker">The Iron Chronicle</p>
          <h1>Forge Your Legend</h1>
          <p className="tagline">Summon a dramatic Dungeon Master and step into a living realm of danger.</p>
        </div>

        <div className="setup-grid">
          <section className="setup-lore">
            <h2>Tonight's Oath</h2>
            <p>
              Blackthorn Keep has fallen silent, caravans vanish in the moon-fog, and desperate villages whisper your
              name beside candlelight.
            </p>
            <p>
              Choose your form, bind your class, and march into a campaign where every choice reshapes fate in real
              time.
            </p>
          </section>

          <form onSubmit={handleSubmit} className="setup-form">
            <div className="form-group">
              <label className="form-label" htmlFor="character-name">
                Character Name
              </label>
              <input
                id="character-name"
                type="text"
                className="form-input"
                placeholder="Enter your hero's name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={30}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="character-race">
                Race
              </label>
              <select
                id="character-race"
                className="form-select"
                value={race}
                onChange={(event) => setRace(event.target.value as CharacterRace)}
              >
                {Object.entries(RACE_DESCRIPTIONS).map(([key, description]) => (
                  <option key={key} value={key}>
                    {key.charAt(0).toUpperCase() + key.slice(1)} - {description}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="character-class">
                Class
              </label>
              <select
                id="character-class"
                className="form-select"
                value={characterClass}
                onChange={(event) => setCharacterClass(event.target.value as CharacterClass)}
              >
                {Object.entries(CLASS_DESCRIPTIONS).map(([key, description]) => (
                  <option key={key} value={key}>
                    {key.charAt(0).toUpperCase() + key.slice(1)} - {description}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="world-theme">
                Realm Tone
              </label>
              <select
                id="world-theme"
                className="form-select"
                value={theme}
                onChange={(event) => setTheme(event.target.value as WorldTheme)}
              >
                {Object.entries(THEME_DESCRIPTIONS).map(([key, description]) => (
                  <option key={key} value={key}>
                    {key
                      .split('-')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}{' '}
                    - {description}
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
    </div>
  );
}
