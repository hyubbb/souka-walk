// Takeshiba (Tokyo): a 600 m PLATEAU city block built far down the alley's -z axis.
// You get there through the ticket gate at the end of the alley. The map itself is only loaded the first time
// you go, and it is too detailed for box colliders, so walking, driving and the camera use a triangle grid:
// "how high is the ground here" and "is there a wall between these two points".
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { EditObj, Game, Spot } from '../types';
import { HEAVY_URLS } from '../heavyAssets';
import { flatShade, toneMaterial } from '../props';

/** Map centre in world space (far enough that the alley fog hides it). */
export const CITY = { x: 0, z: -700 };
/** Where you come out of the gate: an open square in the middle of the block (map-local x / z). */
const ARRIVE = { x: 96, z: 30 };
/** Anything this far down the z axis counts as being in the city. */
export const inCity = (z: number) => z < CITY.z + 330;

const MAP_URL = HEAVY_URLS['../assets/pack3/big/takeshiba.glb'];
const CELL = 6;
const STEP = 0.55;   // highest kerb or stair souka can walk up in one go

// Things placed around the arrival square (map-local x / z, rotation)
const CITY_DEFAULTS: [string, string, number, number, number][] = [
  ['개찰구(타케시바)', 'jpTicketGate', 0, 0, 0],
  ['자판기(빨강)', 'jpVendingRed', -3.2, -2.4, 0],
  ['자판기(파랑)', 'jpVendingBlue', -2.0, -2.4, 0],
  ['자판기(초록)', 'jpVendingGreen', -0.8, -2.4, 0],
  ['노점', 'jpMarketStall', 5.5, -3.5, 0],
  ['GT-R', 'carGTR', -6.5, 5.5, Math.PI / 2],
  ['수프라', 'carSupra', -6.5, 9.5, Math.PI / 2],
  ['프렐류드', 'carPrelude', 6.5, 7.5, -Math.PI / 2],
  ['R32', 'carR32', 6.5, 11.5, -Math.PI / 2],
  ['역 앞 빌딩', 'jpBuilding', 4, -16, 0],
  ['일본 주택', 'jpHouse', -16, -6, Math.PI / 2],
];

