import { useGame } from './useGame';

/** HUD, prompts, toasts and subtitle previews drawn over the game canvas. */
export function Overlays() {
  const G = useGame();
  if (!G) return null;
  const { S, ui } = G;
  const playing = !S.photo && !S.reels && !S.editMode;
  const dialog = S.subStyle === 'dialog';
  const d = S.subs.dialog.trim(), j = S.subs.jp.trim(), k = S.subs.kr.trim();
  return (
    <>
      {playing && (ui.showClock || ui.showTask) && (
        <div className="hud">
          <span>{ui.showClock && <>{ui.clock}<br />{ui.room}</>}</span>
          <span>{ui.showTask && ui.task}</span>
        </div>
      )}
      <div className={'fade' + (ui.fading ? ' on' : '')} />
      {playing && ui.prompt && <div className="prompt">{ui.prompt}</div>}
      {ui.toast && ui.showTalk && <div className="toast">{ui.toast}</div>}
      {S.photo && S.guide && <div className="guide"><span>자막 안전영역 27%</span></div>}
      {S.photo && dialog && d && <div className="dlg">{d}</div>}
      {S.photo && !dialog && (j || k) && (
        <div className="subs"><span className="jp">{j}</span><span className="kr">{k}</span></div>
      )}
      {S.reels && ui.rec && <div className="rec">{ui.rec}</div>}
      {S.photo && <div className="frame-badge">PHOTO · 4:5</div>}
      {S.editMode && <div className="frame-badge">EDIT</div>}
    </>
  );
}
