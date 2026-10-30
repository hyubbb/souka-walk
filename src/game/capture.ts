// Photos (4:5, 1080x1350), reels (9:16 with a 4:3 game screen, recorded with MediaRecorder),
// subtitles drawn into both, and saving files.
import type { Game } from './types';

const SUB_FONT = '"Noto Sans JP","Noto Sans KR","Nanum Gothic Coding",sans-serif';
const GAME_H = 810, GAME_Y = Math.round((1920 - GAME_H) / 2) - 90;

export function setupCapture(G: Game) {
  const { S, renderer, scene, camera, canvas, stage, toast } = G;

  function outlined(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, maxW: number) {
    if (!text) return;
    g.font = `700 ${size}px ${SUB_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = size * 0.16; g.strokeStyle = '#000'; g.strokeText(text, x, y, maxW); g.fillStyle = color; g.fillText(text, x, y, maxW);
  }
  function dialogBox(g: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number, text: string, size: number) {
    g.fillStyle = 'rgba(11,12,24,.85)'; g.fillRect(bx, by, bw, bh);
    g.strokeStyle = '#0b0c18'; g.lineWidth = 6; g.strokeRect(bx - 6, by - 6, bw + 12, bh + 12);
    g.strokeStyle = '#f4f2ea'; g.lineWidth = 9; g.strokeRect(bx, by, bw, bh);
    g.fillStyle = '#f4f2ea'; g.font = `${size}px "DotGothic16","Nanum Gothic Coding",monospace`; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText(text, bx + 44, by + 42, bw - 88);
  }
  const subs = () => ({ d: S.subs.dialog.trim(), j: S.subs.jp.trim(), k: S.subs.kr.trim() });
  function drawSubsPhoto(g: CanvasRenderingContext2D) {
    const { d, j, k } = subs();
    if (S.subStyle === 'dialog') { if (d) dialogBox(g, 54, 1350 - 67 - 256, 972, 256, d, 52); return; }
    outlined(g, j, 540, 1350 - 225, 66, '#ffe14a', 1000);
    outlined(g, k, 540, 1350 - 135, 56, '#ffffff', 1000);
  }
  function drawSubsReels(g: CanvasRenderingContext2D, top: number) {
    const { d, j, k } = subs();
    if (S.subStyle === 'dialog') { if (d) dialogBox(g, 54, top + 50, 972, 230, d, 50); return; }
    outlined(g, j, 540, top + 110, 70, '#ffe14a', 1010);
    outlined(g, k, 540, top + 200, 58, '#ffffff', 1010);
  }

  // --- photo ---
  function shoot() {
    renderer.render(scene, camera);
    const out = document.createElement('canvas'); out.width = 1080; out.height = 1350;
    const g = out.getContext('2d')!; g.imageSmoothingEnabled = G.QUALITY[S.qualIdx].linear; g.imageSmoothingQuality = 'high';
    g.drawImage(canvas, 0, 0, 1080, 1350);
    drawSubsPhoto(g);
    const url = out.toDataURL('image/png');
    G.setUi({ album: [url, ...G.ui.album].slice(0, 24), shotUrl: url });
  }

  // --- reels compositor + recorder ---
  const comp = document.createElement('canvas'); comp.width = 1080; comp.height = 1920; comp.className = 'comp'; stage.prepend(comp);
  const cg = comp.getContext('2d')!;
  let recorder: MediaRecorder | null = null, recChunks: Blob[] = [], recStart = 0, lastVideo: { blob: Blob; name: string } | null = null;
  function drawComp() {
    cg.fillStyle = '#000'; cg.fillRect(0, 0, 1080, 1920);
    cg.imageSmoothingEnabled = true; cg.imageSmoothingQuality = 'high';
    cg.drawImage(canvas, 0, GAME_Y, 1080, GAME_H);
    drawSubsReels(cg, GAME_Y + GAME_H);
    if (recorder) { const sec = Math.floor((performance.now() - recStart) / 1000); G.setUi({ rec: `● REC ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` }); }
  }
  function toggleRec() {
    if (!S.reels) return;
    if (recorder) { recorder.stop(); return; }
    if (!(comp as any).captureStream || !(window as any).MediaRecorder) { toast('이 브라우저에서는 녹화가 안 돼요.'); return; }
    const types = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    const mime = types.find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } });
    if (!mime) { toast('지원하는 영상 형식이 없어요.'); return; }
    let stream: MediaStream;
    try { stream = (comp as any).captureStream(30); } catch { toast('녹화를 시작할 수 없어요.'); return; }
    try { recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10000000 }); } catch { toast('녹화를 시작할 수 없어요.'); return; }
    recChunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
    recorder.onstop = () => {
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(recChunks, { type: mime.split(';')[0] }); const url = URL.createObjectURL(blob);
      lastVideo = { blob, name: 'souka-reels.' + ext };
      recorder = null; S.recording = false;
      G.setUi({ rec: '', video: { url, note: '녹화한 릴스(1080×1920 ' + ext + ')예요.' + (ext === 'webm' ? ' webm 파일은 인스타 업로드 전에 mp4로 바꿔야 할 수 있어요.' : '') } });
    };
    recorder.start(250); recStart = performance.now(); S.recording = true; G.setUi({ rec: '● REC 0:00' });
  }
  const isRecording = () => !!recorder;

  // --- saving: the claude.ai artifact viewer's downloads capability, or a plain download elsewhere ---
  let dlCap: any = null;
  (async () => { try { const c = (window as any).claude; if (c && c.use) dlCap = await c.use('downloads'); } catch { dlCap = null; } })();
  function dataURLtoBlob(u: string) { const [h, b] = u.split(','); const bin = atob(b); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: h.slice(5, h.indexOf(';')) }); }
  async function saveFile(blob: Blob, filename: string) {
    if (dlCap) {
      try { await dlCap.save({ filename, data: blob }); toast('저장했어요.'); }
      catch (e: any) { if (!e || e.code !== 'declined') toast('여기서는 저장할 수 없어요. 우클릭으로 저장해 주세요.'); }
      return;
    }
    if ((window as any).claude) { toast('우클릭해서 저장해 주세요.'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  }
  const saveShot = () => { const u = G.ui.shotUrl; if (u) saveFile(dataURLtoBlob(u), 'souka-' + Date.now() + '.png'); };
  const saveVideo = () => { if (lastVideo) saveFile(lastVideo.blob, lastVideo.name); };

  /** Size the visible canvas (4:5 game or 9:16 reels) to the window. */
  function fit() {
    const panelBeside = window.innerWidth >= 760;
    const availW = (panelBeside ? window.innerWidth - 320 - 20 : window.innerWidth) - 32;
    const availH = (panelBeside ? window.innerHeight : window.innerHeight * 0.8) - 32;
    const ratio = S.reels ? 16 / 9 : 1.25;
    const ch = Math.max(250, Math.min(availH, availW * ratio));
    const cw = ch / ratio;
    const el = S.reels ? comp : canvas;
    el.style.width = cw + 'px'; el.style.height = ch + 'px';
    canvas.style.display = S.reels ? 'none' : 'block';
    comp.style.display = S.reels ? 'block' : 'none';
    stage.style.setProperty('--fs', Math.max(12, ch * 0.045) + 'px');
    stage.style.setProperty('--fs-subs', Math.max(12, ch * 0.048) + 'px');
  }
  window.addEventListener('resize', fit);

  Object.assign(G, { saveFile, comp, shoot, drawComp, toggleRec, isRecording, saveShot, saveVideo, fit });
}
