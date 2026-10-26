# Embervault — Dungeon Idle

First playable TypeScript / React / Phaser game, with original content and procedural art. Game simulation is independent of both renderers. All formulas, rolls and odds are our own design, informed by the sibling Dungeon Runners research, not recovered historical behavior. No client assets or research catalogs ship in the application.

## Launch

Use Node 22.18+ (Node 24 recommended) and pnpm:

```powershell
Set-Location 'C:\Users\alecw\OneDrive\Documents\ChatGPT\DR\dungeon-idle'
pnpm install
pnpm dev
```

Open http://127.0.0.1:5173/. Loopback only; no public deployment. On this machine pnpm is also available at `C:\Users\alecw\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd`. With dependencies installed, `node node_modules/vite/bin/vite.js --host 127.0.0.1` also works.

`pnpm test` runs the focused rules tests. `pnpm build` checks TypeScript and creates production assets; `pnpm preview` serves them on port 4173. Keep using the same origin/port for your saved game. Do not open dist/index.html directly.

## Play

One Mage automatically traverses three floors and nine fixed encounters. Allocate attributes, choose Fire Bolt or Shadow Arc, and manage loot during combat. Victory/death restarts after three seconds. Each kill restores 30% maximum HP; restarting fully heals. Gold, XP, inventory, stash and discoveries survive death. Enemy difficulty never scales with the player.

Eight equipment bases occupy four slots: weapon, body, head and accessory. There are two independent equipment loadouts; items referenced by either are protected from sale, moving and dropping. Equipped items live outside inventory/stash and consume no container slots. Gear referenced by either loadout stays reserved as equipped; switch loadouts to manage it. The equipment board uses dark, rarity-edged frames inspired by the supplied reference, with a head slot, tall weapon/body slots and an accessory slot.

Drag ground or inventory items into the matching equipment frame to equip. Ground equipping requires a free pack slot and the required level. Wrong slots, insufficient levels and full packs leave equipment unchanged. Stash items equip directly, including by dragging. Displaced gear returns to the container the new item came from (stash or pack), unless the other loadout still uses it. Ground swaps return displaced gear to the pack. Unequipping the final loadout reference requires pack space and fails safely if full. Click/tap inspection buttons provide the same actions without dragging. Use the small × to unequip. Dragging shows only the item placeholder icon once movement starts. Mouse dragging uses lightweight pointer capture, including in the embedded browser; touch uses the buttons.

## Floor loot

Equipment drops remain uncollected on the floor. Dark, gold-edged labels show up to four recent ground items on the current floor; the Ground tab lists every retained item across floors and runs. Labels and list entries reference the same item records. Rainbow names have a continuously scrolling color gradient, honoring reduced-motion preferences.

Hover or keyboard-focus an item for a viewport-clamped fantasy tooltip. Click to keep its inspection panel open. Details show full name, rarity, slot, item level, equip requirement and only meaningful nonzero bonuses. Neither tooltips nor the inspection panel show calculated comparisons; players compare the item bonuses themselves.

Pick up moves an item into the 18-slot pack. If full, it reports **Pack full** and leaves the item on the ground. Capacity never pauses combat, movement or resets. A 30-slot stash remains available. There is no inbox and no immediate rarity-based auto-selling.

Unlocked ground items expire 120 seconds after dropping, granting no gold. They persist across floor changes and victory resets. At victory, each surviving unlocked item gets at least 15 seconds remaining. Death immediately destroys all unlocked floor loot, including Rainbow. Locking preserves ground loot through expiration, death and resets and prevents selling/dropping owned items. Unlocking a ground item whose deadline passed allows it to expire immediately. Picked-up items have no expiration timer.

Manual sales require an item in inventory and use the original price: 3 × item level + rarity index × 5. Rainbow can be sold manually when unlocked and unequipped. Dropping an unlocked, unequipped pack item starts a new 120-second ground lifetime.

## Bling Gnome

Available immediately. Press **Bling Gnome: Sell ground loot** to sell all unlocked, non-Rainbow floor items across every retained floor/run. It works with a full pack. Rainbow and locked items are always excluded. The result shows item count and gold earned, with a lightweight companion/coin cue. A successful action starts a 60-second cooldown; an empty/protected-only action consumes no cooldown. This is an activated action, not periodic automatic selling. No additional price multiplier is used.

Local research context: `../docs/dungeon-runners-reference/abilities.json`, `client:skills.generic.SummonBlingGnome`, describes converting Rare-and-lower assigned items and contains a raw cooldown field of 45. Those authored fields are context, not proof of historical runtime behavior. This prototype intentionally follows the user's explicit 60-second rule and its existing sale-value formula.

## Saves and migration

Version-3 snapshots use the existing localStorage key `embervault.save.v1`, avoiding an origin/key reset. Version-1 saves first migrate their loot rules: only old inbox items are deleted, as authorized. Inventory, stash, equipment, locks, progression and collections are preserved; obsolete inbox-limit/auto-sale settings are removed. Version-2 saves migrate their loadout references to the separate equipped location without changing stats, IDs, locks or progression; the raw snapshot is backed up at `embervault.save.before-equipped-storage`. The original version-1 snapshot is backed up at `embervault.save.before-floor-loot` before committing the migrated save. Explicit manual pause is preserved; capacity pauses no longer exist.

Ground deadlines, ground locks and the Gnome cooldown persist. Deadlines use wall-clock timestamps and continue while paused, hidden or closed. Reload applies elapsed ground expiration without simulating combat or awarding offline earnings. Saves occur every three seconds, after actions and on hiding/leaving. Invalid snapshots are preserved rather than overwritten. Settings provide JSON export and explicit reset. Save import/cloud sync remain deferred.

## Structure and remaining scope

- `content.ts`: bases, legal bundles, rarity weights, spells and fixed encounters.
- `game.ts`: serializable state, calculations, loot lifecycle, Gnome, equipment rules and validated migration; injectable random source and timestamps.
- `store.ts`: fixed-step clock and local persistence.
- `Dungeon.tsx`: original procedural Phaser scene consuming simulation state/events.
- `ItemDetails.tsx`: shared item-only details, animated rarity names and clamped tooltips.
- `Equipment.tsx` / `useItemDrag.ts`: framed slots and pointer-based drag interactions using the existing equip rules.
- `App.tsx`: actions, storage, lists, history and collection.

This remains one dungeon, one Mage, two spells and eight bases. Offline catch-up, more content/classes, mana/ranks/trees, a shop/gold sinks, sound, polished character art, save import/migrations beyond version 1, and broader device/accessibility coverage remain V1 work. The fixed dungeon eventually becomes easy. Locked ground items intentionally remain until the player manages them; only unlocked accumulation is automatically bounded. Phaser remains the main bundle cost at about 332 KB gzip.

See VERIFICATION.md for completed checks. The dedicated game repository uses origin `https://github.com/AlecRichardson/dungeon-idle.git`; unrelated parent research/launcher/add-on projects are outside its checkout.
