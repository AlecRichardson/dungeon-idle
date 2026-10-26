# Current implementation decisions

The first playable was implemented in isolation in dungeon-idle after reading the completed item-generation, Mage-combat and dungeon-loot research. The later approved correction replaces the original auto-collection/inbox design.

1. Keep the existing Mage, fixed dungeon, explicit content tables and independent simulation. Preserve existing research, launchers and add-ons.
2. Represent drops as actual ground items in the same item array as pack/stash records. Persist wall-clock deadlines, locks and Gnome cooldown.
3. Enforce 120-second expiration, 15-second victory grace, death cleanup and lock protection. Capacity never blocks the dungeon.
4. Reuse sale prices, equip/loadout rules and persistent inspection. Ground pickup/equip needs pack space. Equipped gear is outside containers; stash equipping swaps displaced gear back into stash. Remove rarity auto-sales and all inbox UI/settings.
5. Add the activated Gnome: all unlocked non-Rainbow ground equipment, 60-second cooldown, no cooldown on empty eligibility.
6. Migrate v1 saves once with a raw backup, deleting only inbox items while preserving other progress. Save v3 under the existing key; v2 loadout gear moves into a separate equipped location without losing items.
7. Use shared item-only tooltips and inspection: name, rarity, slot, levels and nonzero bonuses. The user's latest correction removes all calculated comparison panels.
8. Animate Rainbow color through text using CSS, with reduced-motion support.
9. Replace the equipped-text list with four framed equipment slots and mouse drag-to-equip using icon previews, preserving explicit click/tap actions. Pointer capture makes dragging work in the embedded browser without another dependency.
10. Verify focused rules, production build and browser actions. Commit locally in the dedicated game repository; push after GitHub authentication is available.

Unchanged balance: three floors/nine encounters; fixed HP/attacks; floor item levels 1–3, 3–5, 5–7; requirement ceil(item level/2); inventory 18/stash 30. Strength +0.7 spell power, Intellect +1.5 spell power, Agility +0.5% crit (40% cap), Endurance +7 HP per point. Level adds 5 HP. Armor reduction armor/(armor+60), capped 70%; crit 1.5×; elemental affinity ±10%; one cast/second. Kills heal 30%; restarts fully heal. Original values and roll distributions are our design, not historical claims.
