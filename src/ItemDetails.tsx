import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BASES, COLORS, MODIFIERS } from './content.ts';
import type { Bonuses, Rarity } from './content.ts';
import type { Item } from './game.ts';

export const LABELS: Record<keyof Bonuses, string> = { strength: 'Strength', agility: 'Agility', intellect: 'Intellect', endurance: 'Endurance', power: 'Spell power', armor: 'Armor', health: 'Max health', damage: 'All damage %', fire: 'Fire damage %', shadow: 'Shadow damage %' };
export const round = (v: number) => Math.round(v * 10) / 10;
export function Name({ item }: { item: { name: string; rarity: Rarity } }) {
  return <span className={item.rarity === 'Rainbow' ? 'rainbow' : ''} style={{ color: COLORS[item.rarity] }}>{item.name}</span>;
}
export function Glyph({ item }: { item: Item }) {
  return <span className={`item-glyph ${item.slot}`} style={{ color: COLORS[item.rarity], borderColor: COLORS[item.rarity] + '55' }}>{BASES.find(b => b.id === item.baseId)?.glyph}</span>;
}
export function ItemDetails({ item, compact = false }: { item: Item; compact?: boolean }) {
  return <>
    <div className="inspect-title"><Glyph item={item}/><h2><Name item={item}/></h2></div>
    <div className="item-meta"><span style={{ color: COLORS[item.rarity] }}>{item.rarity} {item.slot}</span><span>Item level {item.ilvl} · Requires level {item.required}</span></div>
    <div className="divider"/>
    <div className="item-bonuses">{Object.entries(item.bonuses).filter(([, value]) => Number.isFinite(value) && value !== 0).map(([key, value]) => <div key={key}><span>{LABELS[key as keyof Bonuses]}</span><b>{value > 0 ? '+' : ''}{value}</b></div>)}</div>
    {!compact && <p className="affixes">{item.modifiers.length ? item.modifiers.map(id => MODIFIERS.find(m => m.id === id)?.name).join(' / ') : 'Unmodified base equipment'}</p>}

  </>;
}
export interface HoveredItem { id: string; anchor: HTMLElement }
export function ItemTooltip({ item, anchor }: { item: Item; anchor: HTMLElement }) {
  const host = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8, ready: false });
  useLayoutEffect(() => {
    const place = () => {
      const rect = anchor.getBoundingClientRect(); const tip = host.current!; const width = tip.offsetWidth; const height = tip.offsetHeight;
      const right = rect.right + 10;
      const left = right + width <= window.innerWidth - 8 ? right : rect.left - width - 10 >= 8 ? rect.left - width - 10 : Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const top = Math.max(8, Math.min(rect.top, window.innerHeight - height - 8));
      setPosition({ left, top, ready: true });
    };
    place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [anchor, item.id]);
  return createPortal(<div ref={host} id="item-tooltip" role="tooltip" className="item-tooltip" style={{ left: position.left, top: position.top, visibility: position.ready ? 'visible' : 'hidden' }}><ItemDetails item={item} compact/><p className="quiet">Click to inspect and choose an action.</p></div>, document.body);
}
