// Photo mode, reels mode, camera framing presets.
import * as THREE from 'three';
import type { Frame, Game, SubStyle } from './types';
import { W, H } from './core';

const CHAR_H = 1.44, FOV = 50;
const CLOSE_MIN = CHAR_H / (1.40 * Math.tan(THREE.MathUtils.degToRad(FOV / 2))); // souka up to 70% of the frame
export const FRAMES: { key: Frame; label: string }[] = [{ key: 'wide', label: '넓게' }, { key: 'close', label: '클로즈업' }];
export const SUB_STYLES: { key: SubStyle; label: string }[] = [{ key: 'dialog', label: '게임 대화창' }, { key: 'movie', label: '영화 자막' }];

export function setupModes(G: Game) {
  const { S, renderer, camera, char, stage } = G;
  const photoPan = new THREE.Vector3();

  const minD = () => S.photo ? CLOSE_MIN * 0.75 : S.frame === 'close' ? CLOSE_MIN : CLOSE_MIN * 1.1;
  const maxD = () => S.reels ? (S.reelCam === 'free' ? 15 : 8) : S.photo ? 20 : 15;
  function setFrame(k: Frame) { S.frame = k; S.camDist = k === 'close' ? 2.7 : 6.0; G.notify(); }
  function setSubStyle(k: SubStyle) { S.subStyle = k; G.notify(); }
  function setSubs(patch: Partial<typeof S.subs>) { Object.assign(S.subs, patch); G.notify(); }
  function toggleGuide() { S.guide = !S.guide; G.notify(); }

  function applyRenderSize() {
    const q = G.QUALITY[S.qualIdx];
    if (S.reels) { renderer.setSize(Math.round(q.w * 4 / 3), q.w, false); camera.aspect = 4 / 3; }
    else if (G.viewAspect && !S.photo) { renderer.setSize(Math.round(q.h * G.viewAspect), q.h, false); camera.aspect = G.viewAspect; }
    else { renderer.setSize(q.w, q.h, false); camera.aspect = W / H; }
    camera.updateProjectionMatrix();
  }

  function togglePhoto() {
    if (S.editMode) return;
    S.photo = !S.photo;
    photoPan.set(0, 0, 0);
    if (S.photo) { S.speedNow = 0; G.setUi({ prompt: '' }); }
    else { G.setExpr('default'); S.guide = false; if (!S.reels) setFrame('wide'); }
    G.fit(); applyRenderSize(); G.notify(); stage.focus();
  }
  function toggleReels() {
    if (S.editMode) return;
    if (S.photo) togglePhoto();
    if (G.isRecording()) G.toggleRec();
    S.reels = !S.reels;
    G.setUi({ prompt: '' });
    if (S.reels) { setFrame('close'); S.camDist = 3.0; S.camYaw = char.rotation.y; } else { setFrame('wide'); S.walkPitch[S.zone] = Math.max(0.04, S.walkPitch[S.zone]); }
    applyRenderSize(); G.fit(); G.notify(); stage.focus();
  }

    /** Window-filling view on/off and the HUD bits; remembered in this browser. */
  function setView(patch: Partial<typeof G.ui>) {
    G.setUi(patch);
    const { big, showClock, showTask, showTalk } = G.ui;
    try { localStorage.setItem('souka-view', JSON.stringify({ big, showClock, showTask, showTalk })); } catch { /* private mode */ }
    if ('big' in patch) { document.body.classList.toggle('big', G.ui.big); G.fit(); }
  }
  function setReelCam(m: 'front' | 'free') {
    S.reelCam = m;
    if (m === 'front') S.camDist = Math.min(S.camDist, 8);
    G.notify();
  }
  Object.assign(G, { setView, setReelCam, photoPan, minD, maxD, setFrame, setSubStyle, setSubs, toggleGuide, applyRenderSize, togglePhoto, toggleReels });
}
