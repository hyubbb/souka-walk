// Yokohama (Yoshinocho → Surugabashi → Bandobashi, Minami-ku): souka's real neighbourhood, drawn from the map.
// Compressed and straightened so it is quick to walk. Local frame: east = +x, north = -z.
//
//   Route 21 runs west → east (z = 0) and ends at the Surugabashi crossing, where the big road turns north (x = 22).
//   Home (STUDIO Z, black with red frames) is on the SOUTH side of Route 21, facing north;
//   right across the road is the MaxValu tower (MaxValu on the left, HottoMotto on the right, seen from home),
//   with the striped tower next to it. Bandobashi Park is to the right (east) of home, past the crossing,
//   under the curving expressway. North of it, along the road: a parking lot and a small park (trees, a drinking
//   fountain, benches), then Fujimigawa Park (the playground: swings, bars, red pipe fences), then an open plaza,
//   and the Shiroganejindo footbridge over the Ōoka River.
import * as THREE from 'three';
import type { Game, Spot } from '../types';

/** World offset of this place (far to the west, out of sight of the alley and the house). */
export const YO = { x: -600, z: 0 };
const BOUNDS = { x0: -92, x1: 92, z0: -87, z1: 56 };
/** Souka's front door (local x / z): home is south of Route 21, the door faces north. */
const HOME = { x: -5, z: 15.75 };
const DOOR = { x: -6, z: 10.6 };
const RZ0 = -82, RZ1 = -70;            // the river, bank to bank
const BX = 22, BW = 12;               // the big road north from Surugabashi

