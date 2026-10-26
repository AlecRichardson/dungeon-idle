import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { COLORS, SLOTS } from './content.ts';
import type { Slot } from './content.ts';
import { equipIntoSlot, packFull, unequip } from './game.ts';
import type { Item, State } from './game.ts';
import { Glyph } from './ItemDetails.tsx';
import { change } from './store.ts';

const EMPTY_GLYPHS: Record<Slot, string> = { weapon: '╱', head: '♠', body: '♜', accessory: '◈' };
interface Props {
  state: State;
  draggedId: string | null;
  overSlot: Slot | null;
  inspect: (id: string) => void;
  notify: (message: string) => void;
  itemProps: (item: Item) => ButtonHTMLAttributes<HTMLButtonElement>;
}
export function equipmentDrop(s: State, id: string, slot: Slot): string {
  const item = s.items.find(i => i.id === id);
  if (!item) return 'That item is no longer available.';
  if (item.slot !== slot) return 'That item belongs in the ' + item.slot + ' slot.';
  if (item.location === 'stash') return 'Move stash items to your pack before equipping.';
  if (item.required > s.level) return 'Requires level ' + item.required + '. Your equipment is unchanged.';
  if (item.location === 'ground' && packFull(s)) return 'Pack full. The item stays on the floor; the dungeon keeps running.';
  return equipIntoSlot(s, id, slot) ? 'Equipped in loadout ' + (s.activeLoadout === 0 ? 'I' : 'II') + '. Displaced equipment stays in your pack.' : 'That item is no longer available.';
}
export function Equipment({ state: s, draggedId, overSlot, inspect, notify, itemProps }: Props) {
  const dragged = s.items.find(i => i.id === draggedId);
  return <div className="equipment-board" aria-label="Equipment slots">
    <div className="gear-slots">
      <svg className="gear-silhouette" viewBox="0 0 160 170" aria-hidden="true"><circle cx="80" cy="25" r="14"/><path d="M65 44L51 70L44 111L58 114L65 83L65 114L60 153L74 157L80 121L86 157L100 153L95 114L95 83L102 114L116 111L109 70L95 44Z"/></svg>
      {SLOTS.map(slot => {
        const item = s.items.find(i => i.id === s.loadouts[s.activeLoadout][slot]);
        const allowed = dragged?.slot === slot && dragged.required <= s.level && dragged.location !== 'stash' && !(dragged.location === 'ground' && packFull(s));
        return <div key={slot} className={'gear-cell gear-' + slot}>
          <button {...(item ? itemProps(item) : {})}
            className={'gear-frame ' + (item ? 'filled ' : 'vacant ') + (draggedId ? allowed ? 'drop-available ' : 'drop-rejected ' : '') + (overSlot === slot ? 'drag-over' : '')}
            data-equipment-slot={slot}
            style={{ '--gear-color': item ? COLORS[item.rarity] : '#6f6348' } as CSSProperties}
            aria-label={slot + ' slot: ' + (item ? item.name : 'Empty')}
            onClick={() => item ? inspect(item.id) : notify('Drag a ' + slot + ' item here, or inspect one and choose Equip.')}>
            {item ? <Glyph item={item}/> : <span className="slot-silhouette" aria-hidden="true">{EMPTY_GLYPHS[slot]}</span>}
            <span className="gear-slot-name">{slot}</span>
            {item?.locked && <span className="gear-lock" aria-label="Locked">◆</span>}
          </button>
          {item && <button className="slot-unequip" aria-label={'Unequip ' + slot} title={'Unequip ' + slot} onClick={() => change(s => unequip(s, slot))}>×</button>}
        </div>;
      })}
    </div>
    <p className="gear-help">Drag loot into its matching slot.<br/>Hover to inspect · × to unequip</p>
  </div>;
}
