import type { Character, GameStats, WorldTheme } from '../types/game';

/**
 * Generate the system prompt for the AI Dungeon Master.
 */
export function createDMSystemPrompt(character: Character, theme: WorldTheme, stats: GameStats): string {
  const realmDescriptor: Record<WorldTheme, string> = {
    fantasy: 'a medieval fantasy realm of cursed keeps, ancient forests, and dragon-haunted ruins',
    cyberpunk: 'a techno-medieval kingdom where rune-forged machines and guild empires collide',
    'post-apocalyptic': 'a shattered medieval empire where relic-magic and famine shape every choice',
  };

  return `You are a creative, dramatic Dungeon Master running ${realmDescriptor[theme]} RPG.
The player is ${character.name}, an ${character.race} ${character.class}.

RULES:
- Keep responses to 3-4 sentences max.
- Always end with a clear choice or challenge.
- Track player stats and update them in responses.
- Add dice rolls for dramatic moments.
- Never break character.

Current stats:
- Health: ${stats.health}/${stats.maxHealth}
- Gold: ${stats.gold}
- Inventory: ${stats.inventory.length > 0 ? stats.inventory.join(', ') : 'None'}

Formatting requirements:
- Include exactly one explicit dice-roll sentence.
- Include an updated stats sentence in every response.
- End the final sentence with a direct question to the player.`;
}

export interface StatChange {
  healthChange?: number;
  goldChange?: number;
  newItems?: string[];
}

function parseAmount(raw: string): number {
  return Number.parseInt(raw.replace(/,/g, ''), 10);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeSentence(text: string, ending: '.' | '?' = '.'): string {
  const cleaned = normalizeWhitespace(text).replace(/[.!?]+$/, '');
  if (!cleaned) return '';
  return `${cleaned}${ending}`;
}

function splitIntoSentences(text: string): string[] {
  const compact = normalizeWhitespace(text.replace(/\r?\n+/g, ' '));
  if (!compact) return [];

  const chunks = compact.match(/[^.!?]+[.!?]*/g) ?? [];
  return chunks
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (/[.!?]$/.test(chunk) ? chunk : `${chunk}.`));
}

function isDiceSentence(sentence: string): boolean {
  return /\b(roll|d20|critical|success|failure)\b/i.test(sentence);
}

function isStatsSentence(sentence: string): boolean {
  return /\b(stats?|health|gold|inventory|hp)\b/i.test(sentence);
}

function isChoiceSentence(sentence: string): boolean {
  return /\?|\b(choose|will you|do you|which path|what do you do)\b/i.test(sentence);
}

function createDiceSentence(): string {
  const roll = Math.floor(Math.random() * 20) + 1;
  let outcome = 'Partial success';
  if (roll >= 18) outcome = 'Triumphant success';
  if (roll <= 5) outcome = 'Brutal setback';
  return `Roll: ${roll} - ${outcome}.`;
}

function createStatsAndChoiceSentence(stats: GameStats, choiceSentence?: string): string {
  const inventoryLabel =
    stats.inventory.length === 0
      ? 'no items in your pack'
      : `${stats.inventory.length} item${stats.inventory.length === 1 ? '' : 's'} in your pack`;

  const choiceBase = choiceSentence
    ? normalizeWhitespace(choiceSentence).replace(/[.!?]+$/, '')
    : 'will you charge the enemy captain or slip into the ruined chapel';

  const normalizedChoice = /\b(will you|do you|which path|what do you do|choose)\b/i.test(choiceBase)
    ? choiceBase
    : `will you ${choiceBase.charAt(0).toLowerCase()}${choiceBase.slice(1)}`;

  return `Stats now stand at Health ${stats.health}/${stats.maxHealth}, Gold ${stats.gold}, and ${inventoryLabel}; ${normalizedChoice}?`;
}

/**
 * Enforce the DM output contract required by the game rules.
 */
