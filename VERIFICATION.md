# Verification — loot and equipment update

Completed locally on 2026-10-25. No public deployment. Final user instructions include scrolling Rainbow names, framed equipment with drag-to-equip, and removal of calculated item comparisons.

## Focused tests

18 Node built-in tests pass, covering:

- Equipment, attributes and loadouts affect real combat; fixed enemy tables and early clearing pace remain intact.
- 3,000 generated rewards obey level ranges, requirements and legal unique bundle rules; all rarities appear.
- Boss rewards improve average quality without guaranteeing Rainbow; high-level Common can outperform old Rainbow.
- Rewards remain on the ground, record discoveries, and never sell immediately.
- Full pack rejects pickup/direct equip without changing item/equipment state while complete runs and resets continue.
- Floor equipping preserves displaced equipment and the other loadout; wrong-slot drops and unmet requirements fail safely.
- Exact 120-second expiration grants no gold; locks survive. Rainbow still expires when unlocked.
- Victory grants surviving drops 15 seconds minimum without shortening longer deadlines or resurrecting expired items.
- Death clears unlocked ground items, including Rainbow, while keeping owned/stashed/locked items and automatically restarting.
- Gnome sells across floors/runs with shared prices, excludes locks/Rainbow/owned items, pays once, and enforces exact cooldown boundaries. Empty eligibility consumes no cooldown.
- Manual sale requires inventory. Both loadouts and locks protect sale/dropping; stash capacity and record identity are preserved.
- Save/load preserves deadlines, locks, cooldown, progression and pause; offline expiration grants no earnings.
- Old saves migrate once, deleting only inbox items and obsolete settings while preserving other data and manual pause.
- Paused combat still permits timed cleanup. A 1,000-second simulated run bounds unlocked floor accumulation.

## Browser checks

The main preview at http://127.0.0.1:5173 migrated the existing save without resetting its Mage, gold, equipment, stash or discoveries. Observed multiple continued clears with a full pack and no inbox or capacity pause.

Verified a full-pack pickup and floor equip report Pack full and retain the selected item. Locked a naturally dropped Rainbow. Activated the Gnome: 11 eligible ground items sold for exactly 199 gold, while locked/Rainbow drops remained and a 60-second cooldown appeared. Observed the unprotected Rainbow expire later while the locked drop persisted beyond its original deadline.

Inspected a fantasy tooltip: its rectangle fit inside the viewport, and computed Rainbow background positions changed under the rainbow-flow animation. The latest UI removes all comparison panels; the browser DOM had zero .comparison elements. The persistent inspection and shared tooltip display only item details.

Used a disposable fixture on separate port 5174, isolated from the player's save, for deterministic interaction checks:

- Dragged a locked Rainbow floor wand into the weapon frame. The frame updated, the item moved to inventory, the previous wand remained owned, and a success message appeared.
- Dragged that inventory wand onto the head slot. It was rejected with the correct slot explanation and equipment stayed unchanged.
- Reloaded and verified the equipped wand persisted.
- With Pack 18/18, dragged the floor wand into its matching slot. It stayed on the ground and the original weapon remained equipped.
- Included an explicit armor: 0 on the test wand and confirmed Armor was absent from the item bonus list.
- Unlocked an eligible test ground item and activated the Gnome: one item sold for 14 gold. Reload retained the cooldown and spared the locked Rainbow.
- Browser console error inspection returned no errors.

The disposable HTML fixture was removed after testing. Screenshots in verification/ document the revised view. Mouse drag uses pointer capture; touch and keyboard users retain inspection/action buttons. No exhaustive mobile or screen-reader pass was performed.

## Build and delivery

Production build runs strict TypeScript checks and Vite. Phaser remains a separate roughly 1.2 MB minified / 332 KB gzip chunk, with Vite's expected large-chunk advisory. No runtime art/font/CDN dependencies were added. The development preview remains running on loopback.

Git origin: https://github.com/AlecRichardson/dungeon-idle.git. A local commit is prepared in this dedicated game repository. Pushing requires GitHub authentication, deferred by the user; no push to the earlier ember-vault URL is attempted.

## Stash and equipped-storage follow-up

22 focused tests and the production build pass after adding stash equipping and separate equipped storage. New outcome checks cover full-pack stash equip, full-stash swaps with protected displaced gear, shared loadout reservations, safe full-pack unequip failure, and v2-to-v3 migration preserving stats, item IDs, deadlines, locks and progression. Equipped items no longer appear in inventory or stash and consume no capacity.

An isolated browser fixture verified Equip from stash changed the weapon frame, reduced Stash 2/30 to 1/30, and left Pack 0/18. Dragging a second stash weapon replaced it and returned the first to stash. Reload preserved the second equipped weapon and first stored weapon; browser errors remained empty. The temporary fixture was removed. Drag previews now render the shared item glyph alone rather than a name label.

The user explicitly kept the two-minute ground lifetime. Live inspection found level-32 Fire output around 174/cast against a fixed 260-HP boss, explaining quick clears; no enemy scaling or stat reset was added. Ground loot is not sold on enemy death: the four-label floor view rotates while older retained items remain in the Ground list until expiration/player death/Gnome sale. An MMO-style scrollable loot-pile presentation was recommended as a future UI change, not implemented in this follow-up.
