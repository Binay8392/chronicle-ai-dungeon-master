/**
 * ChronicleAI Game Types
 */

export type CharacterClass = 'warrior' | 'mage' | 'rogue';
export type CharacterRace = 'human' | 'elf' | 'dwarf' | 'orc';
export type WorldTheme = 'fantasy' | 'cyberpunk' | 'post-apocalyptic';

export interface Character {
  name: string;
  race: CharacterRace;
  class: CharacterClass;
}

export interface GameStats {
  health: number;
  maxHealth: number;
  gold: number;
  inventory: string[];
}

export interface StoryEntry {
  role: 'dm' | 'player';
  text: string;
  timestamp: number;
}

export interface GameState {
  character: Character;
  theme: WorldTheme;
  stats: GameStats;
  story: StoryEntry[];
  initialized: boolean;
}

export const DEFAULT_STATS: GameStats = {
  health: 100,
  maxHealth: 100,
  gold: 10,
  inventory: [],
};

export const CLASS_DESCRIPTIONS: Record<CharacterClass, string> = {
  warrior: 'Master of combat, high strength and endurance',
  mage: 'Wielder of arcane magic, powerful spells',
  rogue: 'Stealthy assassin, quick and cunning',
};

export const RACE_DESCRIPTIONS: Record<CharacterRace, string> = {
  human: 'Versatile and adaptable',
  elf: 'Graceful and wise, natural magic affinity',
  dwarf: 'Strong and resilient, master craftsmen',
  orc: 'Powerful and fierce warriors',
};

export const THEME_DESCRIPTIONS: Record<WorldTheme, string> = {
  fantasy: 'Medieval fantasy realm with magic and dragons',
  cyberpunk: 'Neon-lit dystopian future with cybertech',
  'post-apocalyptic': 'Wasteland survival after the collapse',
};
