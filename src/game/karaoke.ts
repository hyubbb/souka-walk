// Karaoke: lyrics typed in the menu play on the screen in the karaoke box, two lines at a time like a
// Japanese karaoke machine. Holding the sing key (Space, or the touch button) wipes colour across the line
// being sung at the chosen speed; letting go pauses it, so the wipe can follow the real song by hand.
// A finished line hands over to the next one by itself; Enter jumps ahead, Backspace goes back.
import * as THREE from 'three';
import type { Game } from './types';

export interface KaraokeState {
  title: string;
  text: string;          // what was typed (one line of lyrics per line)
  lines: string[];
  idx: number;           // the line being sung
  prog: number;          // 0..1 across that line
  cps: number;           // how fast the colour runs: characters per second
}
/** Quick picks for the wipe speed (characters per second); the slider in the menu sets any value. */
export const KARAOKE_SPEEDS = [{ label: '느리게', cps: 3 }, { label: '보통', cps: 5 }, { label: '빠르게', cps: 8 }];
export const KARAOKE_CPS = { min: 1, max: 15, step: 0.5 };
const STORE = 'souka-karaoke';
const SAMPLE = 'ここに歌詞を入力してね\n一行ずつ色が変わっていくよ\nスペースを押している間だけ\nゆっくり塗られていく';

export function setupKaraoke(G: Game) {
  const { S, keys } = G;
  const K: KaraokeState = { title: '', text: SAMPLE, lines: [], idx: 0, prog: 0, cps: 5 };
  try { Object.assign(K, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch { /* private mode */ }
  if (!(K.cps > 0)) K.cps = 5;
  K.lines = split(K.text); K.idx = 0; K.prog = 0;

  const W = 1024, H = 576;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const screenMat = new THREE.MeshBasicMaterial({ map: tex });
  for (const s of G.kScreens) s.material = screenMat;
  const FONT = '"Hiragino Sans", "Noto Sans JP", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

  function split(t: string) { return t.split('\n').map((l) => l.trim()).filter(Boolean); }
  function save() { try { localStorage.setItem(STORE, JSON.stringify({ title: K.title, text: K.text, cps: K.cps })); } catch { /* ignore */ } }
  // every change redraws the screen at once (the screen otherwise refreshes 30 times a second)
  const now = () => draw(performance.now() / 1000);
  function setLyrics(title: string, text: string) { K.title = title; K.text = text; K.lines = split(text); K.idx = 0; K.prog = 0; save(); now(); G.notify(); }
  function setCps(v: number) { K.cps = Math.min(KARAOKE_CPS.max, Math.max(KARAOKE_CPS.min, Math.round(v * 2) / 2)); save(); G.notify(); }
  function next() { if (K.idx < K.lines.length) { K.idx++; K.prog = 0; hold = 0; now(); G.notify(); } }
  function prev() { if (K.idx > 0) { K.idx--; K.prog = 0; hold = 0; now(); G.notify(); } }
  function restart() { K.idx = 0; K.prog = 0; hold = 0; now(); G.notify(); }

  /** One lyric line, unsung (white, blue outline) with the sung part (pink, white outline) wiped over it. */
  function lyric(text: string, x: number, y: number, align: 'left' | 'right', prog: number, size: number) {
    g.font = `bold ${size}px ${FONT}`;
    let w = g.measureText(text).width, fs = size;
    if (w > W - 120) { fs = Math.floor(size * (W - 120) / w); g.font = `bold ${fs}px ${FONT}`; w = g.measureText(text).width; }
    const x0 = align === 'left' ? x : x - w;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    g.lineWidth = fs * 0.2; g.strokeStyle = '#1a3d9c'; g.strokeText(text, x0, y);
    g.fillStyle = '#ffffff'; g.fillText(text, x0, y);
    if (prog > 0) {
      g.save(); g.beginPath(); g.rect(x0 - 10, y - fs * 1.2, (w + 10) * prog + 10, fs * 1.6); g.clip();
      g.strokeStyle = '#ffffff'; g.strokeText(text, x0, y);
      g.fillStyle = '#ff3d8b'; g.fillText(text, x0, y);
      g.restore();
    }
  }

  let lastDraw = 0;
  function draw(t: number) {
    // a slowly drifting "music video" behind the words
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, `hsl(${(250 + Math.sin(t * 0.1) * 20) | 0},45%,22%)`); bg.addColorStop(1, `hsl(${(310 + Math.sin(t * 0.13) * 25) | 0},50%,30%)`);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) {
      const px = (i * 173 + t * (8 + (i % 4) * 5)) % (W + 200) - 100, py = (i * 97) % (H - 160) + 20 + Math.sin(t * 0.4 + i) * 12;
      g.fillStyle = `rgba(255,255,255,${0.04 + (i % 3) * 0.025})`; g.beginPath(); g.arc(px, py, 26 + (i % 5) * 14, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, H - 220, W, 220);
    // title bar
    g.fillStyle = '#ffe14d'; g.font = `bold 30px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText(`♪ ${K.title || 'souka カラオケ'}`, 40, 56);
    if (!K.lines.length) { lyric('歌詞を入力してね', 60, H - 120, 'left', 0, 56); tex.needsUpdate = true; return; }
    if (K.idx >= K.lines.length) { lyric('♪ おしまい ♪', W / 2 - 160, H - 100, 'left', 1, 64); tex.needsUpdate = true; return; }
    // two rows: the line being sung and the next one; they swap rows as you go (top left, bottom right)
    const rows: [number, number] = [H - 130, H - 40];
    const cur = K.idx % 2, nxt = 1 - cur;
    const place = (row: number) => (row === 0 ? { x: 60, y: rows[0], a: 'left' as const } : { x: W - 60, y: rows[1], a: 'right' as const });
    const pc = place(cur), pn = place(nxt);
    lyric(K.lines[K.idx], pc.x, pc.y, pc.a, K.prog, 60);
    if (K.idx + 1 < K.lines.length) lyric(K.lines[K.idx + 1], pn.x, pn.y, pn.a, 0, 60);
    // line counter, bottom-left of the title
    g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `20px ${FONT}`; g.fillText(`${K.idx + 1} / ${K.lines.length}`, 44, 88);
    tex.needsUpdate = true;
  }

  function update(dt: number) {
    const here = S.zone === 'house' && S.home === 'karaoke';
    // sing key: J (or Space) held down
    S.singing = here && S.pose === 'sing' && !!(keys['j'] || keys[' ']);
    if (!here) return;
    for (const b of G.mirrorBalls) b.rotation.y += dt * 0.6;
    for (const c of G.kCeilings) c.visible = G.camera.position.y < c.userData.y - 0.05;
    if (S.singing && K.idx < K.lines.length) {
      const len = Math.max(2, [...K.lines[K.idx]].length);
      K.prog = Math.min(1, K.prog + dt * K.cps / len);
      if (K.prog >= 1 && (hold += dt) > 0.15) next();   // a finished line hands over almost at once
    } else hold = 0;
    const t = performance.now() / 1000;
    if (t - lastDraw > 1 / 30) { lastDraw = t; draw(t); }
  }
  let hold = 0;
  draw(0);

  G.karaoke = { K, setLyrics, setCps, next, prev, restart, update };
}
