import { useCallback, useEffect, useState } from 'react';
import { BASES, ENCOUNTERS, FLOORS, MODIFIERS, RARITIES, SLOTS, SPELLS } from './content.ts';
import type { Attribute, Bonuses } from './content.ts';
import { activateGnome, allocate, calculate, dropItem, equip, moveItem, packFull, pickup, protectedItem, sell, sellValue, switchLoadout, unequip, xpNeeded } from './game.ts';
import type { Item } from './game.ts';
import { change, exportSave, reset, savedAt, saveError, state, subscribe } from './store.ts';
import { Dungeon } from './Dungeon.tsx';
import { Equipment } from './Equipment.tsx';
import { useItemDrag } from './useItemDrag.ts';
import { Glyph, ItemDetails, ItemTooltip, LABELS, Name, round } from './ItemDetails.tsx';
import type { HoveredItem } from './ItemDetails.tsx';

type Tab = 'ground' | 'inventory' | 'stash' | 'history' | 'collection';
export function App() {
  const [, render] = useState(0);
  const [tab, setTab] = useState<Tab>('ground');
  const [selected, select] = useState<string>('1');
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [settings, setSettings] = useState(false);
  const [resetPrompt, setResetPrompt] = useState(false);
  const [hover, setHover] = useState<HoveredItem | null>(null);
  const [gnomeReceipt, setGnomeReceipt] = useState('');
  const closeTooltip = useCallback(() => setHover(null), []);
  const { drag, props: dragProps } = useItemDrag(setNotice, closeTooltip);
  useEffect(() => subscribe(() => render(n => n + 1)), []);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(t); }, [notice]);
  const s = state; const stats = calculate(s); const floor = Math.floor(s.encounter / 3); const enemy = ENCOUNTERS[s.encounter];
  const now = Date.now(); const cooldown = Math.max(0, Math.ceil((s.gnomeReadyAt - now) / 1000));
  const item = s.items.find(i => i.id === selected);
  const current = item ? s.items.find(i => i.id === s.loadouts[s.activeLoadout][item.slot]) : undefined;
  const hovered = s.items.find(i => i.id === hover?.id);
  const ground = s.items.filter(i => i.location === 'ground').sort((a, b) => (a.ground?.droppedAt ?? 0) - (b.ground?.droppedAt ?? 0));
  const visibleItems = tab === 'ground' ? ground : s.items.filter(i => i.location === tab && (filter === 'all' || i.slot === filter)).sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || b.ilvl - a.ilvl);
  const loot = ground.filter(i => i.ground?.floor === floor).slice(-4);
  const count = (location: Item['location']) => s.items.filter(i => i.location === location).length;
  const remaining = (i: Item) => i.locked ? 'Locked · preserved' : Math.max(0, Math.ceil(((i.ground?.expiresAt ?? now) - now) / 1000)) + 's remaining';
  const inspect = (id: string) => { select(id); const i = s.items.find(i => i.id === id); if (i && i.location !== 'equipped') setTab(i.location); };
  const act = (fn: () => boolean, success: string, failure = 'Cannot do that: check item protection, level requirement, or available space.') => {
    let ok = false; change(() => { ok = fn(); }); setNotice(ok ? success : failure);
  };
  const packFailure = packFull(s) ? 'Pack full. The item stays on the floor; the dungeon keeps running.' : 'Cannot equip: check the level requirement and room for displaced gear.';
  const hoverProps = (i: Item) => ({
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => { if (e.pointerType !== 'touch') setHover({ id: i.id, anchor: e.currentTarget }); },
    onPointerLeave: () => setHover(null),
    onFocus: (e: React.FocusEvent<HTMLElement>) => setHover({ id: i.id, anchor: e.currentTarget }),
    onBlur: () => setHover(null),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => { if (e.key === 'Escape') setHover(null); },
    'aria-describedby': hover?.id === i.id && hovered ? 'item-tooltip' : undefined,
  });
  const useGnome = () => change(s => {
    const result = activateGnome(s);
    const message = result.reason || 'Bling Gnome sold ' + result.count + (result.count === 1 ? ' item for ' : ' items for ') + result.gold + ' gold.';
    setNotice(message); if (result.count) setGnomeReceipt(message);
  });
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#" aria-label="Embervault home"><span className="brand-mark">◈</span><div>EMBERVAULT<small>DUNGEON IDLE <b>FIRST PLAYABLE</b></small></div></a><div className="header-right"><span className="save-state"><i/> {saveError ? 'SAVE NEEDS ATTENTION' : 'Saved locally' + (savedAt ? ' · ' + savedAt : '')}</span><span className="gold">◉ {s.gold.toLocaleString()} <small>GOLD</small></span><button onClick={() => setSettings(!settings)} aria-expanded={settings}>⚙ <span>Settings</span></button></div></header>
    {saveError && <div className="warning">{saveError} <button onClick={exportSave}>Export save</button><button onClick={() => { setSettings(true); setResetPrompt(true); }}>Reset options</button></div>}
    {settings && <section className="settings panel"><div><h2>Floor loot & local save</h2><p>Unlocked loot expires after 120 seconds and is lost on death. Victory preserves at least 15 seconds of remaining lifetime. Locked loot survives all cleanup. Timers continue while paused or away.</p><p>Pick up the items you want. The Bling Gnome sells unlocked, non-Rainbow ground items when activated, with a 60-second cooldown. No automatic rarity selling.</p></div><div><button onClick={exportSave}>Export save</button> <button onClick={() => setResetPrompt(!resetPrompt)}>Reset progress…</button>{resetPrompt && <p className="reset-confirm">Permanently erase this local game? <button className="danger" onClick={() => { reset(); select('1'); setResetPrompt(false); setNotice('A new expedition begins.'); }}>Erase & restart</button> <button onClick={() => setResetPrompt(false)}>Cancel</button></p>}</div></section>}
    <main className="layout">
      <aside className="hero-panel panel">
        <div className="eyebrow">YOUR ADVENTURER</div><div className="hero-name"><span className="portrait">✦</span><div><h1>The Wayfarer</h1><span>Mage · Level {s.level}</span></div></div>
        <div className="meter-label"><span>Health</span><b>{Math.ceil(s.hp)} / {Math.round(stats.maxHp)}</b></div><div className="meter health"><span style={{width:Math.min(100,s.hp/stats.maxHp*100)+'%'}}/></div>
        <div className="meter-label"><span>Experience</span><b>{s.xp} / {xpNeeded(s.level)}</b></div><div className="meter xp"><span style={{width:s.xp/xpNeeded(s.level)*100+'%'}}/></div>
        <div className="section-title"><h2>Attributes</h2><span className="points">{s.points} points</span></div>
        {([['strength','+0.7 spell power / point'],['agility','+0.5% crit / point · 40% cap'],['intellect','+1.5 spell power / point'],['endurance','+7 maximum health / point']] as [Attribute,string][]).map(([a,desc])=><div className="attribute" key={a}><div><span>{LABELS[a]}</span><small>{desc}</small></div><b>{stats.attributes[a]}</b><button disabled={!s.points} aria-label={`Add ${a}`} onClick={()=>change(s=>allocate(s,a))}>+</button></div>)}
        <div className="section-title"><h2>Auto-cast spell</h2><span>1s / cast</span></div><div className="spell-choices">{(['fire','shadow'] as const).map(e=><button key={e} className={`spell ${s.spell===e?'active':''} ${e}`} title={SPELLS[e].description} onClick={()=>change(s=>{s.spell=e;})}><span>{e==='fire'?'♨':'ϟ'}</span><div>{SPELLS[e].name}<small>{round(stats[e])} damage</small></div></button>)}</div>
        <p className="quiet">Affinity changes damage by ±10%. Critical hits deal 1.5× damage.</p>
        <div className="combat-stats"><div><span>Critical chance</span><b>{round(stats.crit*100)}%</b></div><div><span>Armor reduction</span><b>{round(stats.reduction*100)}%</b></div><small>Armor ÷ (armor + 60), capped at 70%.</small></div>
        <div className="section-title"><h2>Equipment</h2></div><div className="loadouts">{([0,1] as const).map(index=><button key={index} className={s.activeLoadout===index?'active':''} onClick={()=>change(s=>switchLoadout(s,index))}>Loadout {index===0?'I':'II'}</button>)}</div>
        <Equipment state={s} draggedId={drag?.id ?? null} overSlot={drag?.over ?? null} inspect={inspect} notify={setNotice} itemProps={i => ({...hoverProps(i), ...dragProps(i)})}/>
      </aside>

      <section className="adventure">
        <section className="dungeon-panel panel">
          <div className="dungeon-heading"><div><div className="eyebrow">THE EMBERVAULT · LEVELS 1–7 LOOT</div><h2>{FLOORS[floor]}</h2></div><button className="pause-button" onClick={() => change(s => { s.paused = !s.paused; })}>{s.paused ? '▶ Resume' : 'Ⅱ Pause'}</button></div>
          <div className="floor-track">{FLOORS.map((name, index) => <div key={name} className={(index === floor ? 'current ' : '') + (index < floor ? 'done' : '')}><span>{index < floor ? '✓' : '0' + (index + 1)}</span><div>{name}<small>{index === 2 ? 'Warden & boss chest' : index === 0 ? 'Enter the ruins' : 'Into the depths'}</small></div><div className="pips">{[0, 1, 2].map(n => <i key={n} className={s.encounter > index * 3 + n ? 'filled' : s.encounter === index * 3 + n ? 'now' : ''}/>)}</div></div>)}</div>
          <div className="scene-wrap"><Dungeon/>
            <div className="ground-loot" aria-label="Uncollected loot on this floor">{loot.map(i => <button key={i.id} className={'ground-label ' + (i.rarity === 'Rainbow' ? 'rainbow-border ' : '') + (selected === i.id ? 'selected' : '')} onClick={() => inspect(i.id)} {...hoverProps(i)} {...dragProps(i)}><Name item={i}/>{i.locked && <span className="floor-lock" aria-label="Locked"> ◆</span>}</button>)}</div>
            <button className="view-ground" onClick={() => { setTab('ground'); document.getElementById('loot-workbench')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }}>Ground loot · {ground.length} <span>all floors / runs ↓</span></button>
            {(s.phase === 'victory' || s.phase === 'death' || s.paused) && <div className="scene-message"><b>{s.paused ? 'Expedition paused' : s.phase === 'victory' ? 'The Warden has fallen' : 'A moment to recover'}</b><span>{s.paused ? 'Loot timers keep running. Lock or pick up what you want to keep.' : s.phase === 'victory' ? 'Ground loot remains. Every surviving drop has at least 15 seconds at victory.' : 'Unlocked floor loot was lost. Your pack, stash and locked drops are safe.'}</span></div>}
          </div>
          <div className="encounter-strip"><span className={'live-dot ' + (s.paused ? 'off' : '')}/><div><b>{s.phase === 'moving' ? 'Exploring the passage' : s.phase === 'fighting' ? enemy.name : s.phase === 'victory' ? 'Dungeon cleared' : 'Recovering'}</b><small>{s.phase === 'fighting' ? enemy.kind.toUpperCase() + ' · ' + Math.ceil(s.enemyHp) + ' / ' + enemy.hp + ' HP · ' + enemy.affinity + ' resistant (10%)' : 'Preset path · choose which floor loot to keep'}</small></div><span className="run-count">{s.runs} clears <i>·</i> {s.deaths} defeats</span></div>
        </section>
        <section className="gnome-panel panel" aria-label="Bling Gnome"><span className={'gnome-avatar ' + (cooldown ? 'resting' : '')} aria-hidden="true">♟<i>◉</i></span><div><h3>Bling Gnome</h3><p>{cooldown ? 'Counting coins · ready in ' + cooldown + 's' : 'Ready to sell unlocked ground loot. Rainbow is always spared.'}</p>{gnomeReceipt && <small className="gnome-receipt" role="status">{gnomeReceipt}</small>}</div><button disabled={cooldown > 0} onClick={useGnome}>Bling Gnome: Sell ground loot{cooldown ? ' (' + cooldown + 's)' : ''}</button></section>
        <section className="loot-panel panel" id="loot-workbench">
          <div className="loot-heading"><div><div className="eyebrow">THE SPOILS OF YOUR DESCENT</div><h2>Ground, pack & discoveries</h2></div><span className="quiet">Hover for details · click for actions</span></div>
          <div className="tabs" role="tablist">{(['ground', 'inventory', 'stash', 'history', 'collection'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setHover(null); }} className={tab === t ? 'active' : ''}>{t === 'ground' ? 'Ground ' + ground.length : t === 'inventory' ? 'Pack ' + count('inventory') + '/18' : t === 'stash' ? 'Stash ' + count('stash') + '/30' : t === 'history' ? 'Recent loot' : 'Collection'}</button>)}</div>
          {['ground', 'inventory', 'stash'].includes(tab) && <>
            <div className="pack-tools">{tab !== 'ground' && <select aria-label="Filter equipment slot" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All equipment</option>{SLOTS.map(slot => <option key={slot} value={slot}>{slot[0].toUpperCase() + slot.slice(1)}</option>)}</select>}<small>{tab === 'ground' ? 'Arrival order · all floors & runs · unlocked drops expire' : tab === 'inventory' ? 'Full pack never stops the dungeon' : 'Equip directly from stash · move to pack to sell'}</small></div>
            <div className="item-list">{visibleItems.map(i => <button className={'item-row ' + (i.id === selected ? 'selected' : '')} key={i.id} onClick={() => select(i.id)} {...hoverProps(i)} {...dragProps(i)}><Glyph item={i}/><div><Name item={i}/><small>{i.slot} <i>·</i> Item level {i.ilvl} <i>·</i> Requires {i.required}{i.required > s.level ? ' (too high)' : ''}</small>{i.location === 'ground' && <small className="ground-deadline">Floor {(i.ground?.floor ?? 0) + 1} · Run {(i.ground?.run ?? 0) + 1} · {remaining(i)}</small>}</div><span className="item-flags">{i.locked ? '◆ ' : ''}{s.loadouts.some(l => Object.values(l).includes(i.id)) ? 'Equipped' : 'Inspect ›'}</span></button>)}
              {visibleItems.length === 0 && <div className="empty-state"><span>◇</span><b>{tab === 'ground' ? 'The floor is clear' : tab === 'stash' ? 'A place for future builds' : 'Nothing here yet'}</b><p>{tab === 'ground' ? 'Defeated enemies leave loot here. Hover to inspect; pick up what you want.' : tab === 'stash' ? 'Inspect a pack item and choose “To stash”.' : 'Pick up an item from the ground, or change the slot filter.'}</p></div>}
            </div>
          </>}
          {tab === 'history' && <div className="history-list">{s.history.map((h, index) => <div key={h.id + '-' + index}><span>{h.sold ? '◉' : '◇'}</span><button disabled={!s.items.some(i => i.id === h.id)} onClick={() => inspect(h.id)}><Name item={h}/><small>Floor {h.floor} · {h.status === 'ground' ? 'On the ground' : h.status === 'kept' ? (s.items.some(i => i.id === h.id && i.location === 'equipped') ? 'Equipped' : 'Kept') : h.status === 'sold' ? 'Sold' : h.status === 'expired' ? 'Expired' : h.status === 'lost' ? 'Lost on death' : 'Removed during inbox migration'}</small></button></div>)}{!s.history.length && <p className="empty-state">Your discoveries will appear after the first encounter.</p>}</div>}
          {tab === 'collection' && <div className="collection"><h3>Equipment bases <span>{s.discoveredBases.length}/{BASES.length}</span></h3><div>{BASES.map(b => <article key={b.id} className={s.discoveredBases.includes(b.id) ? 'found' : ''}><span>{b.glyph}</span><b>{s.discoveredBases.includes(b.id) ? b.name : 'Undiscovered'}</b><small>{b.slot}</small></article>)}</div><h3>Modifier bundles <span>{s.discoveredModifiers.length}/{MODIFIERS.length}</span></h3>{MODIFIERS.map(m => <p className={s.discoveredModifiers.includes(m.id) ? 'found' : 'unfound'} key={m.id}>{s.discoveredModifiers.includes(m.id) ? '✓ ' + m.name + ' · ' + Object.entries(m.bonuses).filter(([,v]) => v !== 0).map(([k]) => LABELS[k as keyof Bonuses]).join(' + ') : '◇ Undiscovered bundle'}</p>)}</div>}
        </section>
      </section>
      <aside className="inspect-panel panel"><div className="eyebrow">ITEM INSPECTION</div>{item ? <>
        <ItemDetails item={item}/>
        {item.location === 'equipped' && <p className="ground-status">Equipped · outside pack and stash · reserved by loadout {s.loadouts.map((l, index) => Object.values(l).includes(item.id) ? (index === 0 ? 'I' : 'II') : '').filter(Boolean).join(' & ')}</p>}
        {item.location === 'ground' && <p className="ground-status">On the ground · {remaining(item)}</p>}
        <div className="inspect-actions">
          {item.location === 'ground' && <button className="primary" onClick={() => act(() => pickup(s, item.id), 'Picked up. The item is now in your pack.', packFailure)}>Pick up{packFull(s) ? ' · Pack full' : ''}</button>}
          <button className={item.location === 'ground' ? '' : 'primary'} disabled={item.required > s.level || current?.id === item.id} onClick={() => act(() => equip(s, item.id), 'Equipment updated. Equipped gear is outside your pack and stash.', packFailure)}>{current?.id === item.id ? 'Equipped' : item.required > s.level ? 'Requires level ' + item.required : item.location === 'stash' ? 'Equip from stash' : item.location === 'ground' ? 'Equip from floor' + (packFull(s) ? ' · Pack full' : '') : 'Equip in loadout ' + (s.activeLoadout === 0 ? 'I' : 'II')}</button>
          <button onClick={() => change(s => { const i = s.items.find(i => i.id === item.id); if (i) i.locked = !i.locked; })}>{item.locked ? '◆ Unlock item' : '◇ Lock item'}</button>
          {(item.location === 'inventory' || item.location === 'stash') && <div><button disabled={s.loadouts.some(l => Object.values(l).includes(item.id))} onClick={() => act(() => moveItem(s, item.id, item.location === 'stash' ? 'inventory' : 'stash'), item.location === 'stash' ? 'Moved to pack.' : 'Moved to stash.')}>{item.location === 'stash' ? 'To pack' : 'To stash'}</button><button disabled={item.location !== 'inventory' || protectedItem(s, item.id)} onClick={() => act(() => sell(s, item.id), 'Sold for ' + sellValue(item) + ' gold.')}>Sell · {sellValue(item)} ◉</button></div>}
          {item.location === 'inventory' && <button disabled={protectedItem(s, item.id)} onClick={() => act(() => dropItem(s, item.id), 'Dropped on the floor. Its 120-second timer has started.')}>Drop on floor</button>}
        </div>
        <p className="quiet">{item.location === 'ground' ? item.locked ? 'Locked: protected from expiration, death and the Gnome. Pick up to keep in your pack.' : item.rarity === 'Rainbow' ? 'Rainbow: the Gnome will spare it. Expiration and death still destroy it unless locked.' : 'Pick up to sell manually. The Gnome can sell this directly from the ground.' : protectedItem(s, item.id) ? 'Protected: locked or equipped in a loadout. Unequip in both loadouts before selling or dropping.' : item.location === 'stash' ? 'Move to pack to sell manually.' : 'Selling is immediate. Lock anything you want to keep.'}</p>
      </> : <div className="empty-state"><span>◈</span><b>{selected === '1' ? 'Every drop is a decision' : 'Item no longer available'}</b><p>Select a floor label or a list item to inspect it. Unlocked floor loot can expire, be sold by the Gnome, or be lost on death.</p></div>}
        <div className="field-notes"><div className="eyebrow">FIELD NOTES</div><p>Deeper floors drop higher item levels. Rarity adds modifier bundles; an old Rainbow can lose to a newer Common.</p><p>Pack size never stops your descent. Death keeps owned gear and locked drops; unlocked ground loot is lost.</p><small>Local save only. No offline earnings. Loot deadlines and Gnome cooldown continue while away.</small></div>
      </aside>
    </main>
    <footer>EMBERVAULT <span>Original Dungeon Runners-inspired prototype · no membership gates</span><span>{s.kills} foes defeated · {Math.floor(s.elapsed / 60)}m explored</span></footer>
    {drag && <div className="drag-ghost" style={{left: drag.x + 14, top: drag.y + 12}}>{s.items.find(i => i.id === drag.id) && <Glyph item={s.items.find(i => i.id === drag.id)!}/>}</div>}
    {!drag && hover && hovered && hover.anchor.isConnected && <ItemTooltip item={hovered} anchor={hover.anchor}/>}
    {notice && <div className="toast" role="status">{notice}</div>}
  </div>;
}