export function setupCity(G: Game) {
  const { S, scene, char, toast } = G;
  const enabled = !!MAP_URL;
  const root = new THREE.Group(); root.name = 'takeshiba'; root.position.set(CITY.x, 0, CITY.z); scene.add(root);
  const arrive = new THREE.Vector3(CITY.x + ARRIVE.x, 0, CITY.z + ARRIVE.z);

  // ---- triangle grid ----
  let tris = new Float32Array(0);
  const cells = new Map<number, number[]>();
  const key = (ix: number, iz: number) => (ix + 2000) * 5000 + (iz + 2000);
  function build(model: THREE.Object3D) {
    model.updateMatrixWorld(true);
    const list: number[] = [], v = new THREE.Vector3();
    model.traverse((o: any) => {
      if (!o.isMesh) return;
      const g = o.geometry as THREE.BufferGeometry, p = g.attributes.position, idx = g.index;
      const n = idx ? idx.count : p.count;
      for (let i = 0; i < n; i++) { v.fromBufferAttribute(p as any, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld); list.push(v.x, v.y, v.z); }
    });
    tris = new Float32Array(list);
    for (let t = 0; t < tris.length / 9; t++) {
      const b = t * 9;
      const x0 = Math.min(tris[b], tris[b + 3], tris[b + 6]), x1 = Math.max(tris[b], tris[b + 3], tris[b + 6]);
      const z0 = Math.min(tris[b + 2], tris[b + 5], tris[b + 8]), z1 = Math.max(tris[b + 2], tris[b + 5], tris[b + 8]);
      for (let ix = Math.floor(x0 / CELL); ix <= Math.floor(x1 / CELL); ix++)
        for (let iz = Math.floor(z0 / CELL); iz <= Math.floor(z1 / CELL); iz++) {
          const k = key(ix, iz); let c = cells.get(k); if (!c) cells.set(k, (c = [])); c.push(t);
        }
    }
  }
  /** Highest ground at (x, z) that is not above `fromY`, or null outside the map. */
  function groundAt(x: number, z: number, fromY = 1e4): number | null {
    const c = cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL))); if (!c) return null;
    let best: number | null = null;
    for (const t of c) {
      const b = t * 9;
      const ax = tris[b], ay = tris[b + 1], az = tris[b + 2], bx = tris[b + 3], by = tris[b + 4], bz = tris[b + 5], cx = tris[b + 6], cy = tris[b + 7], cz = tris[b + 8];
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-9) continue;   // vertical
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
      const y = l1 * ay + l2 * by + l3 * cy;
      if (y <= fromY + 1e-3 && (best === null || y > best)) best = y;
    }
    return best;
  }
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), pv = new THREE.Vector3(), tv = new THREE.Vector3(), qv = new THREE.Vector3();
  /** Distance along the segment a→b to the first triangle it crosses (0..1), or 1 when clear. */
  function hitFrac(a: THREE.Vector3, b: THREE.Vector3): number {
    const dir = new THREE.Vector3().subVectors(b, a), len = dir.length(); if (len < 1e-6) return 1;
    const seen = new Set<number>(); let best = 1;
    const steps = Math.ceil(len / (CELL * 0.5));
    for (let s = 0; s <= steps; s++) {
      const px = a.x + dir.x * (s / steps), pz = a.z + dir.z * (s / steps);
      const c = cells.get(key(Math.floor(px / CELL), Math.floor(pz / CELL))); if (!c) continue;
      for (const t of c) {
        if (seen.has(t)) continue; seen.add(t);
        const o = t * 9;
        e1.set(tris[o + 3] - tris[o], tris[o + 4] - tris[o + 1], tris[o + 5] - tris[o + 2]);
        e2.set(tris[o + 6] - tris[o], tris[o + 7] - tris[o + 1], tris[o + 8] - tris[o + 2]);
        pv.crossVectors(dir, e2); const det = e1.dot(pv); if (Math.abs(det) < 1e-9) continue;
        const inv = 1 / det; tv.set(a.x - tris[o], a.y - tris[o + 1], a.z - tris[o + 2]);
        const u = tv.dot(pv) * inv; if (u < 0 || u > 1) continue;
        qv.crossVectors(tv, e1); const w = dir.dot(qv) * inv; if (w < 0 || u + w > 1) continue;
        const f = e2.dot(qv) * inv; if (f >= 0 && f < best) best = f;
      }
    }
    return best;
  }
  const A = new THREE.Vector3(), B = new THREE.Vector3();
  /** Can something standing at (x0, y0, z0) move to (x1, z1)? Returns the new ground height or null.
   *  `reach` extends the wall check past the end point (a car's nose). */
  function moveTo(x0: number, y0: number, z0: number, x1: number, z1: number, reach = 0.3): number | null {
    if (!loaded) return null;
    const dx = x1 - x0, dz = z1 - z0, d = Math.hypot(dx, dz) || 1;
    for (const h of [0.35, 0.95]) {
      A.set(x0, y0 + h, z0); B.set(x1 + dx / d * reach, y0 + h, z1 + dz / d * reach);
      if (hitFrac(A, B) < 1) return null;
    }
    const gy = groundAt(x1, z1, y0 + STEP);
    if (gy === null || gy - y0 > STEP) return null;
    return gy;
  }

  // ---- loading ----
  let loaded = false, loading: Promise<void> | null = null;
  function load(): Promise<void> {
    if (!enabled) return Promise.reject(new Error('no map'));
    if (!loading) loading = new GLTFLoader().loadAsync(MAP_URL).then((gltf) => {
      const model = gltf.scene;
      model.traverse((o: any) => {
        if (!o.isMesh) return;
        if (!o.geometry.attributes.normal) o.geometry = flatShade(o.geometry);
        o.material = toneMaterial(o.material); o.receiveShadow = true;
      });
      root.add(model);
      build(model);
      // the arrival square becomes y = 0, like the alley
      const gy = groundAt(arrive.x, arrive.z) ?? 0;
      root.position.y = -gy; for (let i = 1; i < tris.length; i += 3) tris[i] -= gy;
      loaded = true;
      settle();
    });
    return loading;
  }
  /** Stand everything placed in the city on the ground under it. */
  function settle() {
    if (!loaded) return;
    for (const o of G.editObjs as EditObj[]) {
      if (o.off !== 0 || o.hidden || o.top || !inCity(o.g.position.z) || o.g.parent !== scene) continue;
      const gy = groundAt(o.g.position.x, o.g.position.z, o.g.position.y + 2);
      if (gy !== null) o.g.position.y = gy;
    }
  }

  // ---- getting there and back ----
  function go(to: 'city' | 'alley') {
    if (to === 'city' && !enabled) { toast('이 버전에는 타케시바가 없어요.'); return; }
    if (S.riding) { toast('차에서 내린 다음에 가자.'); return; }
    G.setUi({ fading: true });
    const ready = to === 'city' ? load() : Promise.resolve();
    if (to === 'city' && !loaded) toast('타케시바로 가는 중……');
    ready.then(() => {
      if (to === 'city') { char.position.set(arrive.x, 0, arrive.z + 1.6); char.rotation.y = 0; S.camYaw = Math.PI; }
      else { char.position.set(gateAlley.x, 0, gateAlley.z - 1.4); char.rotation.y = Math.PI; S.camYaw = 0; }
      S.zone = 'alley'; S.area = to; S.seat = null;
      for (const g of G.wallGroups) g.visible = true; S.seatY = 0; G.setPose('stand'); S.camDist = 6;
      G.applyTime(S.timeIdx);
      G.setUi({ fading: false });
      if (to === 'city') toast('타케시바에 도착. 바닷바람이 분다.');
    }).catch(() => { G.setUi({ fading: false }); toast('지도를 불러오지 못했어요.'); });
  }
  const gateAlley = { x: -9.5, z: -41.2 };
  const SPOTS: Spot[] = G.SPOTS;
  if (enabled) {
    SPOTS.push({ zone: 'alley', at: [gateAlley.x, gateAlley.z], r: 2.4, label: '개찰구 지나 타케시바로', act: () => go('city') });
    SPOTS.push({ zone: 'alley', at: [arrive.x, arrive.z], r: 2.4, label: '개찰구 지나 골목으로', act: () => go('alley') });
    G.props.spawn('jpTicketGate', { x: gateAlley.x, z: gateAlley.z, r: 0, zone: 'alley', name: '개찰구(골목)' });
    for (const [name, id, x, z, r] of CITY_DEFAULTS.slice(1)) G.props.spawn(id, { x: arrive.x + x, z: arrive.z + z, r, zone: 'alley', name });
    G.props.spawn('jpTicketGate', { x: arrive.x, z: arrive.z, r: 0, zone: 'alley', name: CITY_DEFAULTS[0][0] });
  }

  G.city = { root, enabled, load, go, groundAt: (x: number, z: number, fromY?: number) => (loaded ? groundAt(x, z, fromY) : null), moveTo, hitFrac: (a: THREE.Vector3, b: THREE.Vector3) => (loaded ? hitFrac(a, b) : 1), settle, isLoaded: () => loaded };
}
