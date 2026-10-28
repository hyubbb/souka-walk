// Things souka can do with the C key: sit, lie down, stand on the scale, carry big props, open doors.
import * as THREE from 'three';
import type { EditObj, Game, Holdable, Spot } from './types';
import { HX } from './core';

const L = (x: number, z: number): [number, number] => [HX + x, z];
export const MAX_REACH_Y = 1.35;

export function setupInteract(G: Game) {
  const { S, scene, editObjs, char, body, isDesc, toast } = G;

  const SPOTS: Spot[] = [
    { zone: 'alley', obj: '벤치', at: [2.3, -30], label: '벤치에 앉기', seat: { y: 0.43, rot: -Math.PI / 2, pose: 'sit', exit: [1.5, -30] } },
    { zone: 'alley', at: [0, 13.1], label: '집에 들어가기', act: () => goZone('house') },
    { zone: 'house', at: L(13.2, 13.7), label: '출근하기', act: () => goZone('alley') },
    { zone: 'house', obj: '체중계', at: L(10.0, 12.85), r: 0.8, label: '체중계에 올라가기', seat: { y: 0.09, rot: Math.PI, pose: 'stand', msg: '……3.2kg' } },
  ];
  // spots follow their furniture when it is moved in edit mode: store them relative to the object
  for (const sp of SPOTS) {
    if (!sp.obj) continue;
    const o = editObjs.find((e: EditObj) => e.name === sp.obj); if (!o) continue;
    const ox = o.off + o.init.x, oz = o.init.z;
    sp.o = o; sp.l = [sp.at[0] - ox, sp.at[1] - oz];
    if (sp.seat) { sp.seat = { ...sp.seat, rl: sp.seat.rot }; if (sp.seat.exit) sp.seat.el = [sp.seat.exit[0] - ox, sp.seat.exit[1] - oz]; }
  }
  function resolveSpot(sp: Spot) {
    if (!sp.o) return;
    const o = sp.o, r = o.g.rotation.y, cs = Math.cos(r), sn = Math.sin(r), bx = o.off + o.g.position.x, bz = o.g.position.z, sc = o.g.scale.x;
    const tr = (l: [number, number]): [number, number] => [bx + (l[0] * cs + l[1] * sn) * sc, bz + (-l[0] * sn + l[1] * cs) * sc];
    sp.at = tr(sp.l!);
    if (sp.seat) { sp.seat.rot = sp.seat.rl! + r; if (sp.seat.el) sp.seat.exit = tr(sp.seat.el); }
  }
  // big props are editable too (not saved: they move whenever souka carries them)
  for (const h of G.holdables as Holdable[]) {
    const o: EditObj = { name: h.name, label: h.name, g: h.obj, cols: [], off: HX, dyn: true, init: { x: h.obj.position.x, y: h.obj.position.y, z: h.obj.position.z, r: h.obj.rotation.y }, hidden: false, persist: false, hold: h };
    h.obj.userData.edit = o; editObjs.push(o);
  }

  const tmpHP = new THREE.Vector3();
  function nearestSpot(): any {
    let best: any = null, bd = 1e9;
    for (const sp of SPOTS) {
      if (sp.zone !== S.zone) continue; resolveSpot(sp); if (sp.o && sp.o.hidden) continue;
      const d = Math.hypot(char.position.x - sp.at[0], char.position.z - sp.at[1]);
      if (d < (sp.r || 1.2) * (sp.o ? Math.max(1, sp.o.g.scale.x) : 1) && d < bd) { bd = d; best = sp; }
    }
    if (!S.held) for (const h of G.holdables as Holdable[]) {
      h.obj.getWorldPosition(tmpHP); const d = Math.hypot(char.position.x - tmpHP.x, char.position.z - tmpHP.z);
      if (d < 1.0 && d < bd + 0.2) { bd = d; best = { label: h.name + ' 들기', hold: h }; }
    }
    if (S.zone === 'alley' && G.vehicles) for (const v of G.vehicles) {
      const d = Math.hypot(char.position.x - v.g.position.x, char.position.z - v.g.position.z);
      if (d < v.grab && d < bd + 0.3) { bd = d; best = { label: v.type === 'car' ? '차에 타기' : '자전거 타기', veh: v }; }
    }
    return best;
  }
  function standUp() {
    if (S.seat && S.seat.exit) char.position.set(S.seat.exit[0], 0, S.seat.exit[1]);
    S.seat = null; S.seatY = 0; G.setPose('stand');
  }

  // --- carrying props and putting them on whatever surface is in front ---
  const downRay = new THREE.Raycaster(), DOWN = new THREE.Vector3(0, -1, 0);
  let surfaceList: THREE.Object3D[] | null = null;
  const resetSurfaces = () => { surfaceList = null; };
  function surfaces() {
    if (!surfaceList) {
      surfaceList = [];
      scene.traverse((o: any) => {
        if (!o.isMesh || !o.material || o.material.transparent) return;
        if (G.wallGroups.some((w: THREE.Object3D) => isDesc(o, w))) return;
        if (o.geometry.type === 'PlaneGeometry' && Math.abs(o.rotation.x + Math.PI / 2) > 0.01) return; // posters etc.
        surfaceList!.push(o);
      });
    }
    return surfaceList;
  }
  /** Height of the first surface below `fromY` at (x, z). */
  function surfaceY(x: number, z: number, exclude?: THREE.Object3D | null, fromY = 3.2) {
    downRay.set(new THREE.Vector3(x, fromY, z), DOWN); downRay.far = fromY + 0.8;
    for (const hit of downRay.intersectObjects(surfaces(), false)) {
      if (isDesc(hit.object, char) || (exclude && isDesc(hit.object, exclude))) continue;
      let vis = true; for (let o: THREE.Object3D | null = hit.object; o; o = o.parent) if (!o.visible) { vis = false; break; }
      if (!vis) continue;
      return Math.max(0, hit.point.y);
    }
    return 0;
  }
  function dropPoint(): [number, number, number] {
    const fx = char.position.x + Math.sin(char.rotation.y) * S.reach, fz = char.position.z + Math.cos(char.rotation.y) * S.reach;
    return [fx, surfaceY(fx, fz, S.held && S.held.obj), fz];
  }
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 16), new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.9, depthTest: false }));
  marker.rotation.x = -Math.PI / 2; marker.renderOrder = 10; marker.visible = false; scene.add(marker);
  function pickUp(h: Holdable) {
    S.held = h; S.reach = 0.75; h.obj.parent!.remove(h.obj); body.add(h.obj);
    h.obj.position.set(h.hold[0], h.hold[1], h.hold[2]); h.obj.rotation.set(h.rx, 0, 0);
    toast(h.name + '……크다.');
  }
  function putDown() {
    const [fx, fy, fz] = dropPoint();
    if (fy > MAX_REACH_Y) { toast('……손이 안 닿아.'); return; }
    const h = S.held!; S.held = null; body.remove(h.obj); scene.add(h.obj);
    h.obj.position.set(fx, fy, fz); h.obj.rotation.set(0, char.rotation.y, 0);
    surfaceList = null;
  }
  function interact() {
    if (S.riding) { G.dismount(); return; }
    if (S.held) { putDown(); return; }
    if (S.seat || S.pose === 'sit' || S.pose === 'lie') { standUp(); return; }
    const sp = nearestSpot();
    if (sp && sp.hold) { pickUp(sp.hold); return; }
    if (sp && sp.veh) { G.mount(sp.veh); return; }
    if (sp && sp.act) { sp.act(); return; }
    if (sp && sp.seat) {
      S.seat = sp.seat; S.seatY = sp.seat.auto ? surfaceY(sp.at[0], sp.at[1]) : sp.seat.y;
      char.position.set(sp.at[0], 0, sp.at[1]); char.rotation.y = sp.seat.rot; G.setPose(sp.seat.pose);
      if (sp.seat.msg) setTimeout(() => toast(sp.seat.msg), 500);
      return;
    }
    S.seat = null; S.seatY = 0; G.setPose('sit'); // sit on the floor
  }

  /** Walk out of the front door / back in, with a short fade. */
  function goZone(z: 'house' | 'alley') {
    G.setUi({ fading: true });
    setTimeout(() => {
      S.zone = z; S.seat = null; S.seatY = 0; G.setPose('stand');
      if (z === 'alley') { char.position.set(0, 0, 8.4); char.rotation.y = Math.PI; S.camYaw = 0; S.camDist = 5.6; if (!S.taskDone) G.setUi({ task: '할 일: 편의점에서 캔커피' }); }
      else { char.position.set(HX + 13.2, 0, 13.4); char.rotation.y = Math.PI; S.camYaw = 0.75; S.camDist = 6.4; }
      for (const g of G.wallGroups) g.visible = true;
      G.applyTime(S.timeIdx);
      G.setUi({ fading: false });
    }, 280);
  }

  Object.assign(G, { SPOTS, nearestSpot, standUp, interact, goZone, surfaceY, dropPoint, resetSurfaces, marker });
}
