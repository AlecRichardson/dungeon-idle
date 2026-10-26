import { cleanupGround, newGame, restore, serialize, step } from './game.ts';
import type { State } from './game.ts';
const KEY = 'embervault.save.v1';
export let state = newGame();
export let saveError = '';
export let savedAt = '';
let corrupt = false;
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const loaded = restore(raw);
    if (JSON.parse(raw).version !== loaded.version) {
      const backupKey = JSON.parse(raw).version === 1 ? 'embervault.save.before-floor-loot' : 'embervault.save.before-equipped-storage';
      localStorage.setItem(backupKey, raw);
      localStorage.setItem(KEY, serialize(loaded));
    }
    state = loaded;
  }
} catch { corrupt = true; saveError = 'Your saved data could not be read or migrated. It has been preserved. Export it or reset explicitly to enable saving.'; }
const listeners = new Set<() => void>();
export function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function save() { if (corrupt) return; try { localStorage.setItem(KEY, serialize(state)); savedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); saveError = ''; } catch { saveError = 'Saving failed. Storage may be full or unavailable. Keep this tab open and export a backup.'; } }
export function change(fn: (s: State) => void) { cleanupGround(state); fn(state); save(); listeners.forEach(fn => fn()); }
export function reset() { state = newGame(); corrupt = false; save(); listeners.forEach(fn => fn()); }
export function exportSave() { const raw = corrupt ? localStorage.getItem(KEY) || '' : serialize(state); const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'embervault-save.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
let last = performance.now(); let debt = 0; let sinceSave = 0;
setInterval(() => {
  const now = performance.now(); const delta = Math.min(0.25, (now - last) / 1000); last = now;
  if (document.hidden) { cleanupGround(state); debt = 0; return; }
  debt += delta;
  while (debt >= 0.1) { step(state, 0.1); debt -= 0.1; }
  sinceSave += delta; if (sinceSave >= 3) { save(); sinceSave = 0; }
  listeners.forEach(fn => fn());
}, 100);
document.addEventListener('visibilitychange', () => { last = performance.now(); debt = 0; cleanupGround(state); if (document.hidden) save(); });
window.addEventListener('pagehide', save);
