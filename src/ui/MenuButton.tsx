import { useGame } from './useGame';

/** Big-screen mode: the menu lives in a drawer on the right; this button opens and closes it. */
export function MenuButton() {
  const G = useGame();
  if (!G || !G.ui.big) return null;
  const open = G.ui.menuOpen;
  return (
    <button className="menu-btn" aria-expanded={open} aria-controls="side-panel" aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
      onClick={() => { G.setUi({ menuOpen: !open }); if (open) G.stage.focus(); }}>
      {open ? '✕' : '☰ 메뉴'}
    </button>
  );
}
