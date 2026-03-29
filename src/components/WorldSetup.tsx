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
  const trimmedName = name.trim();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
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
                autoFocus
                aria-describedby="name-help"
                required
              />
              <div className="form-inline-row">
                <p id="name-help" className="form-help">This name appears in every story turn.</p>
                <span className="name-counter">{trimmedName.length}/30</span>
              </div>
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

            <section className="setup-preview" aria-live="polite">
              <h3>Current Build</h3>
              <p><strong>Hero:</strong> {trimmedName || 'Unnamed wanderer'}</p>
              <p><strong>Race:</strong> {RACE_DESCRIPTIONS[race]}</p>
              <p><strong>Class:</strong> {CLASS_DESCRIPTIONS[characterClass]}</p>
              <p><strong>Realm:</strong> {THEME_DESCRIPTIONS[theme]}</p>
            </section>

            <div className="setup-submit-row">
              <button type="submit" className="btn-adventure" disabled={!trimmedName}>
                Begin Adventure
              </button>
              <p className="setup-submit-hint">Tip: You can use voice input once the game starts.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
