import { useEffect, useRef, useState } from 'react';
import { useGame } from './useGame';

/** Phones and tablets: a thumb stick (presses the WASD keys, pushed all the way = Shift run) and action buttons.
 *  Everything goes through the same keys as the keyboard, so walking, driving, edit mode and photo panning all work. */
const isTouch = () =>
  typeof window !== 'undefined' &&
  (location.search.includes('touch') || window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

const press = (key: string) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  window.dispatchEvent(new KeyboardEvent('keyup', { key }));
};

const R = 46;          // how far the knob travels (px)
const DEAD = 0.3;      // below this, that axis does not count
const RUN = 0.85;      // beyond this, souka runs

export function TouchControls() {
  const G = useGame();
  const [on] = useState(isTouch);
  const [knob, setKnob] = useState<[number, number]>([0, 0]);
  const base = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);

  const setStick = (x: number, y: number) => {
    if (!G) return;
    const k = G.keys, m = Math.hypot(x, y);
    k['w'] = y < -DEAD; k['s'] = y > DEAD; k['a'] = x < -DEAD; k['d'] = x > DEAD; k['shift'] = m > RUN;
  };
  const move = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId || !base.current) return;
    const r = base.current.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    setKnob([dx, dy]); setStick(dx / R, dy / R);
  };
  const end = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return;
    pid.current = null; setKnob([0, 0]); setStick(0, 0);
  };
  useEffect(() => () => setStick(0, 0), [G]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!on || !G) return null;
  const S = G.S;
  const btn = (label: string, key: string, cls = '') => (
    <button key={key + label} className={'tbtn ' + cls} onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); press(key); }}>{label}</button>
  );

  return (
    <div className="touch">
      <div
        className="tstick" ref={base} aria-label="이동 스틱"
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); pid.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
        onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      >
        <div className="tknob" style={{ transform: `translate(${knob[0]}px, ${knob[1]}px)` }} />
      </div>
      <div className="tbtns">
        {S.photo ? btn('찰칵', ' ', 'big')
          : S.reels ? btn(S.recording ? '■ 정지' : '● 녹화', 'v', 'big')
          : S.editMode ? null
          : <>
              {S.held && btn('가까이', 'z')}
              {S.held && btn('멀리', 'x')}
              {S.riding && btn(S.riding.lights ? '라이트 끄기' : '라이트', 'l')}
              {btn(S.riding ? '내리기' : '행동', 'c', 'big')}
            </>}
      </div>
    </div>
  );
}
