import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASES, ENCOUNTERS, MODIFIERS, RARITIES } from '../src/content.ts';
import { activateGnome, allocate, calculate, cleanupGround, collect, dropItem, equip, generateItem, itemBonuses, moveItem, newGame, packFull, pickup, protectedItem, restore, reward, sell, sellValue, serialize, step, switchLoadout, unequip, victoryGrace } from '../src/game.ts';
import type { State } from '../src/game.ts';
const NOW = 1_000_000;
function random(seed = 12345) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function drop(s: State, now = NOW) { const i = generateItem(String(s.nextId++), 0, 'normal', random(s.nextId)); collect(s, i, now); return i; }
function fillPack(s: State) { while (!packFull(s)) { const i = drop(s); assert.equal(pickup(s, i.id, NOW), true); } }

test('equipment and attributes change damage, critical chance, survival and loadouts', () => {
  const s = newGame(); const before = calculate(s);
  allocate(s, 'intellect'); assert.ok(Math.abs(calculate(s).fire - before.fire - 1.5 * 1.04) < 0.00001);
  allocate(s, 'strength'); assert.ok(calculate(s).shadow > before.shadow);
  allocate(s, 'agility'); assert.ok(calculate(s).crit > before.crit);
  allocate(s, 'endurance'); assert.equal(calculate(s).maxHp - before.maxHp, 7);
  const i = drop(s); i.bonuses = { shadow: 50, health: 40, armor: 30 };
  const preview = calculate(s, i); assert.equal(equip(s, i.id, NOW), true); assert.deepEqual(calculate(s), preview);
  switchLoadout(s, 1); assert.notDeepEqual(calculate(s), preview); assert.equal(protectedItem(s, i.id), true);
});
test('random rewards obey dungeon levels and unique legal modifier bundles', () => {
  const rng = random(); const rarities = new Set();
  for (let n = 0; n < 3000; n++) {
    const floor = n % 3; const i = generateItem(String(n), floor, 'boss', rng); rarities.add(i.rarity);
    assert.ok(i.ilvl >= 1 + floor * 2 && i.ilvl <= 3 + floor * 2); assert.equal(i.required, Math.ceil(i.ilvl / 2));
    assert.equal(new Set(i.modifiers).size, i.modifiers.length); assert.equal(i.modifiers.length, RARITIES.indexOf(i.rarity));
    assert.ok(i.modifiers.every(id => MODIFIERS.find(m => m.id === id)?.slots.includes(i.slot)));
    assert.ok(Object.values(i.bonuses).every(v => v > 0)); assert.equal(BASES.find(b => b.id === i.baseId)?.slot, i.slot);
  }
  assert.equal(rarities.size, 5);
});
test('boss drops improve average rarity without a guarantee; deeper Common can beat old Rainbow', () => {
  const rng = random(); let normal = 0, boss = 0, commons = 0;
  for (let n = 0; n < 4000; n++) { normal += RARITIES.indexOf(generateItem('a', 0, 'normal', rng).rarity); const b = generateItem('b', 0, 'boss', rng); boss += RARITIES.indexOf(b.rarity); if (b.rarity === 'Common') commons++; }
  assert.ok(boss > normal * 1.5); assert.ok(commons > 0);
  const s = newGame(); s.encounter = 8; reward(s, rng, NOW); assert.equal(s.history.length, 3); assert.equal(s.items.filter(i => i.location === 'ground').length, 3); assert.equal(s.gold, 45);
  const old = { ...s.items[0], bonuses: itemBonuses('emberwand', 1, ['sage', 'flame', 'force', 'owl']) };
  const fresh = { ...old, bonuses: itemBonuses('emberwand', 7, []) }; assert.ok(calculate(s, fresh).fire > calculate(s, old).fire);
});
test('new loot remains on the ground, discovers content, and is never immediately sold', () => {
  const s = newGame(); const gold = s.gold; const i = drop(s);
  assert.equal(s.items.length, 3); assert.equal(i.location, 'ground'); assert.equal(i.ground?.expiresAt, NOW + 120_000); assert.equal(s.gold, gold);
  assert.equal(s.history[0].status, 'ground'); assert.ok(s.discoveredBases.includes(i.baseId)); assert.ok(i.modifiers.every(id => s.discoveredModifiers.includes(id)));
  assert.equal(pickup(s, i.id, NOW), true); assert.equal(i.location, 'inventory'); assert.equal(i.ground, undefined); assert.equal(s.history[0].status, 'kept'); assert.equal(pickup(s, i.id, NOW), false);
});
test('full inventory rejects pickup and direct equip atomically while complete runs continue', () => {
  const s = newGame(); fillPack(s); const i = drop(s); const before = serialize(s);
  assert.equal(pickup(s, i.id, NOW), false); assert.equal(equip(s, i.id, NOW), false); assert.equal(serialize(s), before);
  const rng = random(); for (let n = 0; n < 1800 && s.runs === 0; n++) step(s, .1, rng, NOW + n * 100);
  assert.equal(s.runs, 1); assert.equal(packFull(s), true); assert.ok(s.items.some(j => j.id === i.id && j.location === 'ground'));
  for (let n = 0; n < 35; n++) step(s, .1, rng, NOW + 85_000 + n * 100);
  assert.equal(s.encounter, 0); assert.equal(s.phase, 'moving');
});
test('direct equip keeps the displaced item and the other loadout; failed requirements change nothing', () => {
  const s = newGame(); const i = drop(s); i.slot = 'weapon'; i.baseId = 'voidstaff';
  const displaced = s.loadouts[0].weapon; assert.equal(equip(s, i.id, NOW), true);
  assert.equal(i.location, 'equipped'); assert.equal(s.loadouts[0].weapon, i.id); assert.equal(s.loadouts[1].weapon, displaced);
  assert.equal(s.items.filter(j => j.id === displaced).length, 1); assert.equal(s.items.find(j => j.id === displaced)?.location, 'equipped'); assert.equal(s.items.length, 3);
  const high = drop(s); high.required = 99; const before = serialize(s); assert.equal(equip(s, high.id, NOW), false); assert.equal(serialize(s), before);
});
test('expiry is exact, gives no gold, ignores locks and updates history', () => {
  const s = newGame(); const expired = drop(s); const locked = drop(s); locked.locked = true; const rainbow = drop(s); rainbow.rarity = 'Rainbow';
  cleanupGround(s, NOW + 119_999); assert.equal(s.items.length, 5);
  cleanupGround(s, NOW + 120_000); assert.deepEqual(s.items.map(i => i.id), ['1', '2', locked.id]); assert.equal(s.gold, 0);
  assert.equal(s.history.find(h => h.id === expired.id)?.status, 'expired'); assert.equal(s.history.find(h => h.id === rainbow.id)?.status, 'expired');
  locked.locked = false; cleanupGround(s, NOW + 120_001); assert.equal(s.items.length, 2);
});
test('victory extends surviving ground deadlines to at least 15 seconds and restart keeps them', () => {
  const s = newGame(); const old = drop(s); const recent = drop(s, NOW + 119_000); const locked = drop(s); locked.locked = true;
  const recentDeadline = recent.ground!.expiresAt; const lockedDeadline = locked.ground!.expiresAt;
  s.encounter = 8; s.phase = 'fighting'; s.enemyHp = 1; s.castTimer = 1;
  step(s, .1, random(), NOW + 119_999);
  assert.equal(s.phase, 'victory'); assert.equal(old.ground!.expiresAt, NOW + 134_999); assert.equal(recent.ground!.expiresAt, recentDeadline); assert.equal(locked.ground!.expiresAt, lockedDeadline);
  for (let n = 0; n < 32; n++) step(s, .1, random(), NOW + 120_100 + n * 100);
  assert.equal(s.phase, 'moving'); assert.ok(s.items.some(i => i.id === old.id));
  // An item already expired before victory is not resurrected.
  const expired = drop(s, NOW); cleanupGround(s, NOW + 120_000); victoryGrace(s, NOW + 120_000); assert.ok(!s.items.some(i => i.id === expired.id));
});
test('death immediately destroys unlocked floor loot including Rainbow, but keeps locks and owned items', () => {
  const s = newGame(); const normal = drop(s); const rainbow = drop(s); rainbow.rarity = 'Rainbow'; const locked = drop(s); locked.locked = true;
  const owned = drop(s); pickup(s, owned.id, NOW); const stored = drop(s); pickup(s, stored.id, NOW); moveItem(s, stored.id, 'stash');
  s.phase = 'fighting'; s.hp = 1; s.enemyTimer = 1.4; s.castTimer = 0; step(s, .1, random(), NOW);
  assert.equal(s.phase, 'death'); assert.equal(s.deaths, 1); assert.ok(!s.items.some(i => i.id === normal.id || i.id === rainbow.id));
  for (const id of [locked.id, owned.id, stored.id, '1', '2']) assert.ok(s.items.some(i => i.id === id));
  assert.equal(s.history.find(h => h.id === normal.id)?.status, 'lost'); const kept = s.items.length;
  for (let n = 0; n < 32; n++) step(s, .1, random(), NOW + n * 100);
  assert.equal(s.phase, 'moving'); assert.equal(s.hp, calculate(s).maxHp); assert.equal(s.items.length, kept);
});
test('Gnome sells all eligible floors/runs once, spares Rainbow/locks/owned items and uses shared prices', () => {
  const s = newGame(); fillPack(s); const a = drop(s); s.encounter = 5; s.runs = 2; const b = drop(s);
  const rainbow = drop(s); rainbow.rarity = 'Rainbow'; const locked = drop(s); locked.locked = true;
  const value = sellValue(a) + sellValue(b); const before = s.gold;
  assert.deepEqual(activateGnome(s, NOW), { count: 2, gold: value }); assert.equal(s.gold, before + value); assert.equal(s.gnomeReadyAt, NOW + 60_000);
  assert.ok(s.items.some(i => i.id === rainbow.id)); assert.ok(s.items.some(i => i.id === locked.id)); assert.equal(packFull(s), true);
  const another = drop(s); assert.equal(activateGnome(s, NOW + 59_999).count, 0); assert.ok(s.items.includes(another)); assert.equal(s.gold, before + value);
  assert.equal(activateGnome(s, NOW + 60_000).count, 1); assert.ok(!s.items.includes(another)); assert.equal(s.history.find(h => h.id === a.id)?.status, 'sold');
});
test('empty or protected-only Gnome activation never consumes cooldown or rewards expired loot', () => {
  const s = newGame(); const rainbow = drop(s); rainbow.rarity = 'Rainbow'; const locked = drop(s); locked.locked = true;
  assert.equal(activateGnome(s, NOW).count, 0); assert.equal(s.gnomeReadyAt, 0);
  const expired = drop(s); activateGnome(s, NOW + 120_000); assert.equal(s.gold, 0); assert.equal(s.gnomeReadyAt, 0); assert.ok(!s.items.includes(expired));
});
test('manual sales require inventory; locks and either loadout protect sale and dropping', () => {
  const s = newGame(); const i = drop(s); i.rarity = 'Rainbow'; assert.equal(sell(s, i.id), false); pickup(s, i.id, NOW);
  i.locked = true; assert.equal(sell(s, i.id), false); assert.equal(dropItem(s, i.id, NOW), false); assert.equal(moveItem(s, i.id, 'stash'), true);
  i.locked = false; assert.equal(sell(s, i.id), false); assert.equal(moveItem(s, i.id, 'inventory'), true); assert.equal(sell(s, i.id), true);
  assert.equal(sell(s, '1'), false); assert.equal(dropItem(s, '1', NOW), false); unequip(s, 'weapon'); assert.equal(sell(s, '1'), false); switchLoadout(s, 1); unequip(s, 'weapon'); assert.equal(sell(s, '1'), true);
});
test('dropping owned gear reuses its record and starts a new deadline; stash capacity remains enforced', () => {
  const s = newGame(); const i = drop(s); pickup(s, i.id, NOW); assert.equal(dropItem(s, i.id, NOW + 5000), true);
  assert.equal(i.ground?.expiresAt, NOW + 125_000); assert.equal(s.items.filter(j => j.id === i.id).length, 1); assert.equal(s.history[0].status, 'ground'); assert.equal(moveItem(s, i.id, 'stash'), false);
  for (let n = 0; n < 30; n++) { const j = drop(s); pickup(s, j.id, NOW); assert.equal(moveItem(s, j.id, 'stash'), true); }
  pickup(s, i.id, NOW); assert.equal(moveItem(s, i.id, 'stash'), false); assert.equal(i.location, 'inventory');
});
test('save/load preserves exact loot deadlines, locks, cooldown, equipment, progression and pause', () => {
  const s = newGame(); s.gold = 123; s.level = 8; s.xp = 12; s.paused = true; const locked = drop(s); locked.locked = true;
  const item = drop(s); s.gnomeReadyAt = NOW + 60_000;
  const raw = serialize(s); const copy = restore(raw, NOW + 10_000); assert.equal(serialize(copy), raw); assert.equal(copy.items.find(i => i.id === item.id)?.ground?.expiresAt, NOW + 120_000);
  const later = restore(raw, NOW + 150_000); assert.equal(later.gold, 123); assert.equal(later.level, 8); assert.equal(later.xp, 12); assert.equal(later.paused, true); assert.equal(later.gnomeReadyAt, NOW + 60_000); assert.deepEqual(later.loadouts, s.loadouts);
  assert.ok(later.items.some(i => i.id === locked.id)); assert.ok(!later.items.some(i => i.id === item.id)); assert.equal(later.kills, 0); assert.equal(later.elapsed, 0);
  assert.throws(() => restore('{oops')); assert.throws(() => restore(JSON.stringify({ ...s, version: 9 }))); assert.throws(() => restore(JSON.stringify({ ...s, encounter: 50 }))); assert.throws(() => restore(JSON.stringify({ ...s, items: [{ ...item, ground: { ...item.ground, expiresAt: null } }] })));
});
test('old saves migrate once: only inbox items removed; progression, locks and explicit pause survive', () => {
  const s = newGame(); s.level = 7; s.gold = 432; s.xp = 55; s.runs = 3; s.items[0].locked = true;
  const stored = drop(s); pickup(s, stored.id, NOW); moveItem(s, stored.id, 'stash'); const discarded = drop(s); discarded.locked = true;
  const old = { ...s, version: 1, items: s.items.map(i => i.id === discarded.id ? { ...i, location: 'inbox', ground: undefined } : i.location === 'equipped' ? {...i, location: 'inventory'} : i), history: s.history.map(({ status, ...h }) => h), inboxLimit: 1, autoSell: ['Common'] };
  const migrated = restore(JSON.stringify(old), NOW); assert.equal(migrated.version, 3); assert.equal(migrated.items.length, 3); assert.ok(!migrated.items.some(i => i.id === discarded.id)); assert.deepEqual(migrated.items, s.items.filter(i => i.id !== discarded.id));
  assert.equal(migrated.gold, 432); assert.equal(migrated.level, 7); assert.equal(migrated.xp, 55); assert.equal(migrated.runs, 3); assert.deepEqual(migrated.loadouts, s.loadouts); assert.deepEqual(migrated.discoveredBases, s.discoveredBases); assert.deepEqual(migrated.discoveredModifiers, s.discoveredModifiers); assert.equal('autoSell' in migrated, false); assert.equal('inboxLimit' in migrated, false);
  const elapsed = migrated.elapsed; step(migrated, .1, random(), NOW); assert.ok(migrated.elapsed > elapsed); assert.equal(serialize(restore(serialize(migrated), NOW)), serialize(migrated));
  old.paused = true; assert.equal(restore(JSON.stringify(old), NOW).paused, true);
});
test('paused combat does not pause wall-clock cleanup, and long runs bound unlocked ground accumulation', () => {
  const s = newGame(); const i = drop(s); s.paused = true; step(s, .1, random(), NOW + 120_000); assert.ok(!s.items.includes(i)); assert.equal(s.elapsed, 0);
  s.paused = false; const rng = random(); for (let n = 0; n < 10_000; n++) step(s, .1, rng, NOW + n * 100);
  assert.ok(s.runs > 8); assert.ok(s.items.filter(j => j.location === 'ground').length < 40); assert.equal(s.items.filter(j => j.location === 'inventory').length, 0);
});
test('a fresh Mage still clears fixed-difficulty encounters within three minutes', () => {
  for (let seed = 1; seed <= 12; seed++) { const s = newGame(); const rng = random(seed); for (let n = 0; n < 1800 && s.runs === 0; n++) step(s, .1, rng, NOW + n * 100); assert.equal(s.runs, 1, 'seed ' + seed); assert.equal(s.deaths, 0); assert.ok(s.elapsed < 180); }
  assert.deepEqual(ENCOUNTERS.map(e => e.hp), [45, 60, 100, 90, 110, 155, 125, 165, 260]);
});

