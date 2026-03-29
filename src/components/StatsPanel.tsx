import type { Character, GameStats } from '../types/game';

interface StatsPanelProps {
  character: Character;
  stats: GameStats;
}

export function StatsPanel({ character, stats }: StatsPanelProps) {
  const healthPercent = Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100));

  const getHealthClass = () => {
    if (healthPercent > 60) return 'high';
    if (healthPercent > 30) return 'mid';
    return 'low';
  };

  const getHealthStatusLabel = () => {
    if (healthPercent > 60) return 'Stable';
    if (healthPercent > 30) return 'Wounded';
    return 'Critical';
  };

  return (
    <aside className="stats-panel">
      <div className="stats-section">
        <h3 className="stats-title">Hero Sheet</h3>
        <div className="character-info">
          <p>
            <strong>Name:</strong> {character.name}
          </p>
          <p>
            <strong>Race:</strong> {character.race.charAt(0).toUpperCase() + character.race.slice(1)}
          </p>
          <p>
            <strong>Class:</strong> {character.class.charAt(0).toUpperCase() + character.class.slice(1)}
          </p>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-title">Vitality</h3>
        <div className="health-bar-container">
          <div className="health-label">
            <span>Health</span>
            <span>
              {stats.health} / {stats.maxHealth}
            </span>
          </div>
          <div
            className="health-bar"
            role="progressbar"
            aria-label="Health"
            aria-valuemin={0}
            aria-valuemax={stats.maxHealth}
            aria-valuenow={stats.health}
          >
            <div className={`health-fill ${getHealthClass()}`} style={{ width: `${healthPercent}%` }} />
          </div>
          <p className="health-state">Condition: {getHealthStatusLabel()}</p>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-title">Treasury</h3>
        <div className="gold-display">
          <span className="gold-label">Gold</span>
          <span className="gold-value">{stats.gold}</span>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-title">
          Inventory <span className="stats-count">{stats.inventory.length}</span>
        </h3>
        <div className="inventory-list">
          {stats.inventory.length === 0 ? (
            <p className="inventory-empty">No relics claimed yet</p>
          ) : (
            stats.inventory.map((item, index) => (
              <div key={`${item}-${index}`} className="inventory-item">
                {item}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
