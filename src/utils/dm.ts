import type { Character, WorldTheme, GameStats } from '../types/game';

/**
 * Generate the system prompt for the AI Dungeon Master
 */
export function createDMSystemPrompt(character: Character, theme: WorldTheme, stats: GameStats): string {
  const themeDescriptions = {
    fantasy: 'medieval fantasy realm filled with magic, dragons, ancient ruins, and mystical creatures',
    cyberpunk: 'neon-lit dystopian future with advanced cybertech, megacorporations, hackers, and street samurai',
    'post-apocalyptic': 'harsh wasteland after civilization collapsed, with raiders, mutants, scarce resources, and survival challenges',
  };

  return `You are a creative, dramatic Dungeon Master running a ${themeDescriptions[theme]} RPG adventure.

The player character is ${character.name}, a ${character.race} ${character.class}.

RULES:
- Keep all responses to 3-4 sentences maximum
- Always end with a clear choice, challenge, or question for the player
- Track player stats: Health (currently ${stats.health}/${stats.maxHealth}), Gold (currently ${stats.gold}), Inventory
- When stats change, include it clearly in your response (e.g., "You lose 15 health" or "You gain 25 gold" or "You find a silver dagger")
- Occasionally add dice-roll outcomes for dramatic moments (e.g., "Roll: 17 — Success!" or "Roll: 3 — Critical failure!")
- Never break character as the Dungeon Master
- Be dramatic, engaging, and responsive to player actions
- Create consequences for player decisions
- Keep the adventure moving forward with interesting encounters

Begin the adventure with a dramatic opening scene that introduces the player to the world.`;
}

/**
 * Parse AI response to extract stat changes
 */
export interface StatChange {
  healthChange?: number;
  goldChange?: number;
  newItems?: string[];
}

export function parseStatChanges(text: string): StatChange {
  const changes: StatChange = {};

  // Health patterns
  const healthLossMatch = text.match(/(?:lose|lost|take|takes?|suffer|suffered)\s+(\d+)\s+(?:health|hp|damage|hitpoints?)/i);
  const healthGainMatch = text.match(/(?:gain|gained|heal|healed|restore|restored)\s+(\d+)\s+(?:health|hp|hitpoints?)/i);

  if (healthLossMatch) {
    changes.healthChange = -parseInt(healthLossMatch[1], 10);
  } else if (healthGainMatch) {
    changes.healthChange = parseInt(healthGainMatch[1], 10);
  }

  // Gold patterns
  const goldLossMatch = text.match(/(?:lose|lost|spend|spent|pay|paid)\s+(\d+)\s+(?:gold|coins?|currency)/i);
  const goldGainMatch = text.match(/(?:gain|gained|find|found|receive|received|earn|earned)\s+(\d+)\s+(?:gold|coins?|currency)/i);

  if (goldLossMatch) {
    changes.goldChange = -parseInt(goldLossMatch[1], 10);
  } else if (goldGainMatch) {
    changes.goldChange = parseInt(goldGainMatch[1], 10);
  }

  // Item patterns - look for "find/gain/receive/acquire" followed by items
  const itemPatterns = [
    /(?:find|found|gain|gained|receive|received|acquire|acquired)\s+(?:an?\s+)?([a-z\s]+(?:sword|dagger|potion|shield|armor|helmet|bow|staff|ring|amulet|cloak|boots|gloves|scroll|wand|axe|mace|spear))/gi,
    /(?:pick up|picked up|take|took|grab|grabbed)\s+(?:an?\s+)?([a-z\s]+(?:sword|dagger|potion|shield|armor|helmet|bow|staff|ring|amulet|cloak|boots|gloves|scroll|wand|axe|mace|spear))/gi,
  ];

  const items: string[] = [];
  for (const pattern of itemPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const item = match[1].trim();
      if (item && !items.includes(item)) {
        items.push(item);
      }
    }
  }

  if (items.length > 0) {
    changes.newItems = items;
  }

  return changes;
}

/**
 * Apply stat changes to game stats
 */
export function applyStatChanges(stats: GameStats, changes: StatChange): GameStats {
  const newStats = { ...stats };

  if (changes.healthChange !== undefined) {
    newStats.health = Math.max(0, Math.min(newStats.maxHealth, newStats.health + changes.healthChange));
  }

  if (changes.goldChange !== undefined) {
    newStats.gold = Math.max(0, newStats.gold + changes.goldChange);
  }

  if (changes.newItems && changes.newItems.length > 0) {
    newStats.inventory = [...newStats.inventory, ...changes.newItems];
  }

  return newStats;
}