test('equipment slot drops reject mismatches and obey the same space/level rules as direct equip', async () => {
  const { equipIntoSlot } = await import('../src/game.ts');
  const s = newGame(); const item = drop(s); item.slot = 'weapon'; item.baseId = 'emberwand';
  const before = serialize(s); assert.equal(equipIntoSlot(s, item.id, 'body', NOW), false); assert.equal(serialize(s), before);
  assert.equal(equipIntoSlot(s, item.id, 'weapon', NOW), true); assert.equal(s.loadouts[0].weapon, item.id); assert.equal(s.loadouts[1].weapon, '1'); assert.ok(s.items.some(i => i.id === '1'));
  fillPack(s); const next = drop(s); const full = serialize(s); assert.equal(equipIntoSlot(s, next.id, next.slot, NOW), false); assert.equal(serialize(s), full);
});

test('stash equipping works with a full pack and equipped gear occupies neither container', () => {
  const s = newGame(); const a = drop(s); pickup(s, a.id, NOW); moveItem(s, a.id, 'stash'); fillPack(s);
  const count = s.items.length; const before = s.items.filter(i => i.location === 'inventory').length;
  assert.equal(equip(s, a.id, NOW), true); assert.equal(a.location, 'equipped'); assert.equal(s.items.filter(i => i.location === 'stash').length, 0);
  assert.equal(s.items.filter(i => i.location === 'inventory').length, before); assert.equal(s.items.length, count);
  assert.ok(s.items.filter(i => Object.values(s.loadouts[0]).includes(i.id)).every(i => i.location === 'equipped'));
});
test('stash replacements reuse the freed stash slot and preserve locked displaced gear', () => {
  const s = newGame(); s.level = 10; const first = drop(s); first.slot = 'head'; first.baseId = 'hood'; first.locked = true; equip(s, first.id, NOW);
  const replacement = drop(s); replacement.slot = 'head'; replacement.baseId = 'hood'; pickup(s, replacement.id, NOW); moveItem(s, replacement.id, 'stash');
  for (let n = 0; n < 29; n++) { const i = drop(s); pickup(s, i.id, NOW); moveItem(s, i.id, 'stash'); }
  fillPack(s); const count = s.items.length;
  assert.equal(equip(s, replacement.id, NOW), true); assert.equal(replacement.location, 'equipped'); assert.equal(first.location, 'stash'); assert.equal(first.locked, true);
  assert.equal(s.items.filter(i => i.location === 'stash').length, 30); assert.equal(s.items.length, count); assert.equal(s.loadouts[0].head, replacement.id);
});
test('shared loadout gear stays reserved; final unequip needs room and never loses an item', () => {
  const s = newGame(); fillPack(s); const before = s.items.length;
  assert.equal(unequip(s, 'weapon'), true); assert.equal(s.items.find(i => i.id === '1')?.location, 'equipped');
  switchLoadout(s, 1); const snapshot = serialize(s); assert.equal(unequip(s, 'weapon'), false); assert.equal(serialize(s), snapshot);
  const owned = s.items.find(i => i.location === 'inventory')!; moveItem(s, owned.id, 'stash');
  assert.equal(unequip(s, 'weapon'), true); assert.equal(s.items.find(i => i.id === '1')?.location, 'inventory'); assert.equal(s.items.length, before);
});
test('v2 inventory-based equipment migrates once without changing stats, deadlines, IDs or progression', () => {
  const s = newGame(); s.level = 12; s.gold = 987; s.runs = 5; s.items[0].locked = true;
  for (let n = 0; n < 16; n++) { const i = drop(s); pickup(s, i.id, NOW); }
  const ground = drop(s); const old = { ...s, version: 2, items: s.items.map(i => i.location === 'equipped' ? { ...i, location: 'inventory' } : i) };
  const copy = restore(JSON.stringify(old), NOW); assert.equal(copy.version, 3); assert.equal(copy.gold, 987); assert.equal(copy.level, 12); assert.equal(copy.runs, 5);
  assert.deepEqual(copy.items.map(i => i.id), s.items.map(i => i.id)); assert.deepEqual(calculate(copy), calculate(s)); assert.deepEqual(copy.loadouts, s.loadouts);
  assert.equal(copy.items.filter(i => i.location === 'inventory').length, 16); assert.equal(copy.items.filter(i => i.location === 'equipped').length, 2);
  assert.equal(copy.items.find(i => i.id === ground.id)?.ground?.expiresAt, NOW + 120_000); assert.equal(copy.items[0].locked, true);
  assert.equal(serialize(restore(serialize(copy), NOW)), serialize(copy));
});
