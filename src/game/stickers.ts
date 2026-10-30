// Text and picture stickers: type some words (or load a picture), then stick them on a wall, a shop window,
// the floor… (edit mode).
// Each sticker is a flat plane with the words drawn on a canvas. Dragging it slides it over whatever surface is
// under the pointer and turns it to face out of that surface; Q/E spins it, [ ] scales it.
import * as THREE from 'three';
import type { EditObj, Game } from './types';
import { HX } from './core';

export interface StickerData {
  text: string;
  color: string;
  /** none = just the letters (with a thin outline), plate = a sign board behind them, neon = glowing letters */
  style: 'none' | 'plate' | 'neon';
  font: 'gothic' | 'dot' | 'serif';
  vertical: boolean;
  /** A picture instead of words: a data: URL, already shrunk to at most 512 px so it fits in the saved layout. */
  image?: string;
}
export const STICKER_COLORS = ['#ffffff', '#1d1d1f', '#d8342c', '#f2c230', '#2f6fc4', '#ff4fa3', '#47c46a'];
const FONTS: Record<StickerData['font'], string> = {
  gothic: '"Noto Sans KR", "Hiragino Sans", "Apple SD Gothic Neo", sans-serif',
  dot: '"DotGothic16", monospace',
  serif: '"Noto Serif KR", "Hiragino Mincho ProN", serif',
};
const LINE_H = 0.32;   // metres per line of text at scale 1

function drawSticker(d: StickerData) {
  const px = 96, pad = d.style === 'none' ? 14 : 34;
  const lines = (d.text || ' ').split('\n').slice(0, 6);
  const c = document.createElement('canvas'), g = c.getContext('2d')!;
  const font = `bold ${px}px ${FONTS[d.font]}`;
  g.font = font;
  let w: number, h: number;
  if (d.vertical) {
    const cols = lines.map((l) => [...l]);
    const rows = Math.max(1, ...cols.map((l) => l.length));
    w = cols.length * px * 1.15 + pad * 2; h = rows * px * 1.08 + pad * 2;
  } else {
    w = Math.max(1, ...lines.map((l) => g.measureText(l).width)) + pad * 2; h = lines.length * px * 1.2 + pad * 2;
  }
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (d.style === 'plate') {
    const dark = ['#ffffff', '#f2c230'].includes(d.color);
    g.fillStyle = dark ? '#26272a' : '#f4f1e8'; g.beginPath(); (g as any).roundRect ? (g as any).roundRect(4, 4, c.width - 8, c.height - 8, 18) : g.rect(4, 4, c.width - 8, c.height - 8); g.fill();
    g.lineWidth = 6; g.strokeStyle = dark ? '#4a4c50' : '#c9c3b2'; g.stroke();
  }
  const put = (s: string, x: number, y: number) => {
    if (d.style === 'none') { g.lineWidth = 10; g.strokeStyle = ['#1d1d1f', '#2f6fc4', '#d8342c'].includes(d.color) ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.55)'; g.lineJoin = 'round'; g.strokeText(s, x, y); }
    if (d.style === 'neon') { g.shadowColor = d.color; g.shadowBlur = 28; }
    g.fillStyle = d.color; g.fillText(s, x, y); g.shadowBlur = 0;
  };
  if (d.vertical) {
    // columns run right to left, like Japanese signs
    lines.forEach((l, ci) => [...l].forEach((ch, ri) => put(ch, c.width - pad - px * 0.575 - ci * px * 1.15, pad + px * 0.54 + ri * px * 1.08)));
  } else {
    lines.forEach((l, i) => put(l, c.width / 2, pad + px * 0.6 + i * px * 1.2));
  }
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const rows = d.vertical ? Math.max(1, ...lines.map((l) => [...l].length)) : lines.length;
  const hM = LINE_H * rows * (c.height / (rows * px * (d.vertical ? 1.08 : 1.2)));
  return { tex, w: hM * c.width / c.height, h: hM };
}