export function enforceDMResponseRules(rawText: string, stats: GameStats): string {
  const sentences = splitIntoSentences(rawText);
  const narrative = sentences
    .filter((sentence) => !isDiceSentence(sentence) && !isStatsSentence(sentence))
    .slice(0, 2)
    .map((sentence) => normalizeSentence(sentence));

  if (narrative.length === 0) {
    narrative.push('Moonlit mist crawls across the stones as fate tightens around your next move.');
  }

  if (narrative.length === 1) {
    narrative.push('A distant horn answers your presence, warning that hesitation may cost blood.');
  }

  const diceSentence = sentences.find(isDiceSentence) ?? createDiceSentence();
  const choiceSentence = [...sentences].reverse().find(isChoiceSentence);
  const statsAndChoiceSentence = createStatsAndChoiceSentence(stats, choiceSentence);

  const finalSentences = [
    normalizeSentence(narrative[0]),
    normalizeSentence(narrative[1]),
    normalizeSentence(diceSentence),
    normalizeSentence(statsAndChoiceSentence, '?'),
  ];

  return finalSentences.join(' ');
}

/**
 * Parse AI response to extract stat changes.
 */
export function parseStatChanges(text: string): StatChange {
  const changes: StatChange = {};

  const healthLossMatch = text.match(
    /(?:lose|lost|take|takes?|took|suffer|suffered)\s+(\d{1,3}(?:,\d{3})*)\s*(?:health|hp|damage|hit\s*points?)/i,
  );
  const healthGainMatch = text.match(
    /(?:gain|gained|heal|healed|restore|restored|recover|recovered)\s+(\d{1,3}(?:,\d{3})*)\s*(?:health|hp|hit\s*points?)/i,
  );

  if (healthLossMatch) {
    changes.healthChange = -parseAmount(healthLossMatch[1]);
  } else if (healthGainMatch) {
    changes.healthChange = parseAmount(healthGainMatch[1]);
  }

  const goldLossMatch = text.match(
    /(?:lose|lost|spend|spent|pay|paid)\s+(\d{1,3}(?:,\d{3})*)\s*(?:gold|coins?|crowns?)/i,
  );
  const goldGainMatch = text.match(
    /(?:gain|gained|find|found|receive|received|earn|earned|loot|looted)\s+(\d{1,3}(?:,\d{3})*)\s*(?:gold|coins?|crowns?)/i,
  );

  if (goldLossMatch) {
    changes.goldChange = -parseAmount(goldLossMatch[1]);
  } else if (goldGainMatch) {
    changes.goldChange = parseAmount(goldGainMatch[1]);
  }

  const itemPattern =
    /(?:find|found|gain|gained|receive|received|acquire|acquired|loot|looted|pick up|picked up)\s+(?:an?|the|some)?\s*([a-z][a-z\s'-]{1,60}(?:sword|dagger|potion|shield|armor|armour|helmet|bow|staff|ring|amulet|cloak|boots|gloves|scroll|wand|axe|mace|spear|gem|key))/gi;

  const items: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = itemPattern.exec(text)) !== null) {
    const item = normalizeWhitespace(match[1]);
    if (!item) continue;
    const duplicate = items.some((entry) => entry.toLowerCase() === item.toLowerCase());
    if (!duplicate) items.push(item);
  }

  if (items.length > 0) {
    changes.newItems = items;
  }

  return changes;
}

/**
 * Apply parsed stat changes safely.
 */
export function applyStatChanges(stats: GameStats, changes: StatChange): GameStats {
  const nextStats: GameStats = {
    ...stats,
    inventory: [...stats.inventory],
  };

  if (changes.healthChange !== undefined) {
    nextStats.health = Math.max(0, Math.min(nextStats.maxHealth, nextStats.health + changes.healthChange));
  }

  if (changes.goldChange !== undefined) {
    nextStats.gold = Math.max(0, nextStats.gold + changes.goldChange);
  }

  if (changes.newItems && changes.newItems.length > 0) {
    const known = new Set(nextStats.inventory.map((item) => item.toLowerCase()));
    for (const item of changes.newItems) {
      const normalized = item.trim();
      if (!normalized) continue;
      if (!known.has(normalized.toLowerCase())) {
        nextStats.inventory.push(normalized);
        known.add(normalized.toLowerCase());
      }
    }
  }

  return nextStats;
}
