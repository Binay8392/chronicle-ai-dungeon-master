import type { Character, GameStats } from '../types/game';

interface StatsPanelProps {
  character: Character;
  stats: GameStats;
}

export function StatsPanel({ character, stats }: StatsPanelProps) {
  const healthPercent = (stats.health / stats.maxHealth) * 100;
  
  const getHealthClass = () => {
    if (healthPercent > 60) return 'high';
    if (healthPercent > 30) return 'mid';
    return 'low';
  };

  return (
    <div className="stats-panel">
      <div className="stats-section">
        <h3 className="stats-title">Character</h3>
        <div className="character-info">
          <p><strong>Name:</strong> {character.name}</p>
          <p><strong>Race:</strong> {character.race.charAt(0).toUpperCase() + character.race.slice(1)}</p>
          <p><strong>Class:</strong> {character.class.charAt(0).toUpperCase() + character.class.slice(1)}</p>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-title">Health</h3>
        <div className="health-bar-container">
          <div className="health-label">
            <span>HP</span>
            <span>{stats.health} / {stats.maxHealth}</span>
          </div>
          <div className="health-bar">
            <div 
              className={`health-fill ${getHealthClass()}`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-title">Gold</h3>
        <div className="gold-display">
          <span>💰</span>
          <span>{stats.gold}</span>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-title">Inventory</h3>
        <div className="inventory-list">
          {stats.inventory.length === 0 ? (
            <p className="inventory-empty">No items yet</p>
          ) : (
            stats.inventory.map((item, idx) => (
              <div key={idx} className="inventory-item">{item}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
