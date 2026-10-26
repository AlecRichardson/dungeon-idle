import { useEffect, useRef, useState } from 'react';
import type { PointerEvent, MouseEvent, DragEvent } from 'react';
import { SLOTS } from './content.ts';
import type { Slot } from './content.ts';
import type { Item } from './game.ts';
import { equipmentDrop } from './Equipment.tsx';
import { change } from './store.ts';

interface Session { id: string; pointerId: number; x: number; y: number; source: HTMLElement; active: boolean }
interface Drag { id: string; x: number; y: number; over: Slot | null }
// Pointer capture keeps mouse dragging reliable in the embedded browser without a drag library.
export function useItemDrag(notify: (text: string) => void, closeTooltip: () => void) {
  const session = useRef<Session | null>(null);
  const suppressClickUntil = useRef(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  useEffect(() => {
    const slotAt = (x: number, y: number): Slot | null => {
      const value = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-equipment-slot]')?.dataset.equipmentSlot;
      return SLOTS.includes(value as Slot) ? value as Slot : null;
    };
    const move = (e: globalThis.PointerEvent) => {
      const current = session.current; if (!current || current.pointerId !== e.pointerId) return;
      if (!current.active && Math.hypot(e.clientX - current.x, e.clientY - current.y) < 6) return;
      current.active = true; e.preventDefault(); closeTooltip();
      setDrag({ id: current.id, x: e.clientX, y: e.clientY, over: slotAt(e.clientX, e.clientY) });
    };
    const finish = (e: globalThis.PointerEvent) => {
      const current = session.current; if (!current || current.pointerId !== e.pointerId) return;
      session.current = null; setDrag(null);
      if (current.source.hasPointerCapture(e.pointerId)) current.source.releasePointerCapture(e.pointerId);
      if (current.active) {
        suppressClickUntil.current = performance.now() + 300;
        const slot = slotAt(e.clientX, e.clientY);
        if (slot && e.type !== 'pointercancel') change(s => notify(equipmentDrop(s, current.id, slot)));
      }
    };
    window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', finish); window.addEventListener('pointercancel', finish);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish); };
  }, [notify, closeTooltip]);
  const suppressDragClick = (e: MouseEvent<HTMLButtonElement>) => { if (performance.now() < suppressClickUntil.current) { e.preventDefault(); e.stopPropagation(); } };
  const props = (item: Item) => ({
    'data-item-drag': 'true',
    draggable: false,
    onDragStart: (e: DragEvent<HTMLButtonElement>) => e.preventDefault(),
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 || e.pointerType === 'touch') return;
      session.current = { id: item.id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, source: e.currentTarget, active: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onClickCapture: suppressDragClick,
    onDoubleClickCapture: suppressDragClick,
  });
  return { drag, props };
}
