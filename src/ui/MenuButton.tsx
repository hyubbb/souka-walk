import { useEffect } from 'react';
import { useGame } from './useGame';

/** Big-screen mode: the menu lives in a drawer on the right; this button opens and closes it.
 *  Esc or a click / tap anywhere outside the drawer closes it too. */
export function MenuButton() {
  const G = useGame();
  const open = !!G?.ui.menuOpen;
  useEffect(() => {
    if (!G || !open) return;
    const close = () => { G.setUi({ menuOpen: false }); G.stage.focus(); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest('#side-panel, .menu-btn, .modal')) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); close(); } };
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);   // capture: Esc closes the menu before it can leave photo / reels mode
    return () => { document.removeEventListener('pointerdown', onDown, true); window.removeEventListener('keydown', onKey, true); };
  }, [G, open]);
  if (!G || !G.ui.big) return null;
  return (
    <button className="menu-btn" aria-expanded={open} aria-controls="side-panel" aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
      onClick={() => { G.setUi({ menuOpen: !open }); if (open) G.stage.focus(); }}>
      {open ? '✕' : '☰ 메뉴'}
    </button>
  );
}
