import * as THREE from 'three';
import type { Collider, EditObj, Game, State, UiState } from './types';

/** Internal 4:5 resolution before the quality presets resize it (x3 = 1080x1350). */
export const W = 360, H = 450;
/** The house is built far away from the alley; this is its x offset in world space. */
export const HX = 100;

export function createCore(stage: HTMLElement): Game {
  const S: State = {
    zone: 'house', area: 'alley', size: 1, pose: 'stand', expr: 'default', mouth: 'line',
    acc: { blush: false, hat: false, phones: false },
    photo: false, reels: false, reelCam: 'front', editMode: false, guide: false,
    seat: null, seatY: 0, held: null, riding: null, reach: 0.75,
    camYaw: 0.75, camPitch: 0.75, camDist: 6.4, walkPitch: { house: 0.75, alley: 0.32 }, frame: 'wide',
    walkPhase: 0, speedNow: 0, blinkT: 2.5, idleT: 0,
    timeIdx: 0, qualIdx: 2, clockBase: '08:12', taskDone: false,
    subStyle: 'dialog', subs: { dialog: '', jp: '', kr: '' },
    drag: null, sel: null, recording: false,
  };
  const ui: UiState = {
    clock: '10/28 (水) 08:12', room: '1. BEDROOM 침실', task: '할 일: 현관에서 출근하기',
    prompt: '', toast: '', fading: false, rec: '', album: [], shotUrl: null, video: null, resetConfirm: false,
  };

  // --- tiny store so React re-renders when the game changes something it shows ---
  const listeners = new Set<() => void>();
  let ver = 0;
  const notify = () => { ver++; listeners.forEach((l) => l()); };
  const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
  /** Update UI fields; only notifies when something actually changed. */
  const setUi = (patch: Partial<UiState>) => {
    let changed = false;
    for (const k in patch) if ((ui as any)[k] !== (patch as any)[k]) { (ui as any)[k] = (patch as any)[k]; changed = true; }
    if (changed) notify();
  };
  let toastTimer: any = 0;
  const toast = (msg: string) => { setUi({ toast: msg }); clearTimeout(toastTimer); toastTimer = setTimeout(() => setUi({ toast: '' }), 2200); };

  // --- renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  const canvas = renderer.domElement;
  canvas.classList.add('game');
  stage.prepend(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);

  // seeded random so the street is the same every load (call order matters!)
  let seed = 20261028;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d')!; g.imageSmoothingEnabled = false; draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  function speckle(g: CanvasRenderingContext2D, w: number, h: number, base: string, amt: number, density = 0.5) {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h * density; i++) {
      const v = (rnd() - 0.5) * amt;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      g.fillRect(rnd() * w | 0, rnd() * h | 0, 1, 1);
    }
  }
  const lam = (o: THREE.MeshLambertMaterialParameters) => new THREE.MeshLambertMaterial(o);

  // --- collision + editable-object registry ---
  const colliders: Collider[] = [];
  const dynCols: Collider[] = [];      // parked vehicles, refreshed every frame
  const addCol = (cx: number, cz: number, w: number, d: number) => { colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 }); };
  const occluders: THREE.Object3D[] = []; // big meshes the camera must not hide behind
  const editObjs: EditObj[] = [];
  let cur: any = null;
  /** Everything added to `parent` between O() and E() becomes one movable group in edit mode. */
  function O(name: string, parent: THREE.Object3D, off = 0) { cur = { name, parent, off, kids: parent.children.length, cols: colliders.length }; }
  function E(): EditObj | null {
    const c = cur; cur = null; if (!c) return null;
    const parent: THREE.Object3D = c.parent, off: number = c.off;
    const kids = parent.children.slice(c.kids); if (!kids.length) return null;
    parent.updateMatrixWorld(true);
    const box = new THREE.Box3(); kids.forEach((k) => box.expandByObject(k));
    const cx = (box.min.x + box.max.x) / 2 - off, cz = (box.min.z + box.max.z) / 2;
    const g = new THREE.Group();
    for (const k of kids) { parent.remove(k); k.position.x -= cx; k.position.z -= cz; g.add(k); }
    g.position.set(cx, 0, cz); parent.add(g);
    const cols = colliders.slice(c.cols).map((col) => ({ col, lx: (col.minX + col.maxX) / 2 - off - cx, lz: (col.minZ + col.maxZ) / 2 - cz, hw: (col.maxX - col.minX) / 2, hd: (col.maxZ - col.minZ) / 2 }));
    let name = c.name, n = 2; while (editObjs.some((o) => o.name === name)) name = c.name + ' ' + n++;
    const o: EditObj = { name, label: c.name, g, cols, off, init: { x: cx, z: cz, r: 0 }, hidden: false, persist: true };
    editObjs.push(o); g.userData.edit = o; return o;
  }
  /** Re-apply an edit object's colliders after it moved / rotated / was hidden. */
  function placeObj(o: EditObj) {
    if (o.dyn) o.off = (o.g.parent === scene) ? 0 : HX;
    const r = o.g.rotation.y, cs = Math.cos(r), sn = Math.sin(r), sc = o.g.scale.x;
    for (const k of o.cols) {
      if (o.hidden) { k.col.minX = k.col.maxX = k.col.minZ = k.col.maxZ = 1e9; continue; }
      const lx = k.lx * sc, lz = k.lz * sc, hw = k.hw * sc, hd = k.hd * sc;
      const wx = o.off + o.g.position.x + lx * cs + lz * sn, wz = o.g.position.z - lx * sn + lz * cs;
      const hx = Math.abs(cs) * hw + Math.abs(sn) * hd, hz = Math.abs(sn) * hw + Math.abs(cs) * hd;
      k.col.minX = wx - hx; k.col.maxX = wx + hx; k.col.minZ = wz - hz; k.col.maxZ = wz + hz;
    }
    o.g.visible = !o.hidden;
  }
  function collide(x: number, z: number) {
    const r = 0.24;
    for (const list of [colliders, dynCols]) for (const c of list) if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true;
    return false;
  }
  const isDesc = (o: THREE.Object3D | null, root: THREE.Object3D) => { while (o) { if (o === root) return true; o = o.parent; } return false; };

  const keys: Record<string, boolean> = {};
  /** Walkable rectangle of each outdoor place (the city map has none: its ground decides). */
  const areaBounds: Record<string, { x0: number; x1: number; z0: number; z1: number }> = { alley: { x0: -21, x1: 21, z0: -52.5, z1: 13.5 } };
  const outBounds = () => areaBounds[S.area] || null;
  const inOutBounds = (x: number, z: number, pad = 0) => { const b = outBounds(); return !b || (x >= b.x0 - pad && x <= b.x1 + pad && z >= b.z0 - pad && z <= b.z1 + pad); };

  return {
    S, ui, notify, subscribe, version: () => ver, setUi, toast,
    stage, renderer, canvas, scene, camera, rnd, canvasTex, speckle, lam,
    colliders, dynCols, addCol, occluders, editObjs, O, E, placeObj, collide, isDesc, keys, areaBounds, outBounds, inOutBounds,
    HX,
  };
}
