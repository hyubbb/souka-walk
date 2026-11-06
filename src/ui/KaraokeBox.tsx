import { useEffect, useState } from 'react';
import { useGame } from './useGame';
import { KARAOKE_SPEEDS, KARAOKE_CPS } from '../game/karaoke';

/** In the karaoke box: type the lyrics (one line per line), pick the wipe speed, step through the lines. */
export function KaraokeBox() {
  const G = useGame();
  const K = G?.karaoke?.K;
  const [title, setTitle] = useState(K?.title || '');
  const [text, setText] = useState(K?.text || '');
  useEffect(() => { if (K) { setTitle(K.title); setText(K.text); } }, [K]);
  if (!G || !K || G.S.zone !== 'house' || G.S.home !== 'karaoke') return null;
  const dirty = title !== K.title || text !== K.text;
  return (
    <section className="box">
      <h2>노래방 · 가사</h2>
      <input className="sticker-text" value={title} placeholder="곡 제목 (화면 위에 나와요)" aria-label="곡 제목" onChange={(e) => setTitle(e.target.value)} />
      <textarea className="sticker-text" rows={8} value={text} placeholder={'가사를 한 줄씩 입력\n(줄마다 색이 차례로 칠해져요)'} aria-label="가사"
        onChange={(e) => setText(e.target.value)} />
      <div className="row">
        <button className="primary" disabled={!dirty} onClick={() => G.karaoke.setLyrics(title, text)}>{dirty ? '가사 적용' : '적용됨'}</button>
        <button onClick={() => G.karaoke.restart()}>처음부터</button>
      </div>
      <h3 className="sub">칠해지는 속도 · 1초에 {K.cps}글자</h3>
      <input type="range" className="speed-range" min={KARAOKE_CPS.min} max={KARAOKE_CPS.max} step={KARAOKE_CPS.step} value={K.cps}
        aria-label="가사 칠해지는 속도 (1초에 몇 글자)" onChange={(e) => G.karaoke.setCps(Number(e.target.value))} />
      <div className="row" role="group" aria-label="속도 빠른 선택">
        <button onClick={() => G.karaoke.setCps(K.cps - 0.5)} aria-label="조금 느리게">−</button>
        {KARAOKE_SPEEDS.map((s) => <button key={s.label} aria-pressed={K.cps === s.cps} onClick={() => G.karaoke.setCps(s.cps)}>{s.label}</button>)}
        <button onClick={() => G.karaoke.setCps(K.cps + 0.5)} aria-label="조금 빠르게">+</button>
      </div>
      <div className="row">
        <button onClick={() => G.karaoke.prev()}>◀ 이전 줄</button>
        <button onClick={() => G.karaoke.next()}>다음 줄 ▶</button>
        <span className="empty">{Math.min(K.idx + 1, K.lines.length)} / {K.lines.length}</span>
      </div>
      <p className="empty">마이크 앞에서 C → 나란히 있는 세 키로: <b>J 누르고 있는 동안</b> 부르기(지금 줄이 칠해짐, 떼면 멈춤) · <b>K</b> 다음 줄 · <b>H</b> 이전 줄. 다 칠해진 줄은 바로 다음 줄로 넘어가요. ROOM 1은 화면 앞, ROOM 2(밴드)·3(무대)는 무대 위에서 불러요. 릴스(R)로 찍으면 화면 가사도 같이 찍혀요.</p>
    </section>
  );
}
