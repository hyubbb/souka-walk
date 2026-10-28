// Edit mode: click furniture / props to select, drag to move, Q/E to rotate, [ ] to resize,
// Delete to put it away in the warehouse. The layout is saved in this browser's localStorage.
import * as THREE from 'three';
import type { EditObj, Game } from './types';
import { HX } from './core';

const LAYOUT_KEY = 'souka-layout-v2';
interface SavedObj { x: number; y?: number; z: number; r: number; s?: number; h?: number; zone?: 'house' | 'alley' }
interface SavedSpawn extends SavedObj { uid: string; id: string; zone: 'house' | 'alley' }
interface Layout { objs: Record<string, SavedObj>; spawned: SavedSpawn[] }

export function setupEdit(G: Game) {
  const { S, scene, camera, canvas, char, editObjs, placeObj, collide, isDesc, keys, toast, stage } = G;
  let selHelper: THREE.BoxHelper | null = null, objDrag: { o: EditObj; dx: number; dz: number } | null = null, resetArmed = 0;
  const edit = { dist: 12, pitch: 1.0, pivot: new THREE.Vector3() };
  const pickRay = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
  const zoneOf = (o: EditObj) => (o.g.parent === G.house ? 'house' : 'alley') as 'house' | 'alley';

  function toggleEdit() {
    if (S.photo || S.reels) return;
    if (!S.editMode && S.riding) { toast('차에서 내린 뒤에 편집할 수 있어요.'); return; }
    if (!S.editMode && S.held) G.interact();   // put down what souka is carrying first
    S.editMode = !S.editMode;
    G.setUi({ prompt: '' });
    if (S.editMode) {
      if (S.seat || S.pose !== 'stand') G.standUp();
      edit.pivot.set(char.position.x, char.position.y + 0.4, char.position.z); edit.dist = 12; edit.pitch = 1.0; S.speedNow = 0;
    } else {
      select(null);
      // if furniture now covers souka, step to the nearest free spot
      if (collide(char.position.x, char.position.z)) {
        outer: for (let r = 0.3; r < 4; r += 0.3) for (let a = 0; a < 6.28; a += 0.4) {
          const x = char.position.x + Math.cos(a) * r, z = char.position.z + Math.sin(a) * r;
          if (!collide(x, z)) { char.position.x = x; char.position.z = z; break outer; }
        }
      }
    }
    G.notify(); stage.focus();
  }
  function select(o: EditObj | null) {
    S.sel = o;
    if (selHelper) { scene.remove(selHelper); selHelper = null; }
    if (o && !o.hidden) { selHelper = new THREE.BoxHelper(o.g, 0xffd400); scene.add(selHelper); }
    G.notify();
  }
  function setNdc(e: PointerEvent) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); pickRay.setFromCamera(ndc, camera); }
  function editRoot(obj: THREE.Object3D | null): EditObj | null { while (obj) { if (obj.userData && obj.userData.edit) return obj.userData.edit; obj = obj.parent; } return null; }
  function pointerDown(e: PointerEvent) {
    setNdc(e);
    const roots = editObjs.filter((o: EditObj) => o.g.visible && !(o.hold && S.held === o.hold)).map((o: EditObj) => o.g);
    const hit = pickRay.intersectObjects(roots, true).find((h) => !G.wallGroups.some((w: THREE.Object3D) => isDesc(h.object, w)));
    const o = hit ? editRoot(hit.object) : null;
    if (o) {
      select(o);
      groundPlane.constant = 0; pickRay.ray.intersectPlane(groundPlane, hitP);
      const wp = new THREE.Vector3(); o.g.getWorldPosition(wp);
      objDrag = { o, dx: wp.x - hitP.x, dz: wp.z - hitP.z };
    } else objDrag = null;
  }
  function pointerMove(e: PointerEvent) {
    if (!S.drag) return;
    if (objDrag) {
      setNdc(e); if (!pickRay.ray.intersectPlane(groundPlane, hitP)) return;
      const o = objDrag.o, wx = hitP.x + objDrag.dx, wz = hitP.z + objDrag.dz;
      if (o.dyn) o.off = (o.g.parent === scene) ? 0 : HX;
      o.g.position.x = wx - o.off; o.g.position.z = wz;
      if (o.hold || o.top) o.g.position.y = G.surfaceY(wx, wz, o.g, 1.5);   // small things ride on tables, shelves, sofas
      else if (S.area === 'city' && o.off === 0 && !o.fixedY) { const gy = G.city.groundAt(wx, wz, o.g.position.y + 3); if (gy !== null) o.g.position.y = gy; }
      placeObj(o); saveSoon(); S.drag = { x: e.clientX, y: e.clientY };
      return;
    }
    const dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y; S.drag = { x: e.clientX, y: e.clientY };
    S.camYaw -= dx * 0.008; edit.pitch = THREE.MathUtils.clamp(edit.pitch + dy * 0.006, 0.1, 1.5);
  }
  function pointerUp() { if (objDrag) G.resetSurfaces(); objDrag = null; }

  const afterChange = () => { if (S.sel) placeObj(S.sel); saveSoon(); G.resetSurfaces(); G.notify(); };
  function rotateSel(deg: number) { const o = S.sel; if (!o) return; o.g.rotation.y += deg * Math.PI / 180; afterChange(); }
  function scaleSel(f: number) {
    const o = S.sel; if (!o) return;
    const s = THREE.MathUtils.clamp(o.g.scale.x * f, 0.3 * (o.baseScale || 1), 4 * (o.baseScale || 1));
    const base = o.baseScale || 1; o.g.scale.setScalar(Math.abs(s - base) < 0.04 * base ? base : s); afterChange();
  }
  function putAwaySel() { if (S.sel) G.props.putAway(S.sel); }
  function resetObj(o: EditObj) {
    if (o.hold && S.held === o.hold) return;
    const home = o.hold || o.off === HX ? G.house : scene;
    if (o.g.parent !== home && !o.spawned) { o.g.parent?.remove(o.g); home.add(o.g); o.off = home === G.house ? HX : 0; }
    o.g.position.set(o.init.x, o.init.y || 0, o.init.z); o.g.rotation.set(0, o.init.r, 0); o.g.scale.setScalar(o.baseScale || 1); o.hidden = false; placeObj(o);
  }
  function resetSel() { if (S.sel && !S.sel.spawned) { resetObj(S.sel); select(S.sel); saveSoon(); G.resetSurfaces(); G.props.settle(); } }
  function resetAll() {
    if (Date.now() - resetArmed > 4000) { resetArmed = Date.now(); G.setUi({ resetConfirm: true }); setTimeout(() => G.setUi({ resetConfirm: false }), 4000); return; }
    resetArmed = 0; G.setUi({ resetConfirm: false });
    for (const o of [...editObjs] as EditObj[]) { if (o.spawned) G.props.putAway(o); else resetObj(o); }
    select(null); saveLayout(); G.resetSurfaces(); G.props.settle(); toast('처음 배치로 돌렸어요.');
  }
  function onKey(e: KeyboardEvent, k: string) {
    if (k === 'b' || k === 'escape') { if (k === 'escape' && S.sel) select(null); else toggleEdit(); return; }
    if (k === 'q') rotateSel(e.shiftKey ? 90 : 15);
    if (k === 'e') rotateSel(e.shiftKey ? -90 : -15);
    if (k === '[' || k === '-') scaleSel(1 / 1.15);
    if (k === ']' || k === '=') scaleSel(1.15);
    if (k === 'delete' || k === 'backspace') { e.preventDefault(); putAwaySel(); }
  }
  function update(dt: number) {
    const ix = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0), iz = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
    const sp = dt * (2 + edit.dist * 0.6), sn = Math.sin(S.camYaw), cs = Math.cos(S.camYaw);
    edit.pivot.x += (ix * cs + iz * sn) * sp; edit.pivot.z += (-ix * sn + iz * cs) * sp;
    if (selHelper) selHelper.update();
  }

  // ---- saving: moved house objects by name, warehouse items as a list ----
  let saveT: any = 0;
  function saveSoon() { clearTimeout(saveT); saveT = setTimeout(saveLayout, 300); }
  const pack = (o: EditObj): SavedObj => ({ x: +o.g.position.x.toFixed(3), y: +o.g.position.y.toFixed(3), z: +o.g.position.z.toFixed(3), r: +o.g.rotation.y.toFixed(4), s: +o.g.scale.x.toFixed(3), zone: zoneOf(o) });
  function saveLayout() {
    const data: Layout = { objs: {}, spawned: [] };
    for (const o of editObjs as EditObj[]) {
      if (o.spawned) { if (o.item && o.uid) data.spawned.push({ ...pack(o), uid: o.uid, id: o.item.id, zone: zoneOf(o) }); continue; }
      if (!o.persist) continue;
      const moved = Math.abs(o.g.position.x - o.init.x) > 1e-3 || Math.abs(o.g.position.z - o.init.z) > 1e-3 || Math.abs(o.g.rotation.y - o.init.r) > 1e-3 || Math.abs(o.g.scale.x - (o.baseScale || 1)) > 1e-3 || o.hidden || zoneOf(o) !== (o.off === HX ? 'house' : 'alley');
      if (moved) data.objs[o.name] = { ...pack(o), h: o.hidden ? 1 : 0 };
    }
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
  }
  function loadLayout() {
    let data: Layout | null = null;
    try { data = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null'); } catch { data = null; }
    if (!data) return;
    for (const o of editObjs as EditObj[]) {
      const d = data.objs?.[o.name]; if (!d || !o.persist) continue;
      if (d.zone && d.zone !== zoneOf(o)) { o.g.parent?.remove(o.g); (d.zone === 'house' ? G.house : scene).add(o.g); o.off = d.zone === 'house' ? HX : 0; }
      o.g.position.set(d.x, o.fixedY || d.y === undefined ? o.g.position.y : d.y, d.z); if (d.y !== undefined) o.keepY = true; o.g.rotation.y = d.r; o.g.scale.setScalar(d.s || o.baseScale || 1); o.hidden = !!d.h;
      placeObj(o);
    }
    for (const sp of data.spawned || []) {
      const o = G.props.spawn(sp.id, { x: sp.x + (sp.zone === 'house' ? HX : 0), z: sp.z, y: sp.y, r: sp.r, s: sp.s, zone: sp.zone, uid: sp.uid, spawned: true });
      if (o) o.keepY = true;   // keep the height it was saved at (it may be sitting on a table)
    }
    G.resetSurfaces();
  }

  G.edit = Object.assign(edit, { toggle: toggleEdit, select, saveSoon, pointerDown, pointerMove, pointerUp, onKey, update, rotateSel, scaleSel, putAwaySel, resetSel, resetAll, loadLayout });
}