export function setupYokohama(G: Game) {
  const { scene, canvasTex, lam, addCol, occluders, S, char, toast } = G;
  const root = new THREE.Group(); root.name = 'yokohama'; root.position.set(YO.x, 0, YO.z); scene.add(root);
  G.areaBounds.yokohama = { x0: YO.x + BOUNDS.x0, x1: YO.x + BOUNDS.x1, z0: YO.z + BOUNDS.z0, z1: YO.z + BOUNDS.z1 };

  // own seeded random: the alley's generator must not be disturbed (its call order shapes that street)
  let seed = 232014;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const pick = <T,>(a: T[]) => a[(rnd() * a.length) | 0];
  function speckle(g: CanvasRenderingContext2D, w: number, h: number, base: string, amt: number, density = 0.5) {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h * density; i++) { const v = (rnd() - 0.5) * amt; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(rnd() * w | 0, rnd() * h | 0, 1, 1); }
  }
  const rep = (t: THREE.Texture, x: number, y: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; };
  /** Collider in local coordinates. */
  const col = (cx: number, cz: number, w: number, d: number) => addCol(YO.x + cx, YO.z + cz, w, d);
  function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, occ = false, parent: THREE.Object3D = root) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); if (occ) occluders.push(m); return m;
  }
  function flat(x: number, z: number, w: number, d: number, mat: THREE.Material, y = 0, rot = 0) {
    const m = mesh(new THREE.PlaneGeometry(w, d), mat, x, y, z); m.rotation.x = -Math.PI / 2; m.rotation.z = rot; return m;
  }
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], occ = false, parent: THREE.Object3D = root) =>
    mesh(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, occ, parent);

  // ---------- ground, roads, pavements ----------
  const asphaltT = canvasTex(64, 64, (g, w, h) => { speckle(g, w, h, '#58554f', 0.2, 0.7); g.fillStyle = 'rgba(0,0,0,.16)'; for (let i = 0; i < 6; i++) g.fillRect(rnd() * w | 0, rnd() * h | 0, 4 + rnd() * 10 | 0, 1); });
  const paveT = canvasTex(32, 32, (g, w, h) => { speckle(g, w, h, '#b9b5ac', 0.14, 0.5); g.fillStyle = 'rgba(0,0,0,.13)'; for (let i = 0; i < 32; i += 8) { g.fillRect(0, i, 32, 1); g.fillRect(i, 0, 1, 32); } });
  const grassT = canvasTex(32, 32, (g, w, h) => speckle(g, w, h, '#6f8a4c', 0.3, 0.7));
  const dirtT = canvasTex(32, 32, (g, w, h) => speckle(g, w, h, '#b9a785', 0.2, 0.6));
  const gravelT = canvasTex(32, 32, (g, w, h) => speckle(g, w, h, '#9a958b', 0.3, 0.8));
  const groundT = canvasTex(32, 32, (g, w, h) => speckle(g, w, h, '#8a857a', 0.25, 0.7));
  // (no ground over the river: it sits in a channel below the street)
  flat(0, (RZ1 + 60) / 2, 200, 60 - RZ1, lam({ map: rep(groundT, 60, 40) }), -0.02);
  flat(0, (RZ0 - 130) / 2, 200, RZ0 + 130, lam({ map: rep(groundT, 60, 15) }), -0.02);
  const road = (x: number, z: number, w: number, d: number) => flat(x, z, w, d, lam({ map: rep(asphaltT, w / 2, d / 2) }), 0.001);
  const pave = (x: number, z: number, w: number, d: number) => flat(x, z, w, d, lam({ map: rep(paveT, w / 1.6, d / 1.6) }), 0.004);
  const white = lam({ color: 0xe8e4d6 }), yellow = lam({ color: 0xd9b444 });
  const line = (x: number, z: number, w: number, d: number, m = white) => flat(x, z, w, d, m, 0.008);
  function crosswalk(x: number, z: number, along: 'x' | 'z', len: number) {
    for (let i = 0; i < len / 0.9; i++) {
      const o = -len / 2 + 0.45 + i * 0.9;
      if (along === 'x') line(x, z + o, 3.2, 0.45); else line(x + o, z, 0.45, 3.2);
    }
  }

  // Route 21 (Kamakura-kaido): 4 lanes from Yoshinocho in the west to the Surugabashi crossing
  const R21_X1 = BX + BW / 2;
  road((-92 + R21_X1) / 2, 0, R21_X1 + 92, 13);
  pave((-92 + BX - BW / 2) / 2, -8.3, BX - BW / 2 + 92, 3.6); pave((-92 + BX - BW / 2) / 2, 8.3, BX - BW / 2 + 92, 3.6);
  for (const z of [-6.3, 6.3]) line((-92 + BX - BW / 2) / 2, z, BX - BW / 2 + 92, 0.15);
  line((-92 + BX - BW / 2) / 2, -0.12, BX - BW / 2 + 92, 0.12, yellow); line((-92 + BX - BW / 2) / 2, 0.12, BX - BW / 2 + 92, 0.12, yellow);
  for (let x = -90; x < BX - BW / 2 - 4; x += 8) for (const z of [-3.2, 3.2]) line(x, z, 4, 0.12);
  // the big road north from Surugabashi (and south past the parks), with pavements
  road(BX, (-66 + 56) / 2, BW, 122);
  pave(BX - BW / 2 - 1.8, -36, 3.6, 59); pave(BX + BW / 2 + 1.8, -36, 3.6, 59);
  pave(BX - BW / 2 - 1.8, 33, 3.6, 46); pave(BX + BW / 2 + 1.8, 33, 3.6, 46);
  for (const sx of [-1, 1]) line(BX + sx * (BW / 2 - 0.3), -5, 0.15, 122);
  line(BX - 0.1, -5, 0.12, 122, yellow);
  // other streets
  const STREETS = [{ x: -35, w: 6, z0: RZ1 - 0.5, z1: -6.5 }, { x: 75, w: 12, z0: -130, z1: -35 }, { x: -60, w: 6, z0: 6.5, z1: 56 }];
  for (const s of STREETS) {
    road(s.x, (s.z0 + s.z1) / 2, s.w, s.z1 - s.z0);
    for (const sx of [-1, 1]) line(s.x + sx * (s.w / 2 - 0.3), (s.z0 + s.z1) / 2, 0.12, s.z1 - s.z0);
  }
  // Isesakicho street, between Route 21 and the river
  const IZ = -38;
  road(0, IZ, 184, 6);
  for (const z of [IZ - 3.3, IZ + 3.3]) pave(0, z, 184, 0.9);
  // crossings
  crosswalk(-6, 0, 'x', 12.4);             // home → MaxValu
  crosswalk(BX - BW / 2 - 2.2, 0, 'x', 12.4); crosswalk(BX, 8.8, 'z', BW - 0.6); crosswalk(BX, -8.8, 'z', BW - 0.6);
  crosswalk(BX, IZ + 4.2, 'z', BW - 0.6); crosswalk(-35, -8.3, 'z', 5.4); crosswalk(-60, 8.3, 'z', 5.4);

  // ---------- buildings ----------
  // window tile = one floor (2.8 m) × one bay (3.2 m)
  function aptTex(base: string, lit: boolean, kind: 'flat' | 'balcony' | 'office' = 'flat', stripe?: string) {
    return canvasTex(32, 32, (g, w, h) => {
      speckle(g, w, h, base, 0.12, 0.5);
      if (stripe) { g.fillStyle = stripe; g.fillRect(0, 0, 6, 32); }
      if (kind === 'balcony') {
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 2, 32, 16);
        g.fillStyle = lit && rnd() < 0.5 ? '#e8d495' : '#55606a'; g.fillRect(8, 4, 18, 12);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 18, 32, 9);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 27, 32, 1);
      } else if (kind === 'office') {
        g.fillStyle = '#4c5866'; g.fillRect(2, 6, 28, 16);
        g.fillStyle = lit && rnd() < 0.6 ? '#eadca6' : '#7f8d99'; g.fillRect(3, 7, 26, 14);
        g.fillStyle = 'rgba(0,0,0,.3)'; for (let x = 10; x < 30; x += 9) g.fillRect(x, 7, 1, 14);
      } else {
        for (const x of [5, 19]) { g.fillStyle = '#4b5560'; g.fillRect(x - 1, 7, 10, 12); g.fillStyle = lit && rnd() < 0.45 ? '#e9d79a' : (rnd() < 0.5 ? '#6b7a86' : '#7d8b94'); g.fillRect(x, 8, 8, 10); g.fillStyle = '#8e8a82'; g.fillRect(x - 1, 19, 10, 1); }
      }
    });
  }
  const roofMat = lam({ color: 0x77746d });
  const WALLS = ['#d8cbb4', '#cdbba1', '#e6dfd0', '#b9ad9d', '#d6c6b8', '#c9cdc4', '#a99a88', '#e2d6c2', '#bdb6ab', '#9f8f80'];
  function faceMats(w: number, d: number, h: number, day: THREE.Texture, night: THREE.Texture) {
    const mats: THREE.Material[] = [];
    for (const [a, b] of [[d, h], [d, h], [0, 0], [0, 0], [w, h], [w, h]]) {
      if (!a) { mats.push(roofMat); continue; }
      const m = lam({ map: rep(day, a / 3.2, b / 2.8) });
      G.buildingMats.push({ m, day: m.map, night: rep(night, a / 3.2, b / 2.8) });
      mats.push(m);
    }
    return mats;
  }
  /** A building box; the faces get floor/bay tiled windows and swap to lit windows at night. */
  function building(x: number, z: number, w: number, d: number, h: number, opts: { base?: string; kind?: 'flat' | 'balcony' | 'office'; stripe?: string } = {}) {
    const base = opts.base || pick(WALLS), kind = opts.kind || pick(['flat', 'flat', 'balcony', 'office'] as const);
    box(x, 0, z, w, h, d, faceMats(w, d, h, aptTex(base, false, kind, opts.stripe), aptTex(base, true, kind, opts.stripe)), true);
    box(x, h, z, w + 0.2, 0.25, d + 0.2, roofMat, true);
    col(x, z, w, d);
  }
  /** Fill a block with buildings along its edges (cells of random width, one or two rows deep). */
  function fillBlock(x0: number, x1: number, z0: number, z1: number, hMin = 8, hMax = 30) {
    const depth = z1 - z0, rows = depth > 22 ? 2 : 1, rd = depth / rows;
    for (let r = 0; r < rows; r++) {
      let x = x0 + 0.5;
      while (x < x1 - 3) {
        const w = Math.min(x1 - 0.5 - x, 5 + rnd() * 9);
        const d = rd - 1 - rnd() * 2, cz = r === 0 ? z0 + 0.5 + d / 2 : z1 - 0.5 - d / 2;
        building(x + w / 2, cz, w - 0.6, d, hMin + Math.round(rnd() * (hMax - hMin) / 2.8) * 2.8);
        x += w;
      }
    }
  }

  // ---------- home: STUDIO Z, south side of Route 21, facing north ----------
  // Built in its own group facing +z and turned round, so "left / right" below are as seen standing in front of it
  // (from the road): scaffold-sheeted building, 松井印店, home, the stair tower with the sign, CENTURY 21.
  const black = lam({ color: 0x26272a }), red = lam({ color: 0xc23a33 }), steel = lam({ color: 0x8c9196 }), glassDark = lam({ color: 0x2f3a44 });
  {
    const hg = new THREE.Group(); hg.position.set(HOME.x, 0, HOME.z); hg.rotation.y = Math.PI; root.add(hg);
    /** collider for something at group-local (lx, lz): the group is turned 180°. */
    const hcol = (lx: number, lz: number, w: number, d: number) => col(HOME.x - lx, HOME.z - lz, w, d);
    const W = 6, D = 10.5, H = 17, fz = D / 2 + 0.15;
    box(0, 0, 0, W, H, D, black, true, hg); hcol(0, 0, W, D);
    box(0, H, 0, W + 0.2, 0.3, D + 0.2, black, true, hg);
    // red frames, each around two floors of balconies
    for (const [y0, y1] of [[2.9, 8.5], [8.5, 14.1], [14.1, 17]]) {
      const t = 0.42;
      box(0, y0, fz, W, t, 0.35, red, false, hg); box(0, y1 - t, fz, W, t, 0.35, red, false, hg);
      box(-W / 2 + t / 2, y0, fz, t, y1 - y0, 0.35, red, false, hg); box(W / 2 - t / 2, y0, fz, t, y1 - y0, 0.35, red, false, hg);
    }
    for (let f = 1; f < 6; f++) {
      const y = f * 2.8 + 0.2;
      box(0, y + 0.3, D / 2 - 0.05, W - 1, 2.1, 0.05, glassDark, false, hg);
      box(0, y, D / 2 + 0.05, W - 1, 1.0, 0.06, steel, false, hg);
    }
    // entrance (towards the stair tower side)
    box(1, 0, D / 2 + 0.03, 1.6, 2.3, 0.05, glassDark, false, hg);
    box(1, 2.3, D / 2 + 0.2, 2.2, 0.15, 0.6, black, false, hg);
    // stair tower on the right with the vertical "STUDIO Z" sign
    const lattice = canvasTex(16, 16, (g) => { g.fillStyle = '#1d1e20'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#3c3e42'; for (let i = 0; i < 16; i += 4) { g.fillRect(i, 0, 1, 16); g.fillRect(0, i, 16, 1); } });
    const tx = W / 2 + 0.7, tz = D / 2 - 1.6;
    box(tx, 0, tz, 1.4, H + 1, 3.2, lam({ map: rep(lattice, 2, 24) }), true, hg); hcol(tx, tz, 1.4, 3.2);
    const signT = canvasTex(32, 256, (g) => {
      g.fillStyle = '#1d1e20'; g.fillRect(0, 0, 32, 256); g.fillStyle = '#e9e5dc'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center';
      'STUDIO Z'.split('').forEach((c, i) => g.fillText(c, 16, 31 + i * 30));
    });
    mesh(new THREE.PlaneGeometry(1.1, 8.8), new THREE.MeshBasicMaterial({ map: signT }), tx, 10.5, tz + 1.62, false, hg);
    // hedge in front of the left half, the green utility box on the right by the kerb
    const hedge = lam({ color: 0x55783f });
    box(-1.5, 0, D / 2 + 0.9, 3, 0.7, 0.8, hedge, false, hg); hcol(-1.5, D / 2 + 0.9, 3, 0.8);
    box(4.6, 0, D / 2 + 1.1, 0.9, 1.3, 0.6, lam({ color: 0x9fb7a3 }), false, hg); hcol(4.6, D / 2 + 1.1, 0.9, 0.6);
    // right: beige block with a CENTURY 21 office on the ground floor
    const cx = W / 2 + 1.4 + 3.3;
    box(cx, 0, -0.3, 6.4, 24, 11, faceMats(6.4, 11, 24, aptTex('#d9cdb8', false), aptTex('#d9cdb8', true)), true, hg); hcol(cx, -0.3, 6.4, 11);
    const c21 = canvasTex(64, 16, (g) => { g.fillStyle = '#16161a'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#c9a94e'; g.font = 'bold 9px sans-serif'; g.fillText('CENTURY 21', 5, 11); });
    box(cx, 0, 5.22, 6, 2.6, 0.12, glassDark, false, hg);
    mesh(new THREE.PlaneGeometry(4, 1), lam({ map: c21 }), cx, 3.1, 5.3, false, hg);
    // left: 松井印店 (white, with its vertical sign), a low beige house, then the building under scaffold sheets
    const mx = -W / 2 - 2.2;
    box(mx, 0, -0.75, 4, 7.5, 8, faceMats(4, 8, 7.5, aptTex('#e8e6e0', false), aptTex('#e8e6e0', true)), true, hg); hcol(mx, -0.75, 4, 8);
    const mT = canvasTex(32, 192, (g) => { g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, 32, 192); g.strokeStyle = '#2d4f8a'; g.lineWidth = 2; g.strokeRect(2, 2, 28, 188); g.fillStyle = '#2d4f8a'; g.font = 'bold 22px serif'; g.textAlign = 'center'; '松井印店'.split('').forEach((c, i) => g.fillText(c, 16, 36 + i * 42)); });
    const cream = lam({ color: 0xf2f0ea });
    mesh(new THREE.BoxGeometry(0.7, 3.6, 0.25), [cream, cream, cream, cream, lam({ map: mT }), lam({ map: mT })], mx + 1.4, 4.2, 3.6, false, hg);
    box(mx - 4.3, 0, -1.25, 4.4, 9, 9, faceMats(4.4, 9, 9, aptTex('#cdb79b', false), aptTex('#cdb79b', true)), true, hg); hcol(mx - 4.3, -1.25, 4.4, 9);
    const sheetT = canvasTex(32, 32, (g, w, h) => { speckle(g, w, h, '#a7aaa8', 0.16, 0.5); g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < 32; y += 8) g.fillRect(0, y, 32, 1); for (let x = 0; x < 32; x += 11) g.fillRect(x, 0, 1, 32); });
    box(mx - 12.2, 0, -1.25, 11, 26, 12, lam({ map: rep(sheetT, 4, 8) }), true, hg); hcol(mx - 12.2, -1.25, 11, 12);
  }
  // the rest of home's block and the blocks south of Route 21
  fillBlock(-92, -63.5, 10.5, 55);
  fillBlock(-56.5, -18.5, 10.5, 30);
  fillBlock(-56.5, 14, 33, 55, 6, 18);
  fillBlock(-18.5, 14, 23, 30.5, 6, 14);

  // ---------- across the road (north side): MaxValu tower and the striped tower ----------
  {
    const brownT = canvasTex(32, 32, (g, w, h) => { speckle(g, w, h, '#8d7a68', 0.12, 0.6); g.fillStyle = '#6f5f51'; g.fillRect(0, 18, 32, 10); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 17, 32, 1); g.fillStyle = '#4f565d'; g.fillRect(6, 3, 20, 13); });
    const brownN = canvasTex(32, 32, (g, w, h) => { speckle(g, w, h, '#8d7a68', 0.12, 0.6); g.fillStyle = '#6f5f51'; g.fillRect(0, 18, 32, 10); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 17, 32, 1); g.fillStyle = rnd() < 0.5 ? '#e5d193' : '#4f565d'; g.fillRect(6, 3, 20, 13); });
    const w = 20, d = 14, h = 40, x = -13, z = -19.5, front = z + (d + 1) / 2;
    box(x, 4.5, z - 0.5, w, h - 4.5, d, faceMats(w, d, h, brownT, brownN), true); col(x, z, w + 2, d + 1);
    const podT = canvasTex(32, 16, (g, w2, h2) => speckle(g, w2, h2, '#7b6858', 0.12, 0.6));
    box(x, 0, z, w + 2, 4.5, d + 1, lam({ map: rep(podT, 6, 1) }), true);
    box(x, 0, front + 0.02, w - 1, 2.6, 0.05, glassDark);
    const awn = lam({ color: 0x2f7a5a });
    for (let i = 0; i < 4; i++) { const a = box(x - 7.5 + i * 5, 2.7, front + 0.55, 4.4, 0.5, 1.1, awn); a.rotation.x = -0.25; }
    // seen from home: MaxValu on the left (west), HottoMotto on the right (east)
    const mvT = canvasTex(64, 24, (g) => { g.fillStyle = '#c8324a'; g.fillRect(0, 0, 64, 24); g.fillStyle = '#fff'; g.font = 'bold italic 12px sans-serif'; g.fillText('MaxValu', 6, 15); g.font = '6px sans-serif'; g.fillText('AEON', 48, 8); });
    mesh(new THREE.PlaneGeometry(3.6, 1.35), lam({ map: mvT }), x - 3, 3.6, front + 0.04);
    const hmT = canvasTex(64, 16, (g) => { g.fillStyle = '#3a1c14'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#e9c46a'; g.font = 'bold 8px sans-serif'; g.fillText('HottoMotto', 6, 11); });
    mesh(new THREE.PlaneGeometry(3, 0.75), lam({ map: hmT }), x + 7.5, 3.6, front + 0.04);
    // parked bicycles in front of the shop
    const bikeM = lam({ color: 0x4d5257 });
    for (let i = 0; i < 6; i++) { const bx = x - 9 + i * 0.7; box(bx, 0.3, front + 1.5, 0.06, 0.5, 1.5, bikeM); }
    col(x - 7.25, front + 1.5, 4.2, 1.5);
    building(7, -20, 13, 13, 30.8, { base: '#cbbba7', kind: 'balcony', stripe: '#8e5747' });
  }
  fillBlock(-92, -38.5, -30, -10.5);
  fillBlock(-31.5, -24, -30, -10.5, 8, 16);
  fillBlock(13.8, BX - BW / 2 - 3.8, -30, -10.5, 8, 14);
  fillBlock(-92, -38.5, -66, -41.5);
  fillBlock(-31.5, BX - BW / 2 - 3.8, -66, -41.5);

  // ---------- trees, lamps, signals ----------
  const leaf = new THREE.MeshPhongMaterial({ color: 0x5d8a45, shininess: 0, specular: 0 }), leaf2 = new THREE.MeshPhongMaterial({ color: 0x6f9b4e, shininess: 0, specular: 0 });
  const trunk = lam({ color: 0x6b4f3a });
  const leafGeo = new THREE.IcosahedronGeometry(1, 1);
  function tree(x: number, z: number, s = 1, solid = true) {
    mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 2.2 * s, 6), trunk, x, 1.1 * s, z);
    for (const [ox, oy, oz, r] of [[0, 2.9, 0, 1.25], [0.6, 2.5, 0.3, 0.85], [-0.55, 2.6, -0.25, 0.9], [0.1, 3.5, -0.2, 0.8]]) {
      const f = mesh(leafGeo, rnd() < 0.5 ? leaf : leaf2, x + ox * s, oy * s, z + oz * s, true); f.scale.setScalar(r * s);
    }
    if (solid) col(x, z, 0.4 * s, 0.4 * s);
  }
  const poleMat = lam({ color: 0x8f949a });
  const lampHeads: THREE.Mesh[] = [];
  const lampOff = lam({ color: 0xd9d7cf }), lampOn = new THREE.MeshBasicMaterial({ color: 0xfff1c4 });
  function streetLamp(x: number, z: number, dx: number, dz: number) {
    mesh(new THREE.CylinderGeometry(0.08, 0.11, 6.2, 6), poleMat, x, 3.1, z);
    mesh(new THREE.BoxGeometry(0.08 + Math.abs(dx) * 1.5, 0.08, 0.08 + Math.abs(dz) * 1.5), poleMat, x + dx * 0.8, 6.1, z + dz * 0.8);
    lampHeads.push(mesh(new THREE.BoxGeometry(0.35 + Math.abs(dx) * 0.25, 0.12, 0.35 + Math.abs(dz) * 0.25), lampOff, x + dx * 1.5, 6.0, z + dz * 1.5));
    col(x, z, 0.25, 0.25);
  }
  for (let x = -86; x <= BX - BW / 2 - 6; x += 12) {
    if (Math.abs(x + 35) < 4 || Math.abs(x + 60) < 4 || Math.abs(x + 6) < 3) continue;
    tree(x + 4, -8.9, 0.8); tree(x + 4, 8.9, 0.8);
    streetLamp(x, -7.0, 0, 1);
    if (Math.abs(x + 6 - DOOR.x) > 3) streetLamp(x + 6, 7.0, 0, -1);   // keep the front door clear
  }
  for (let z = -60; z <= 50; z += 12) { if (Math.abs(z) < 10 || Math.abs(z - IZ) < 5) continue; streetLamp(BX - BW / 2 - 0.7, z, 1, 0); streetLamp(BX + BW / 2 + 0.7, z + 6, -1, 0); }
  const sigMat = lam({ color: 0x3a3d40 });
  for (const [x, z, f] of [[BX - BW / 2 - 1, -7.4, 1], [BX + BW / 2 + 1, 7.4, -1], [BX - BW / 2 - 1, IZ + 3.6, 1]] as [number, number, number][]) {
    mesh(new THREE.CylinderGeometry(0.09, 0.09, 5, 6), poleMat, x, 2.5, z);
    const head = mesh(new THREE.BoxGeometry(1.2, 0.4, 0.3), sigMat, x, 4.8, z + f * 0.6);
    for (let i = 0; i < 3; i++) { const l = mesh(new THREE.CircleGeometry(0.12, 10), new THREE.MeshBasicMaterial({ color: [0x3fae5a, 0xd9b444, 0xc23a33][i] }), x - 0.38 + i * 0.38, 4.8, head.position.z + f * 0.16); l.rotation.y = f > 0 ? 0 : Math.PI; }
    col(x, z, 0.25, 0.25);
  }
  // "駿河橋" crossing sign
  {
    const sT = canvasTex(64, 20, (g) => { g.fillStyle = '#2a5ca8'; g.fillRect(0, 0, 64, 20); g.fillStyle = '#fff'; g.font = 'bold 10px sans-serif'; g.fillText('駿河橋 Surugabashi', 3, 13); });
    mesh(new THREE.PlaneGeometry(2.6, 0.8), lam({ map: sT }), BX - BW / 2 - 1, 4.3, -7.2);
  }

  // ---------- Bandobashi Park: east of home, past the crossing, under the expressway ----------
  const wood = lam({ color: 0x8b6a4a });
  const SEATS: Spot[] = [];
  function bench(x: number, z: number, rot: number, label: string) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; root.add(g);
    box(0, 0.42, 0, 1.8, 0.08, 0.5, wood, false, g); box(0, 0.5, -0.25, 1.8, 0.45, 0.06, wood, false, g);
    for (const sx of [-0.75, 0.75]) box(sx, 0, 0, 0.08, 0.42, 0.45, poleMat, false, g);
    const ca = Math.abs(Math.cos(rot)), sa = Math.abs(Math.sin(rot));
    col(x, z, 1.8 * ca + 0.6 * sa, 1.8 * sa + 0.6 * ca);
    const fx = Math.sin(rot), fz = Math.cos(rot);
    SEATS.push({ zone: 'alley', at: [YO.x + x + fx * 0.15, YO.z + z + fz * 0.15], r: 1.1, label, seat: { y: 0.48, rot, pose: 'sit', exit: [YO.x + x + fx * 0.9, YO.z + z + fz * 0.9] } } as Spot);
  }
  {
    const PX0 = BX + BW / 2 + 3.6, PX1 = 62, PZ0 = -6, PZ1 = 34;
    flat((PX0 + PX1) / 2, (PZ0 + PZ1) / 2, PX1 - PX0, PZ1 - PZ0, lam({ map: rep(grassT, 18, 22) }), 0.006);
    const path = lam({ map: rep(dirtT, 2, 2) });
    const pts = [[PX0, 2], [36, 6], [42, 14], [40, 24], [47, 30], [55, 33]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az);
      flat((ax + bx) / 2, (az + bz) / 2, 2.4, len + 1.8, path, 0.012, -Math.atan2(bx - ax, bz - az));
    }
    for (const [x, z, s] of [[33, -3, 1.1], [37, 26, 1.2], [46, 22, 1], [50, 8, 1.2], [56, -2, 1], [58, 18, 1.1], [52, 28, 0.9], [44, 2, 0.9], [34, 17, 1], [59, 30, 1]] as [number, number, number][]) tree(x, z, s);
    bench(38, 10, -Math.PI / 2, '반도바시 공원 벤치에 앉기');
    bench(45, 26, Math.PI, '반도바시 공원 벤치에 앉기');
    const pT = canvasTex(64, 24, (g) => { g.fillStyle = '#e9e3d2'; g.fillRect(0, 0, 64, 24); g.fillStyle = '#2f4a2f'; g.font = 'bold 11px serif'; g.fillText('阪東橋公園', 4, 16); });
    box(PX0 + 0.6, 0, 1, 0.15, 1.2, 0.15, wood); const sg = mesh(new THREE.PlaneGeometry(2, 0.75), lam({ map: pT }), PX0 + 0.7, 1.5, 1); sg.rotation.y = -Math.PI / 2;
    // the expressway (Kariba line) curving north along the park's east side
    const exp = lam({ color: 0xa9a59c }), expSide = lam({ color: 0x94a07a });
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(64, 9, 60), new THREE.Vector3(67, 9, 25), new THREE.Vector3(65, 9, -10), new THREE.Vector3(72, 9, -28), new THREE.Vector3(96, 9, -44)]);
    const N = 26;
    for (let i = 0; i < N; i++) {
      const a = curve.getPoint(i / N), b = curve.getPoint((i + 1) / N), len = a.distanceTo(b), ang = Math.atan2(b.x - a.x, b.z - a.z);
      const seg = mesh(new THREE.BoxGeometry(9, 1.2, len + 0.3), exp, (a.x + b.x) / 2, 9, (a.z + b.z) / 2, true); seg.rotation.y = ang;
      for (const sx of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(0.3, 1.1, len + 0.3), expSide, (a.x + b.x) / 2 + Math.cos(ang) * sx * 4.4, 10.15, (a.z + b.z) / 2 - Math.sin(ang) * sx * 4.4, true); w.rotation.y = ang; }
      if (i % 3 === 0) {
        const onRoad = Math.abs(a.z - IZ) < 4.5 || STREETS.some((s) => Math.abs(a.x - s.x) < s.w / 2 + 1 && a.z > s.z0 && a.z < s.z1);
        if (!onRoad) { box(a.x, 0, a.z, 1.4, 8.4, 1.4, exp, true); col(a.x, a.z, 1.4, 1.4); }
      }
    }
    // Bandobashi subway entrance at the park corner, Yoshinocho at the west end
    const sub = (name: string) => canvasTex(64, 32, (g) => { g.fillStyle = '#1f5fa8'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#fff'; g.beginPath(); g.arc(12, 16, 9, 0, 7); g.fill(); g.fillStyle = '#1f5fa8'; g.font = 'bold 11px sans-serif'; g.fillText('B', 8, 20); g.fillStyle = '#fff'; g.font = 'bold 10px sans-serif'; g.fillText(name, 25, 20); });
    box(PX0 + 2, 0, -4.2, 2.4, 2.6, 3, lam({ color: 0xcfd3d6 }), true); col(PX0 + 2, -4.2, 2.4, 3);
    const s1 = mesh(new THREE.PlaneGeometry(2, 1), lam({ map: sub('阪東橋') }), PX0 + 0.78, 2.1, -4.2); s1.rotation.y = -Math.PI / 2;
    box(-82, 0, 11.6, 3, 2.6, 2.4, lam({ color: 0xcfd3d6 }), true); col(-82, 11.6, 3, 2.4);
    mesh(new THREE.PlaneGeometry(2.2, 1.1), lam({ map: sub('吉野町') }), -82, 2.2, 10.38).rotation.y = Math.PI;
    // east of the expressway, and south of the park
    fillBlock(72, 92, -30, 34, 8, 20);
    fillBlock(BX + BW / 2 + 3.6, 62, 37, 55, 6, 14);
  }

  // ---------- north of the park, along the big road: parking + small park, Fujimigawa Park, the plaza ----------
  const CX0 = BX + BW / 2 + 3.6;   // the chain of green spaces starts at the east pavement
  {
    // parking lot (white bays, a couple of cars) and a small park with trees, a drinking fountain and benches
    flat(CX0 + 5, -20, 10, 22, lam({ map: rep(asphaltT, 5, 11) }), 0.006);
    for (let z = -29; z <= -11; z += 2.6) line(CX0 + 5, z, 7, 0.1);
    const carM = [lam({ color: 0xe9e6de }), lam({ color: 0x5b6f86 }), lam({ color: 0x9c9a94 })];
    for (const [z, m] of [[-27.7, 0], [-22.5, 1], [-14.7, 2]] as [number, number][]) { box(CX0 + 5.5, 0.2, z, 3.6, 1.0, 1.6, carM[m]); box(CX0 + 5.8, 1.2, z, 2, 0.6, 1.5, glassDark); col(CX0 + 5.5, z, 3.6, 1.6); }
    flat(CX0 + 16, -20, 12, 22, lam({ map: rep(grassT, 8, 14) }), 0.006);
    flat(CX0 + 16, -20, 2.2, 22, lam({ map: rep(dirtT, 2, 12) }), 0.01);
    for (const [x, z] of [[CX0 + 12, -28], [CX0 + 20, -26], [CX0 + 12.5, -17], [CX0 + 20.5, -14], [CX0 + 13, -11], [CX0 + 19, -21]] as [number, number][]) tree(x, z, 1);
    bench(CX0 + 14, -22, Math.PI / 2, '작은 공원 벤치에 앉기');
    bench(CX0 + 18.2, -18, -Math.PI / 2, '작은 공원 벤치에 앉기');
    // drinking fountain
    const stone = lam({ color: 0xa8a49b });
    box(CX0 + 16, 0, -25, 0.5, 0.8, 0.5, stone); box(CX0 + 16, 0.8, -25, 0.8, 0.12, 0.8, stone); mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), poleMat, CX0 + 16, 1.0, -25);
    col(CX0 + 16, -25, 0.8, 0.8);
    fillBlock(CX0 + 22.5, 66, -33, -10, 6, 14);

    // Fujimigawa Park (富士見川公園): the playground — gravel, blue A-frame swings, iron bars, red pipe fences
    const FZ0 = -60, FZ1 = IZ - 3.8, FX1 = CX0 + 22;
    flat((CX0 + FX1) / 2, (FZ0 + FZ1) / 2, FX1 - CX0, FZ1 - FZ0, lam({ map: rep(gravelT, 12, 10) }), 0.006);
    flat(CX0 + 1.2, (FZ0 + FZ1) / 2, 2.4, FZ1 - FZ0, lam({ map: rep(grassT, 2, 10) }), 0.008);
    flat(FX1 - 1.2, (FZ0 + FZ1) / 2, 2.4, FZ1 - FZ0, lam({ map: rep(grassT, 2, 10) }), 0.008);
    const blue = lam({ color: 0x2f6fc4 }), yel = lam({ color: 0xe0b72c }), pipeRed = lam({ color: 0xc8333a }), mat = lam({ color: 0x4f8a4a });
    {
      // swings: two A-frames, a yellow top beam, four seats on chains, green mats underneath
      const sx = CX0 + 11, sz = -50, L = 6.4, Hs = 3.2;
      for (const ex of [-L / 2, L / 2]) for (const ez of [-1, 1]) {
        const leg = mesh(new THREE.CylinderGeometry(0.07, 0.07, Hs / Math.cos(0.32), 8), blue, sx + ex, Hs / 2, sz + ez * Math.tan(0.32) * Hs / 2); leg.rotation.x = ez * 0.32;
      }
      const beam = mesh(new THREE.CylinderGeometry(0.08, 0.08, L, 8), yel, sx, Hs, sz); beam.rotation.z = Math.PI / 2;
      const chain = lam({ color: 0x3a3a3a });
      for (let i = 0; i < 4; i++) {
        const x = sx - L / 2 + 0.9 + i * 1.53;
        for (const dx of [-0.18, 0.18]) mesh(new THREE.CylinderGeometry(0.012, 0.012, Hs - 0.55, 4), chain, x + dx, (Hs + 0.55) / 2, sz);
        box(x, 0.5, sz, 0.5, 0.05, 0.22, blue);
      }
      flat(sx - 1.6, sz, 2.6, 2.2, mat, 0.012); flat(sx + 1.6, sz, 2.6, 2.2, mat, 0.012);
      col(sx, sz, L + 0.4, 2.4);
      SEATS.push({ zone: 'alley', at: [YO.x + sx - L / 2 + 0.9, YO.z + sz + 0.6], r: 1.0, label: '그네 타기', seat: { y: 0.55, rot: 0, pose: 'sit', exit: [YO.x + sx - L / 2 + 0.9, YO.z + sz + 1.6] } } as Spot);
      // red pipe fences with yellow caps around the swings
      function fence(x0: number, z0: number, x1: number, z1: number) {
        const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
        const r = mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 6), pipeRed, (x0 + x1) / 2, 0.75, (z0 + z1) / 2); r.rotation.x = Math.PI / 2; r.rotation.y = ang; r.rotation.order = 'YXZ';
        const n = Math.max(1, Math.round(len / 2.2));
        for (let i = 0; i <= n; i++) { const px = x0 + (x1 - x0) * i / n, pz = z0 + (z1 - z0) * i / n; mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), pipeRed, px, 0.375, pz); mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.1, 6), yel, px, 0.78, pz); }
        col((x0 + x1) / 2, (z0 + z1) / 2, Math.max(0.15, Math.abs(x1 - x0)), Math.max(0.15, Math.abs(z1 - z0)));
      }
      fence(sx - L / 2 - 1.5, sz - 2.6, sx - 1, sz - 2.6); fence(sx + 1, sz - 2.6, sx + L / 2 + 1.5, sz - 2.6);
      fence(sx - L / 2 - 1.5, sz + 2.6, sx - 2, sz + 2.6); fence(sx + 2, sz + 2.6, sx + L / 2 + 1.5, sz + 2.6);
      fence(sx - L / 2 - 1.5, sz - 2.6, sx - L / 2 - 1.5, sz - 0.6);
      fence(CX0 + 3, FZ1 - 1.5, CX0 + 9, FZ1 - 1.5);
      // iron bars (three heights)
      for (let i = 0; i < 3; i++) {
        const bx = CX0 + 17 + i * 1.3, bh = 0.9 + i * 0.3;
        mesh(new THREE.CylinderGeometry(0.05, 0.05, bh, 6), blue, bx - 0.6, bh / 2, -44); mesh(new THREE.CylinderGeometry(0.05, 0.05, bh, 6), blue, bx + 0.6, bh / 2, -44);
        const bar = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), steel, bx, bh, -44); bar.rotation.z = Math.PI / 2;
      }
      col(CX0 + 18.3, -44, 3.8, 0.3);
      // blue fence at the north end, the sign, benches and the big trees round the edge
      box((CX0 + FX1) / 2, 0, FZ0 + 0.4, FX1 - CX0 - 6, 1.1, 0.08, blue); col((CX0 + FX1) / 2, FZ0 + 0.4, FX1 - CX0 - 6, 0.2);
      const fT = canvasTex(80, 24, (g) => { g.fillStyle = '#e9e3d2'; g.fillRect(0, 0, 80, 24); g.fillStyle = '#2f4a2f'; g.font = 'bold 11px serif'; g.fillText('富士見川公園', 4, 16); });
      box(CX0 + 0.6, 0, FZ1 - 0.8, 0.15, 1.2, 0.15, wood); const fs = mesh(new THREE.PlaneGeometry(2.4, 0.72), lam({ map: fT }), CX0 + 0.72, 1.5, FZ1 - 0.8); fs.rotation.y = -Math.PI / 2;
      bench(CX0 + 4, -55, 0, '富士見川公園 벤치에 앉기');
      for (const [x, z, s] of [[CX0 + 1.4, -58, 1.3], [CX0 + 1.4, -47, 1.1], [FX1 - 1.3, -56, 1.3], [FX1 - 1.3, -46, 1.2], [CX0 + 7, -59, 1], [FX1 - 6, -59, 1.1]] as [number, number, number][]) tree(x, z, s);
    }
    fillBlock(FX1 + 1, 68, -66, -41.5, 6, 14);
    // HOTEL MYSTAYS by the river, east of the park chain
    building(78, -58, 14, 14, 33.6, { base: '#e7e4dc', kind: 'office' });
    const hT = canvasTex(32, 256, (g) => { g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, 32, 256); g.fillStyle = '#c8326e'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; 'MYSTAYS'.split('').forEach((c, i) => g.fillText(c, 16, 30 + i * 32)); });
    const hs = mesh(new THREE.PlaneGeometry(1.2, 9.6), new THREE.MeshBasicMaterial({ map: hT }), 70.9, 24, -54); hs.rotation.y = -Math.PI / 2;
    fillBlock(84.5, 92, -66, -41.5);

    // the open plaza between the playground and the river, with the footbridge at its end
    flat((CX0 + FX1) / 2, (RZ1 + 4.4 + FZ0) / 2, FX1 - CX0, FZ0 - RZ1 - 4.4, lam({ map: rep(paveT, 12, 4) }), 0.008);
    for (const [x, z] of [[CX0 + 3, -63.5], [FX1 - 3, -63], [CX0 + 12, -62]] as [number, number][]) tree(x, z, 1.1);
    bench(CX0 + 7, -61.5, Math.PI, '광장 벤치에 앉기');
  }

  // ---------- the Ōoka River: water below the street, stone banks, railings, trees ----------
  const BRIDGES = [{ x: -35, w: 6, kind: 'stone' }, { x: CX0 + 6, w: 3, kind: 'steel' }, { x: 75, w: 12, kind: 'stone' }];
  {
    const waterT = canvasTex(64, 64, (g, w, h) => { speckle(g, w, h, '#3f6f74', 0.12, 0.4); g.strokeStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 18; i++) { const y = rnd() * h, x = rnd() * w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 + rnd() * 10, y); g.stroke(); } });
    flat(0, (RZ0 + RZ1) / 2, 200, RZ1 - RZ0, lam({ map: rep(waterT, 30, 2) }), -1.7);
    const wallT = canvasTex(32, 16, (g, w, h) => { speckle(g, w, h, '#9b968b', 0.18, 0.6); g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < 16; y += 4) g.fillRect(0, y, 32, 1); });
    const wallM = lam({ map: rep(wallT, 40, 1) });
    for (const z of [RZ0, RZ1]) { const m = mesh(new THREE.PlaneGeometry(200, 1.8), wallM, 0, -0.85, z); m.rotation.y = z === RZ1 ? Math.PI : 0; }
    pave(0, RZ1 + 2.2, 184, 4.4); pave(0, RZ0 - 2.6, 184, 5.2);
    const rail = lam({ color: 0x6d7a72 });
    const gaps = BRIDGES.map((b) => [b.x - b.w / 2, b.x + b.w / 2]).sort((a, b) => a[0] - b[0]);
    let x0 = -100;
    for (const [g0, g1] of [...gaps, [100, 100]]) {
      if (g0 > x0) {
        col((x0 + g0) / 2, (RZ0 + RZ1) / 2, g0 - x0, RZ1 - RZ0);
        for (const z of [RZ1 - 0.15, RZ0 + 0.15]) {
          box((x0 + g0) / 2, 1.0, z, g0 - x0, 0.08, 0.08, rail);
          for (let px = x0 + 1; px < g0; px += 2) box(px, 0, z, 0.08, 1.05, 0.08, rail);
        }
      }
      x0 = g1;
    }
    for (let x = -88; x <= 88; x += 7) {
      if (BRIDGES.some((b) => Math.abs(x - b.x) < b.w / 2 + 2)) continue;
      tree(x, RZ1 + 1.6, 0.95); tree(x + 3.5, RZ0 - 1.8, 0.95);
    }
    for (const b of BRIDGES) {
      const span = RZ1 - RZ0 + 0.6;
      box(b.x, -0.35, (RZ0 + RZ1) / 2, b.w, 0.35, span, b.kind === 'steel' ? lam({ map: rep(paveT, 2, 8) }) : lam({ map: rep(asphaltT, b.w / 2, 6) }));
      const side = b.kind === 'steel' ? lam({ color: 0x4f8a6a }) : lam({ color: 0xb8b2a6 });
      for (const sx of [-1, 1]) {
        const xx = b.x + sx * (b.w / 2 - 0.12);
        box(xx, 0, (RZ0 + RZ1) / 2, 0.24, b.kind === 'steel' ? 1.15 : 0.9, span, side);
        col(xx, (RZ0 + RZ1) / 2, 0.24, span);
        if (b.kind === 'steel') for (let k = 0; k < 4; k++) { const a = mesh(new THREE.BoxGeometry(0.16, 0.16, 3.2), side, xx, 1.7, RZ0 + 1.5 + k * 3); a.rotation.x = k % 2 ? 0.5 : -0.5; }
      }
    }
    // Shiroganejindo footbridge name plate
    const nT = canvasTex(64, 16, (g) => { g.fillStyle = '#e9e3d2'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#2f4a2f'; g.font = 'bold 10px serif'; g.fillText('白金人道橋', 6, 12); });
    mesh(new THREE.PlaneGeometry(1.6, 0.4), lam({ map: nT }), CX0 + 6 - 1.75, 1.0, RZ1 + 0.4).rotation.y = -Math.PI / 2;
  }
  // north of the river: a road, the Keikyu viaduct with a red train, and a row of buildings
  road(0, RZ0 - 7.6, 184, 5);
  {
    const vz = RZ0 - 16;
    const viaduct = lam({ color: 0xb4afa4 });
    box(0, 6.5, vz, 184, 1.1, 6, viaduct, true);
    for (let x = -90; x <= 90; x += 12) { box(x - 2.2, 0, vz, 0.9, 6.5, 0.9, viaduct, true); box(x + 2.2, 0, vz, 0.9, 6.5, 0.9, viaduct, true); }
    const trainT = canvasTex(64, 16, (g) => { g.fillStyle = '#c4272d'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#efe9df'; g.fillRect(0, 9, 64, 2); g.fillStyle = '#2d3640'; for (let x = 3; x < 64; x += 8) g.fillRect(x, 2, 6, 5); });
    const tr = lam({ color: 0xc4272d }), trTop = lam({ color: 0xb7b2a8 }), trSide = lam({ map: trainT });
    for (let i = 0; i < 4; i++) box(-30 + i * 18.4, 7.6, vz, 18, 3, 2.8, [tr, tr, trTop, trTop, trSide, trSide], true);
    fillBlock(-90, 68, vz - 18, vz - 4, 10, 26);
  }

  // street lamps follow the alley's lamp level (evening / night)
  const prevLamps = G.applyLamps;
  G.applyLamps = (lv: number) => { prevLamps && prevLamps(lv); for (const h of lampHeads) h.material = lv > 0 ? lampOn : lampOff; };

  // ---------- getting here and home ----------
  function go() {
    if (S.riding) { toast('차에서 내린 다음에 가자.'); return; }
    G.setUi({ fading: true });
    setTimeout(() => {
      S.zone = 'alley'; S.area = 'yokohama'; S.seat = null; S.seatY = 0; G.setPose('stand');
      for (const g of G.wallGroups) g.visible = true;
      // out of the front door, facing the road (north); the camera looks back at the house from the road
      char.position.set(YO.x + DOOR.x, 0, YO.z + DOOR.z - 1.4); char.rotation.y = Math.PI; S.camYaw = Math.PI + 0.35; S.camDist = 7; S.walkPitch.alley = 0.3;
      G.applyTime(S.timeIdx);
      G.setUi({ fading: false });
      toast('요시노초. 오늘은 공원 지나 오오카강까지 걸어 볼까.');
    }, 280);
  }
  G.SPOTS.push({ zone: 'alley', at: [YO.x + DOOR.x, YO.z + DOOR.z - 0.6], r: 1.3, label: '집에 들어가기', act: () => G.goZone('house') } as Spot);
  for (const s of SEATS) G.SPOTS.push(s);
  G.yokohama = { root, go, origin: YO };
}
