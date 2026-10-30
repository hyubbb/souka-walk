// Keyboard, mouse drag and wheel. Typing in a text field never moves souka.
import * as THREE from 'three';
import type { Game } from './types';
import { EXPR, POSES } from './character';
import { TIMES } from './lighting';

export function setupInput(G: Game) {
  const { S, keys, canvas, stage } = G;
  const isTyping = (e: Event) => { const t = e.target as HTMLElement; return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'); };

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTyping(e)) { if (e.key === 'Escape' || e.key === 'Enter') (e.target as HTMLElement).blur(); return; }
    if ((e.target as HTMLElement)?.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return; // let buttons click
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    keys[k] = true;
    if (S.editMode) { G.edit.onKey(e, k); return; }
    if ((k === 'p' && !S.reels) || (k === 'escape' && S.photo)) G.togglePhoto();
    if ((k === 'r' && !S.photo) || (k === 'escape' && S.reels)) G.toggleReels();
    if (k === 'v' && S.reels) G.toggleRec();
    if (k === 'f' && S.reels) G.setReelCam(S.reelCam === 'front' ? 'free' : 'front');
    if (k === 'b' && !S.photo && !S.reels) { G.edit.toggle(); return; }
    if (!S.photo && S.held && k === 'z') S.reach = Math.max(0.45, S.reach - 0.15);
    if (!S.photo && S.held && k === 'x') S.reach = Math.min(1.6, S.reach + 0.15);
    if (!S.photo && k === 'c') G.interact();
    if (!S.photo && k === 'l' && S.riding) { G.setLights(S.riding, !S.riding.lights); G.toast(S.riding.lights ? '라이트 ON' : '라이트 OFF'); }
    if (S.photo) {
      if (k >= '1' && k <= String(EXPR.length)) G.setExpr(EXPR[+k - 1].key);
      if (k === 'f') G.setPose(POSES[(POSES.findIndex((p) => p.key === S.pose) + 1) % POSES.length].key);
      if (k === 't') G.applyTime((S.timeIdx + 1) % TIMES.length);
      if (k === 'g') G.toggleGuide();
      if (k === ' ' || k === 'enter') G.shoot();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
  const onBlur = () => { for (const k in keys) keys[k] = false; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  // two fingers on the screen: pinch to zoom (like the mouse wheel)
  const touches = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  const pinchDist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const zoom = (d: number) => {
    if (S.editMode) G.edit.dist = THREE.MathUtils.clamp(G.edit.dist + d * 2.4 * Math.max(1, G.edit.dist / 20), 2, G.edit.MAX);
    else S.camDist = THREE.MathUtils.clamp(S.camDist + d, G.minD(), G.maxD());
  };
  // In reels mode the 9:16 compositor canvas sits on top of the game canvas, so listen on both.
  const surf = { addEventListener: (t: string, f: any) => { canvas.addEventListener(t, f); compCanvas()?.addEventListener(t, f); } };
  const compCanvas = () => stage.querySelector('canvas.comp') as HTMLCanvasElement | null;
  surf.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) { pinch = pinchDist(); S.drag = null; if (S.editMode) G.edit.pointerUp(); return; }
      if (touches.size > 2) return;
    }
    stage.focus(); S.drag = { x: e.clientX, y: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (S.editMode) G.edit.pointerDown(e);
  });
  const touchEnd = (e: PointerEvent) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = 0; };
  surf.addEventListener('pointerup', touchEnd);
  surf.addEventListener('pointercancel', touchEnd);
  surf.addEventListener('pointermove', (e: PointerEvent) => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) { const d = pinchDist(); zoom((pinch - d) * 0.02); pinch = d; return; }
    if (S.editMode) { G.edit.pointerMove(e); return; }
    if (!S.drag) return;
    const dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y; S.drag = { x: e.clientX, y: e.clientY };
    S.camYaw -= dx * 0.008;
    if (S.photo) S.camPitch = THREE.MathUtils.clamp(S.camPitch + dy * 0.006, -0.25, 1.45);
    else if (!S.reels || S.reelCam === 'free') S.walkPitch[S.zone] = THREE.MathUtils.clamp(S.walkPitch[S.zone] + dy * 0.006, S.reels ? -0.2 : 0.04, 1.45);
  });
  surf.addEventListener('pointerup', () => { S.drag = null; if (S.editMode) G.edit.pointerUp(); });
  surf.addEventListener('pointercancel', () => { S.drag = null; });
  stage.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    if (S.editMode) { G.edit.dist = THREE.MathUtils.clamp(G.edit.dist + e.deltaY * 0.012 * Math.max(1, G.edit.dist / 20), 2, G.edit.MAX); return; }
    S.camDist = THREE.MathUtils.clamp(S.camDist + e.deltaY * 0.005, G.minD(), G.maxD());
  }, { passive: false });

  G.disposeInput = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
}