export function setupStickers(G: Game) {
  const { S, scene, editObjs, camera } = G;
  let uidSeq = Date.now() % 100000;

  function build(o: EditObj, d: StickerData) {
    const old = o.g.children.find((c: any) => c.userData.sticker) as THREE.Mesh | undefined;
    if (old) { o.g.remove(old); (old.material as any).map?.dispose(); (old.material as any).dispose(); old.geometry.dispose(); }
    if (d.image) {
      // a picture: the plane takes the picture's shape once it has loaded (0.8 m on its long side)
      const img = new Image(), tex = new THREE.Texture(img); tex.anisotropy = 4;
      const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.02, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), mat); m.userData.sticker = true; m.renderOrder = 2;
      img.onload = () => {
        const a = img.width / img.height, w = a >= 1 ? 0.8 : 0.8 * a, h = a >= 1 ? 0.8 / a : 0.8;
        m.geometry.dispose(); m.geometry = new THREE.PlaneGeometry(w, h); o.size = { w, d: 0.02, h };
        tex.needsUpdate = true; G.resetSurfaces?.();
      };
      img.src = d.image;
      o.g.add(m); o.sticker = { ...d }; o.size = { w: 0.8, d: 0.02, h: 0.8 }; o.label = '사진';
      return;
    }
    const { tex, w, h } = drawSticker(d);
    const mat = d.style === 'neon'
      ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide })
      : new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.userData.sticker = true; m.renderOrder = 2;
    o.g.add(m); o.sticker = { ...d }; o.size = { w, d: 0.02, h };
  }

  /** Make a sticker. Without a position it appears in front of the camera, upright, facing you. */
  function spawn(d: StickerData, at?: { pos: [number, number, number]; q: [number, number, number, number]; s?: number; zone: 'house' | 'alley'; uid?: string }) {
    const zone = at?.zone || S.zone, parent = zone === 'house' ? G.house : scene, off = zone === 'house' ? HX : 0;
    const g = new THREE.Group(); parent.add(g);
    const o: EditObj = {
      name: `${d.image ? '사진' : '글씨'} ${(at?.uid || '').slice(-3) || editObjs.length}`, label: d.image ? '사진' : '글씨', g, cols: [], off,
      init: { x: 0, z: 0, r: 0 }, hidden: false, persist: false, spawned: true, uid: at?.uid || 's' + (uidSeq++).toString(36),
      item: { id: '__sticker', file: '', name: '글씨', cat: 'small', col: false }, fixedY: true, keepY: true,
    } as EditObj;
    g.userData.edit = o; editObjs.push(o);
    build(o, d);
    if (at) {
      g.position.set(at.pos[0] - off, at.pos[1], at.pos[2]); g.quaternion.set(...at.q); g.scale.setScalar(at.s || 1);
    } else {
      // in front of the edit camera's target (or souka), facing the camera
      const base = S.editMode ? G.edit.pivot.clone() : G.char.position.clone();
      const toCam = new THREE.Vector3().subVectors(camera.position, base).setY(0).normalize();
      const p = base.clone().addScaledVector(toCam, 0.6).setY(Math.max(base.y, 0) + 1.1);
      g.position.set(p.x - off, p.y, p.z); g.lookAt(p.clone().add(toCam));
    }
    o.init = { x: g.position.x, y: g.position.y, z: g.position.z, r: 0 };
    return o;
  }

  /** While dragging: put the sticker on the surface under the pointer, facing out of it. */
  const ray = new THREE.Raycaster();
  function stickTo(o: EditObj, pickRay: THREE.Raycaster) {
    ray.ray.copy(pickRay.ray); ray.far = 200;
    const skip = (obj: THREE.Object3D) => { for (let p: THREE.Object3D | null = obj; p; p = p.parent) { if (p === o.g || p === G.char || !p.visible) return true; } return false; };
    const hits = ray.intersectObjects(scene.children, true).filter((h: any) => h.object.isMesh && h.face && !skip(h.object) && !(h.object.material && h.object.material.visible === false));
    const h = hits[0]; if (!h) return false;
    const n = h.face!.normal.clone().transformDirection(h.object.matrixWorld).normalize();
    if (n.dot(ray.ray.direction) > 0) n.negate();   // back faces of double-sided things
    const p = h.point.clone().addScaledVector(n, 0.012);
    const parentOff = o.g.parent === G.house ? HX : 0;
    o.g.position.set(p.x - parentOff, p.y, p.z);
    const spin = o.stickerSpin || 0;
    o.g.up.set(0, 1, 0); if (Math.abs(n.y) > 0.95) o.g.up.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), S.camYaw);
    o.g.lookAt(p.clone().add(n)); o.g.rotateZ(spin);
    return true;
  }
  function spinSel(o: EditObj, deg: number) { const r = deg * Math.PI / 180; o.stickerSpin = (o.stickerSpin || 0) + r; o.g.rotateZ(r); }
  function restyle(o: EditObj, d: StickerData) { build(o, d); G.edit.saveSoon(); G.notify(); }

  /** Shrink a picture file to at most 512 px and return it as a data: URL (PNG keeps transparency). */
  function readImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 512 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        const png = c.toDataURL('image/png');
        resolve(png.length < 400_000 || file.type === 'image/png' && png.length < 900_000 ? png : c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  G.stickers = { spawn, stickTo, spinSel, restyle, readImage };
}
