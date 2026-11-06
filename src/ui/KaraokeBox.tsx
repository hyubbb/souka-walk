import { useEffect, useState } from 'react';
import { useGame } from './useGame';
import { KARAOKE_SPEEDS } from '../game/karaoke';

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
      <h3 className="sub">칠해지는 속도</h3>
      <div className="row" role="group" aria-label="가사 칠해지는 속도">
        {KARAOKE_SPEEDS.map((s, i) => <button key={s.label} aria-pressed={K.speed === i} onClick={() => G.karaoke.setSpeed(i)}>{s.label}</button>)}
      </div>
      <div className="row">
        <button onClick={() => G.karaoke.prev()}>◀ 이전 줄</button>
        <button onClick={() => G.karaoke.next()}>다음 줄 ▶</button>
        <span className="empty">{Math.min(K.idx + 1, K.lines.length)} / {K.lines.length}</span>
      </div>
      <p className="empty">마이크 앞에서 C → <b>Space를 누르고 있는 동안</b> 지금 줄이 칠해져요(떼면 멈춤). 다 칠해지면 다음 줄로 넘어가고, Enter로 바로 넘기고 Backspace로 돌아가요. 릴스(R)로 찍으면 화면 가사도 같이 찍혀요.</p>
    </section>
  );
}
