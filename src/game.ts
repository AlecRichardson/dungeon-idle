import { BASES, ENCOUNTERS, LOOT_WEIGHTS, MODIFIERS, RARITIES, SLOTS } from './content.ts';
import type { Attribute, Bonuses, Element, Encounter, Rarity, Slot } from './content.ts';
export interface GroundDrop { droppedAt: number; expiresAt: number; floor: number; encounter: number; run: number }
export interface Item { id: string; baseId: string; name: string; slot: Slot; rarity: Rarity; ilvl: number; required: number; modifiers: string[]; bonuses: Bonuses; locked: boolean; location: 'inventory' | 'stash' | 'ground'; ground?: GroundDrop }
export type LootStatus = 'ground' | 'kept' | 'sold' | 'expired' | 'lost' | 'discarded';
export interface LootRecord { id: string; name: string; rarity: Rarity; sold: boolean; floor: number; status: LootStatus }
export interface GameEvent { seq: number; type: 'cast' | 'hit' | 'loot' | 'victory' | 'death' | 'level' | 'gnome'; amount?: number; crit?: boolean; element?: Element; itemId?: string; encounter?: number }
export interface State {
  version: 2; level: number; xp: number; points: number; attributes: Record<Attribute, number>; gold: number;
  items: Item[]; loadouts: [Partial<Record<Slot, string>>, Partial<Record<Slot, string>>]; activeLoadout: 0 | 1;
  spell: Element; hp: number; encounter: number; enemyHp: number; phase: 'moving' | 'fighting' | 'victory' | 'death';
  timer: number; castTimer: number; enemyTimer: number; paused: boolean; gnomeReadyAt: number;
  runs: number; deaths: number; kills: number; elapsed: number; history: LootRecord[]; discoveredBases: string[]; discoveredModifiers: string[];
  events: GameEvent[]; seq: number; nextId: number;
}
export type Random = () => number;
const pick = <T,>(values: T[], rng: Random): T => values[Math.floor(rng() * values.length)];
export function itemBonuses(baseId: string, ilvl: number, modifiers: string[], rolls: number[] = []): Bonuses {
  const base = BASES.find(b => b.id === baseId)!;
  const result: Bonuses = {};
  const add = (values: Bonuses, scale: number) => { for (const [k, v] of Object.entries(values)) { const key = k as keyof Bonuses; result[key] = (result[key] || 0) + Math.max(1, Math.round(v * scale)); } };
  add(base.bonuses, 1 + (ilvl - 1) * 0.8);
  modifiers.forEach((id, index) => add(MODIFIERS.find(m => m.id === id)!.bonuses, (0.8 + ilvl * 0.18) * (rolls[index] ?? 1)));
  return result;
}
export function generateItem(id: string, floor: number, kind: Encounter['kind'], rng: Random = Math.random): Item {
  const base = pick(BASES, rng);
  const ilvl = 1 + floor * 2 + Math.floor(rng() * 3);
  let roll = rng() * 100;
  const rarityIndex = LOOT_WEIGHTS[kind].findIndex(weight => (roll -= weight) < 0);
  const rarity = RARITIES[Math.max(0, rarityIndex)];
  const pool = MODIFIERS.filter(m => m.slots.includes(base.slot));
  const mods: string[] = [];
  for (let i = 0; i < [0, 1, 2, 3, 4][Math.max(0, rarityIndex)]; i++) { const mod = pick(pool, rng); mods.push(mod.id); pool.splice(pool.indexOf(mod), 1); }
  return { id, baseId: base.id, name: `${base.name}${mods.length ? ' of ' + MODIFIERS.find(m => m.id === mods[0])!.name : ''}`, slot: base.slot, rarity, ilvl, required: Math.max(1, Math.ceil(ilvl / 2)), modifiers: mods, bonuses: itemBonuses(base.id, ilvl, mods, mods.map(() => 0.85 + rng() * 0.3)), locked: false, location: 'inventory' };
}
export function newGame(): State {
  const starter = (id: string, baseId: string): Item => { const base = BASES.find(b => b.id === baseId)!; return { id, baseId, name: base.name, slot: base.slot, rarity: 'Common', ilvl: 1, required: 1, modifiers: [], bonuses: itemBonuses(baseId, 1, []), locked: false, location: 'inventory' }; };
  const s: State = { version: 2, level: 1, xp: 0, points: 4, attributes: { strength: 2, agility: 2, intellect: 4, endurance: 3 }, gold: 0,
    items: [starter('1', 'emberwand'), starter('2', 'silk')], loadouts: [{ weapon: '1', body: '2' }, { weapon: '1', body: '2' }], activeLoadout: 0,
    spell: 'fire', hp: 0, encounter: 0, enemyHp: ENCOUNTERS[0].hp, phase: 'moving', timer: 0, castTimer: 0, enemyTimer: 0, paused: false,
    gnomeReadyAt: 0, runs: 0, deaths: 0, kills: 0, elapsed: 0, history: [], discoveredBases: ['emberwand', 'silk'], discoveredModifiers: [], events: [], seq: 0, nextId: 3 };
  s.hp = calculate(s).maxHp; return s;
}
export function xpNeeded(level: number) { return 35 + (level - 1) * 18; }
export function calculate(s: State, replacement?: Item) {
  const a: Bonuses = { ...s.attributes };
  for (const slot of SLOTS) {
    const item = replacement?.slot === slot ? replacement : s.items.find(i => i.id === s.loadouts[s.activeLoadout][slot]);
    if (item) for (const [k, v] of Object.entries(item.bonuses)) { const key = k as keyof Bonuses; a[key] = (a[key] || 0) + v; }
  }
  const power = 6 + (a.power || 0) + (a.intellect || 0) * 1.5 + (a.strength || 0) * 0.7;
  const damage = (element: Element) => power * (1 + ((a.damage || 0) + (a[element] || 0)) / 100);
  return { maxHp: 90 + s.level * 5 + (a.endurance || 0) * 7 + (a.health || 0), armor: a.armor || 0,
    reduction: Math.min(0.7, (a.armor || 0) / ((a.armor || 0) + 60)), crit: Math.min(0.4, 0.05 + (a.agility || 0) * 0.005), fire: damage('fire'), shadow: damage('shadow'), attributes: a };
}
export function protectedItem(s: State, id: string) { return !!s.items.find(i => i.id === id)?.locked || s.loadouts.some(l => Object.values(l).includes(id)); }
export function sellValue(i: Item) { return i.ilvl * 3 + RARITIES.indexOf(i.rarity) * 5; }
function markHistory(s: State, id: string, status: LootStatus) { for (const h of s.history) if (h.id === id) { h.status = status; h.sold = status === 'sold'; } }
export function sell(s: State, id: string): boolean { const i = s.items.find(i => i.id === id); if (!i || i.location !== 'inventory' || protectedItem(s, id)) return false; s.gold += sellValue(i); s.items.splice(s.items.indexOf(i), 1); markHistory(s, id, 'sold'); return true; }
export function packFull(s: State) { return s.items.filter(i => i.location === 'inventory').length >= 18; }
export function pickup(s: State, id: string, now = Date.now()): boolean {
  cleanupGround(s, now);
  const item = s.items.find(i => i.id === id);
  if (!item || item.location !== 'ground' || packFull(s)) return false;
  item.location = 'inventory'; delete item.ground; markHistory(s, id, 'kept'); return true;
}
export function moveItem(s: State, id: string, location: 'inventory' | 'stash'): boolean {
  const item = s.items.find(i => i.id === id); if (!item || item.location === 'ground' || s.loadouts.some(l => Object.values(l).includes(id))) return false;
  if (item.location === location) return true;
  const cap = location === 'inventory' ? 18 : 30;
  if (s.items.filter(i => i.location === location).length >= cap) return false;
  item.location = location; return true;
}
export function equip(s: State, id: string, now = Date.now()): boolean {
  cleanupGround(s, now);
  const item = s.items.find(i => i.id === id);
  if (!item || item.required > s.level || item.location === 'stash' || item.location === 'ground' && packFull(s)) return false;
  // Equipped items already occupy inventory slots. Pickup and replacement commit only after all checks.
  if (item.location === 'ground') { item.location = 'inventory'; delete item.ground; markHistory(s, id, 'kept'); }
  s.loadouts[s.activeLoadout][item.slot] = id; s.hp = Math.min(s.hp, calculate(s).maxHp); return true;
}
export function equipIntoSlot(s: State, id: string, slot: Slot, now = Date.now()): boolean {
  const item = s.items.find(i => i.id === id);
  if (!item || item.slot !== slot) return false;
  return equip(s, id, now);
}
export const LOOT_LIFETIME_MS = 120_000;
export const GNOME_COOLDOWN_MS = 60_000;
function groundMetadata(s: State, now: number): GroundDrop { return { droppedAt: now, expiresAt: now + LOOT_LIFETIME_MS, floor: Math.floor(s.encounter / 3), encounter: s.encounter, run: s.runs }; }
export function dropItem(s: State, id: string, now = Date.now()): boolean {
  const item = s.items.find(i => i.id === id);
  if (!item || item.location !== 'inventory' || protectedItem(s, id)) return false;
  item.location = 'ground'; item.ground = groundMetadata(s, now); markHistory(s, id, 'ground'); return true;
}
export function cleanupGround(s: State, now = Date.now(), death = false) {
  s.items = s.items.filter(i => {
    const remove = i.location === 'ground' && !protectedItem(s, i.id) && (death || (i.ground?.expiresAt ?? 0) <= now);
    if (remove) markHistory(s, i.id, death ? 'lost' : 'expired');
    return !remove;
  });
}
export function victoryGrace(s: State, now = Date.now()) {
  for (const i of s.items) if (i.location === 'ground' && !i.locked && i.ground) i.ground.expiresAt = Math.max(i.ground.expiresAt, now + 15_000);
}
export function activateGnome(s: State, now = Date.now()): { count: number; gold: number; reason?: string } {
  cleanupGround(s, now);
  if (now < s.gnomeReadyAt) return { count: 0, gold: 0, reason: 'Bling Gnome is cooling down.' };
  const eligible = s.items.filter(i => i.location === 'ground' && i.rarity !== 'Rainbow' && !protectedItem(s, i.id));
  if (!eligible.length) return { count: 0, gold: 0, reason: 'No eligible ground loot. Rainbow and locked items are protected.' };
  const ids = new Set(eligible.map(i => i.id)); const gold = eligible.reduce((sum, i) => sum + sellValue(i), 0);
  s.items = s.items.filter(i => !ids.has(i.id)); for (const id of ids) markHistory(s, id, 'sold');
  s.gold += gold; s.gnomeReadyAt = now + GNOME_COOLDOWN_MS; emit(s, { type: 'gnome', amount: gold });
  return { count: eligible.length, gold };
}
export function unequip(s: State, slot: Slot) { delete s.loadouts[s.activeLoadout][slot]; s.hp = Math.min(s.hp, calculate(s).maxHp); }
export function allocate(s: State, attribute: Attribute) { if (s.points > 0) { s.attributes[attribute]++; s.points--; if (attribute === 'endurance') s.hp += 7; } }
export function switchLoadout(s: State, index: 0 | 1) { s.activeLoadout = index; s.hp = Math.min(s.hp, calculate(s).maxHp); }
function emit(s: State, event: Omit<GameEvent, 'seq'>) { s.events.push({ encounter: s.encounter, ...event, seq: ++s.seq }); s.events = s.events.slice(-40); }
export function collect(s: State, item: Item, now = Date.now()) {
  if (s.items.some(i => i.id === item.id)) return;
  if (!s.discoveredBases.includes(item.baseId)) s.discoveredBases.push(item.baseId);
  for (const mod of item.modifiers) if (!s.discoveredModifiers.includes(mod)) s.discoveredModifiers.push(mod);
  item.location = 'ground'; item.ground = groundMetadata(s, now); s.items.push(item); emit(s, { type: 'loot', itemId: item.id });
  s.history.unshift({ id: item.id, name: item.name, rarity: item.rarity, sold: false, floor: Math.floor(s.encounter / 3) + 1, status: 'ground' }); s.history = s.history.slice(0, 50);
}
export function reward(s: State, rng: Random = Math.random, now = Date.now()) {
  const enemy = ENCOUNTERS[s.encounter];
  s.gold += enemy.gold; s.xp += enemy.xp; s.kills++;
  while (s.xp >= xpNeeded(s.level)) { s.xp -= xpNeeded(s.level); s.level++; s.points += 3; s.hp += 12; emit(s, { type: 'level' }); }
  const count = enemy.kind === 'boss' ? 3 : enemy.kind === 'elite' ? 2 : 1;
  for (let i = 0; i < count; i++) collect(s, generateItem(String(s.nextId++), Math.floor(s.encounter / 3), enemy.kind, rng), now);
  s.hp = Math.min(calculate(s).maxHp, s.hp + calculate(s).maxHp * 0.30);
}
export function restart(s: State) { s.encounter = 0; s.enemyHp = ENCOUNTERS[0].hp; s.hp = calculate(s).maxHp; s.phase = 'moving'; s.timer = 0; s.castTimer = 0; s.enemyTimer = 0; }
export function step(s: State, dt: number, rng: Random = Math.random, now = Date.now()) {
  cleanupGround(s, now);
  if (s.paused) return;
  dt = Math.max(0, Math.min(dt, 0.25)); s.elapsed += dt; s.timer += dt;
  if (s.phase === 'victory' || s.phase === 'death') { if (s.timer >= 3) restart(s); return; }
  if (s.phase === 'moving') { if (s.timer >= 2.5) { s.phase = 'fighting'; s.timer = 0; s.castTimer = 0.8; s.enemyTimer = 0; } return; }
  const stats = calculate(s); const enemy = ENCOUNTERS[s.encounter]; s.castTimer += dt; s.enemyTimer += dt;
  if (s.castTimer >= 1) {
    s.castTimer -= 1; const crit = rng() < stats.crit;
    const damage = Math.max(1, Math.round(stats[s.spell] * (enemy.affinity === s.spell ? 0.9 : 1.1) * (crit ? 1.5 : 1)));
    s.enemyHp = Math.max(0, s.enemyHp - damage); emit(s, { type: 'cast', amount: damage, element: s.spell, crit });
    if (s.enemyHp === 0) {
      reward(s, rng, now); s.timer = 0;
      if (s.encounter === ENCOUNTERS.length - 1) { victoryGrace(s, now); s.phase = 'victory'; s.runs++; emit(s, { type: 'victory' }); }
      else { s.encounter++; s.enemyHp = ENCOUNTERS[s.encounter].hp; s.phase = 'moving'; }
      return;
    }
  }
  if (s.enemyTimer >= 1.4) { s.enemyTimer -= 1.4; const damage = Math.max(1, Math.round(enemy.attack * (1 - stats.reduction))); s.hp = Math.max(0, s.hp - damage); emit(s, { type: 'hit', amount: damage }); if (s.hp === 0) { cleanupGround(s, now, true); s.phase = 'death'; s.timer = 0; s.deaths++; emit(s, { type: 'death' }); } }
}
export function serialize(s: State) { return JSON.stringify({ ...s, events: [] }); }
export function restore(raw: string, now = Date.now()): State {
  const parsed = JSON.parse(raw);
  if (parsed?.version === 1 && Array.isArray(parsed.items) && Array.isArray(parsed.history)) {
    const removed = new Set(parsed.items.filter((i: {location: string}) => i.location === 'inbox').map((i: Item) => i.id));
    parsed.items = parsed.items.filter((i: {location: string}) => i.location !== 'inbox');
    parsed.history = parsed.history.map((h: LootRecord) => ({ ...h, status: h.sold ? 'sold' : removed.has(h.id) ? 'discarded' : parsed.items.some((i: Item) => i.id === h.id) ? 'kept' : 'sold' }));
    parsed.version = 2; parsed.gnomeReadyAt = 0; delete parsed.autoSell; delete parsed.inboxLimit;
  }
  const s: State = parsed;
  const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (!s || s.version !== 2 || !Array.isArray(s.items) || !Array.isArray(s.loadouts) || s.loadouts.length !== 2 || !['fire', 'shadow'].includes(s.spell) || !['moving', 'fighting', 'victory', 'death'].includes(s.phase)) throw new Error('Unsupported save');
  for (const k of ['level', 'xp', 'points', 'gold', 'hp', 'encounter', 'enemyHp', 'timer', 'castTimer', 'enemyTimer', 'gnomeReadyAt', 'runs', 'deaths', 'kills', 'elapsed', 'seq', 'nextId'] as const) if (!finite(s[k]) || s[k] < 0) throw new Error('Invalid number');
  if (!Number.isInteger(s.level) || s.level < 1 || !Number.isInteger(s.encounter) || !ENCOUNTERS[s.encounter] || ![0, 1].includes(s.activeLoadout) || typeof s.paused !== 'boolean') throw new Error('Invalid progress');
  for (const k of ['strength', 'agility', 'intellect', 'endurance'] as const) if (!finite(s.attributes?.[k]) || s.attributes[k] < 0) throw new Error('Invalid attributes');
  const ids = new Set<string>();
  for (const i of s.items) {
    const base = BASES.find(b => b.id === i.baseId);
    if (!base || i.slot !== base.slot || !RARITIES.includes(i.rarity) || !['inventory', 'stash', 'ground'].includes(i.location) || typeof i.id !== 'string' || ids.has(i.id) || typeof i.name !== 'string' || typeof i.locked !== 'boolean' || !Number.isInteger(i.ilvl) || i.ilvl < 1 || i.required !== Math.ceil(i.ilvl / 2) || !Array.isArray(i.modifiers) || new Set(i.modifiers).size !== i.modifiers.length || i.modifiers.some(id => !MODIFIERS.some(m => m.id === id && m.slots.includes(i.slot))) || !i.bonuses || Object.entries(i.bonuses).some(([k,v]) => !['strength','agility','intellect','endurance','power','armor','health','damage','fire','shadow'].includes(k) || !finite(v) || v < 0)) throw new Error('Invalid equipment');
    if (i.location === 'ground' && (!i.ground || !finite(i.ground.droppedAt) || !finite(i.ground.expiresAt) || i.ground.droppedAt < 0 || i.ground.expiresAt < i.ground.droppedAt || !Number.isInteger(i.ground.floor) || i.ground.floor < 0 || i.ground.floor > 2 || !Number.isInteger(i.ground.encounter) || !ENCOUNTERS[i.ground.encounter] || !Number.isInteger(i.ground.run) || i.ground.run < 0)) throw new Error('Invalid floor loot');
    ids.add(i.id);
  }
  for (const l of s.loadouts) { if (!l || typeof l !== 'object') throw new Error('Invalid loadout'); for (const [slot, id] of Object.entries(l)) if (!SLOTS.includes(slot as Slot) || !s.items.some(i => i.id === id && i.slot === slot && i.required <= s.level && i.location === 'inventory')) throw new Error('Missing equipped item'); }
  if (!Array.isArray(s.history) || s.history.some(h => !h || typeof h.id !== 'string' || typeof h.name !== 'string' || !RARITIES.includes(h.rarity) || typeof h.sold !== 'boolean' || !['ground','kept','sold','expired','lost','discarded'].includes(h.status)) || !Array.isArray(s.discoveredBases) || s.discoveredBases.some(id => !BASES.some(b => b.id === id)) || !Array.isArray(s.discoveredModifiers) || s.discoveredModifiers.some(id => !MODIFIERS.some(m => m.id === id))) throw new Error('Invalid collections');
  s.events = []; cleanupGround(s, now); return s;
}
