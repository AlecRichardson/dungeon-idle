export type Element = 'fire' | 'shadow';
export type Slot = 'weapon' | 'body' | 'head' | 'accessory';
export type Attribute = 'strength' | 'agility' | 'intellect' | 'endurance';
export type Bonus = Attribute | 'power' | 'armor' | 'health' | 'damage' | Element;
export type Bonuses = Partial<Record<Bonus, number>>;
export const RARITIES = ['Common', 'Superior', 'Magic', 'Rare', 'Rainbow'] as const;
export type Rarity = typeof RARITIES[number];
export const COLORS: Record<Rarity, string> = { Common: '#d1d0c9', Superior: '#95dd80', Magic: '#7dbaff', Rare: '#ffdf69', Rainbow: '#e99bff' };
export const SLOTS: Slot[] = ['weapon', 'body', 'head', 'accessory'];
export interface Base { id: string; name: string; slot: Slot; bonuses: Bonuses; glyph: string }
export const BASES: Base[] = [
  { id: 'emberwand', name: 'Emberwood Wand', slot: 'weapon', bonuses: { power: 4, fire: 4 }, glyph: '╱' },
  { id: 'voidstaff', name: 'Hollowglass Staff', slot: 'weapon', bonuses: { power: 4, shadow: 4 }, glyph: '⚚' },
  { id: 'silk', name: 'Ashweave Robe', slot: 'body', bonuses: { armor: 3, intellect: 1.2 }, glyph: '♜' },
  { id: 'mail', name: 'Warden Vest', slot: 'body', bonuses: { armor: 6, endurance: 1 }, glyph: '♜' },
  { id: 'hood', name: 'Cinder Hood', slot: 'head', bonuses: { armor: 2, intellect: 1 }, glyph: '♠' },
  { id: 'crown', name: 'Graveguard Crown', slot: 'head', bonuses: { armor: 3, health: 5 }, glyph: '♛' },
  { id: 'ruby', name: 'Coalheart Charm', slot: 'accessory', bonuses: { fire: 5, health: 3 }, glyph: '◈' },
  { id: 'onyx', name: 'Duskstone Signet', slot: 'accessory', bonuses: { shadow: 5, intellect: 1 }, glyph: '◉' },
];
export interface Modifier { id: string; name: string; slots: Slot[]; bonuses: Bonuses }
export const MODIFIERS: Modifier[] = [
  { id: 'sage', name: 'the Sage', slots: SLOTS, bonuses: { intellect: 1.8 } },
  { id: 'turtle', name: 'the Tortoise', slots: ['body', 'head', 'accessory'], bonuses: { endurance: 1.6, armor: 1.5 } },
  { id: 'flame', name: 'Embers', slots: ['weapon', 'head', 'accessory'], bonuses: { fire: 5, power: 1 } },
  { id: 'night', name: 'Nightfall', slots: ['weapon', 'head', 'accessory'], bonuses: { shadow: 5, power: 1 } },
  { id: 'force', name: 'Force', slots: ['weapon', 'body'], bonuses: { damage: 3, strength: 1 } },
  { id: 'owl', name: 'the Owl', slots: SLOTS, bonuses: { agility: 1.4, intellect: 0.7 } },
  { id: 'vigor', name: 'Vigor', slots: ['body', 'head', 'accessory'], bonuses: { health: 8, endurance: 0.8 } },
];
export const SPELLS: Record<Element, { name: string; description: string; color: string }> = {
  fire: { name: 'Fire Bolt', description: 'A bolt of flame. One cast each second.', color: '#ffad60' },
  shadow: { name: 'Shadow Arc', description: 'A lash of dark energy. One cast each second.', color: '#c6a0ff' },
};
export interface Encounter { name: string; hp: number; attack: number; kind: 'normal' | 'elite' | 'boss'; affinity: Element; xp: number; gold: number }
export const ENCOUNTERS: Encounter[] = [
  { name: 'Cinder Mite', hp: 45, attack: 5, kind: 'normal', affinity: 'shadow', xp: 12, gold: 5 },
  { name: 'Hollow Rat', hp: 60, attack: 6, kind: 'normal', affinity: 'fire', xp: 14, gold: 6 },
  { name: 'Ashbound Sentinel', hp: 100, attack: 8, kind: 'elite', affinity: 'fire', xp: 22, gold: 12 },
  { name: 'Cinder Mite', hp: 90, attack: 8, kind: 'normal', affinity: 'shadow', xp: 18, gold: 8 },
  { name: 'Vault Shade', hp: 110, attack: 9, kind: 'normal', affinity: 'fire', xp: 20, gold: 9 },
  { name: 'Gravekeeper', hp: 155, attack: 11, kind: 'elite', affinity: 'shadow', xp: 30, gold: 15 },
  { name: 'Hollow Knight', hp: 125, attack: 10, kind: 'normal', affinity: 'fire', xp: 24, gold: 10 },
  { name: 'Coalheart Revenant', hp: 165, attack: 12, kind: 'elite', affinity: 'shadow', xp: 32, gold: 16 },
  { name: 'The Ember Warden', hp: 260, attack: 11, kind: 'boss', affinity: 'fire', xp: 65, gold: 45 },
];
export const FLOORS = ['The Ashen Steps', 'The Whispering Vault', 'The Warden’s Sanctum'];
export const LOOT_WEIGHTS: Record<Encounter['kind'], number[]> = { normal: [42, 30, 20, 7, 1], elite: [20, 32, 30, 15, 3], boss: [8, 22, 38, 26, 6] };
