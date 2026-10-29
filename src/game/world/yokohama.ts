// Yokohama (Yoshinocho → Bandobashi, Minami-ku): souka's real neighbourhood, drawn from the map.
// Compressed and straightened so it is quick to walk: Route 21 runs along the x axis (east = +x),
// the Ōoka River runs parallel to it to the north (-z), the linear park sits between them, and
// Bandobashi Park lies south-east under the curving expressway. Home is STUDIO Z (black and red, 6 floors)
// on the north side of Route 21, with the MaxValu tower right across the road.
import * as THREE from 'three';
import type { Game, Spot } from '../types';

/** World offset of this place (far to the west, out of sight of the alley and the house). */
export const YO = { x: -600, z: 0 };
const BOUNDS = { x0: -92, x1: 92, z0: -77, z1: 56 };
/** Souka's front door (local x / z). */
const DOOR = { x: -6, z: -10.6 };

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
  function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, occ = false) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); root.add(m); if (occ) occluders.push(m); return m;
  }
  function flat(x: number, z: number, w: number, d: number, mat: THREE.Material, y = 0, rot = 0) {
    const m = mesh(new THREE.PlaneGeometry(w, d), mat, x, y, z); m.rotation.x = -Math.PI / 2; m.rotation.z = rot; return m;
  }
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], occ = false) =>
    mesh(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, occ);

  // ---------- ground, roads, pavements ----------
  const asphaltT = canvasTex(64, 64, (g, w, h) => { speckle(g, w, h, '#58554f', 0.2, 0.7); g.fillStyle = 'rgba(0,0,0,.16)'; for (let i = 0; i < 6; i++) g.fillRect(rnd() * w | 0, rnd() * h | 0, 4 + rnd() * 10 | 0, 1); });
  const paveT = canvasTex(32, 32, (g, w, h) => { speckle(g, w, h, '#b9b5ac', 0.14, 0.5); g.fillStyle = 'rgba(0,0,0,.13)'; for (let i = 0; i < 32; i += 8) { g.fillRect(0, i, 32, 1); g.fillRect(i, 0, 1, 32); } });
  const grassT = canvasTex(32, 32, (g, w, h) => speckle(g, w, h, '#6f8a4c', 0.3, 0.7));
  const dirtT = canvasTex(32, 32, (g, w, h) => speckle(g, w, h, '#b9a785', 0.2, 0.6));
  const groundT = canvasTex(32, 32, (g, w, h) => speckle(g, w, h, '#8a857a', 0.25, 0.7));
  // (no ground over the river: it sits in a channel below the street)
  flat(0, 3.5, 200, 123, lam({ map: rep(groundT, 60, 37) }), -0.02);
  flat(0, -84, 200, 28, lam({ map: rep(groundT, 60, 9) }), -0.02);
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

  // Route 21 (Kamakura-kaido) — the big road in front of home: 4 lanes, wide pavements with trees
  road(0, 0, 184, 13);
  pave(0, -8.3, 184, 3.6); pave(0, 8.3, 184, 3.6);
  for (const z of [-6.3, 6.3]) line(0, z, 184, 0.15);
  line(0, -0.12, 184, 0.12, yellow); line(0, 0.12, 184, 0.12, yellow);
  for (let x = -90; x < 90; x += 8) for (const z of [-3.2, 3.2]) line(x, z, 4, 0.12);
  // cross streets (north to the river, south past the parks)
  const STREETS = [{ x: -35, w: 6, z0: -58, z1: -6.5 }, { x: 20, w: 8, z0: -58, z1: -6.5 }, { x: 70, w: 12, z0: -110, z1: 56 }, { x: -60, w: 6, z0: 6.5, z1: 56 }];
  for (const s of STREETS) {
    road(s.x, (s.z0 + s.z1) / 2, s.w, s.z1 - s.z0);
    for (const sx of [-1, 1]) line(s.x + sx * (s.w / 2 - 0.3), (s.z0 + s.z1) / 2, 0.12, s.z1 - s.z0);
  }
  // Isesakicho street, between Route 21 and the river
  road(0, -34, 184, 6);
  for (const z of [-37.3, -30.7]) pave(0, z, 184, 0.9);
  // crossings
  crosswalk(-6, 0, 'x', 12.4);            // in front of home → MaxValu
  for (const s of STREETS) { crosswalk(s.x, s.x === -60 ? 8.3 : -8.3, 'z', s.w - 0.6); }
  crosswalk(20, 0, 'x', 12.4); crosswalk(70, 0, 'x', 12.4);

  // ---------- buildings ----------
  // window tile = one floor (2.8 m) × one bay (3.2 m)
  function aptTex(base: string, lit: boolean, kind: 'flat' | 'balcony' | 'office' = 'flat', stripe?: string) {
    return canvasTex(32, 32, (g, w, h) => {
      speckle(g, w, h, base, 0.12, 0.5);
      if (stripe) { g.fillStyle = stripe; g.fillRect(0, 0, 6, 32); }
      if (kind === 'balcony') {
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 2, 32, 16);
        g.fillStyle = lit && rnd() < 0.5 ? '#e8d495' : '#55606a'; g.fillRect(8, 4, 18, 12);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 18, 32, 9);   // balcony slab front
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
  /** A building box; the faces get floor/bay tiled windows and swap to lit windows at night. */
  function building(x: number, z: number, w: number, d: number, h: number, opts: { base?: string; kind?: 'flat' | 'balcony' | 'office'; stripe?: string } = {}) {
    const base = opts.base || pick(WALLS), kind = opts.kind || pick(['flat', 'flat', 'balcony', 'office'] as const);
    const day = aptTex(base, false, kind, opts.stripe), night = aptTex(base, true, kind, opts.stripe);
    const mats: THREE.Material[] = [];
    for (const [a, b] of [[d, h], [d, h], [0, 0], [0, 0], [w, h], [w, h]]) {
      if (!a) { mats.push(roofMat); continue; }
      const m = lam({ map: rep(day, a / 3.2, b / 2.8) });
      G.buildingMats.push({ m, day: m.map, night: rep(night, a / 3.2, b / 2.8) });
      mats.push(m);
    }
    box(x, 0, z, w, h, d, mats, true);
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

  // ---------- home: STUDIO Z (black with red frames) and its neighbours ----------
  const black = lam({ color: 0x26272a }), red = lam({ color: 0xc23a33 }), steel = lam({ color: 0x8c9196 }), glassDark = lam({ color: 0x2f3a44 });
  {
    const hx0 = -8, hx1 = -2, hz0 = -21, hz1 = -10.5, H = 17, cx = (hx0 + hx1) / 2, cz = (hz0 + hz1) / 2;
    box(cx, 0, cz, hx1 - hx0, H, hz1 - hz0, black, true); col(cx, cz, hx1 - hx0, hz1 - hz0);
    box(cx, H, cz, hx1 - hx0 + 0.2, 0.3, hz1 - hz0 + 0.2, black, true);
    const fz = hz1 + 0.15;
    // red frames, each around two floors of balconies
    for (const [y0, y1] of [[2.9, 8.5], [8.5, 14.1], [14.1, 17]]) {
      const t = 0.42;
      box(cx, y0, fz, hx1 - hx0, t, 0.35, red); box(cx, y1 - t, fz, hx1 - hx0, t, 0.35, red);
      box(hx0 + t / 2, y0, fz, t, y1 - y0, 0.35, red); box(hx1 - t / 2, y0, fz, t, y1 - y0, 0.35, red);
    }
    // balconies: dark glass behind a steel railing on every floor above the ground
    for (let f = 1; f < 6; f++) {
      const y = f * 2.8 + 0.2;
      box(cx, y + 0.3, hz1 - 0.05, hx1 - hx0 - 1, 2.1, 0.05, glassDark);
      box(cx, y, hz1 + 0.05, hx1 - hx0 - 1, 1.0, 0.06, steel);
    }
    // entrance
    box(cx - 1, 0, hz1 + 0.03, 1.6, 2.3, 0.05, glassDark);
    box(cx - 1, 2.3, hz1 + 0.2, 2.2, 0.15, 0.6, black);
    // stair tower with the vertical "STUDIO Z" sign
    const tower = new THREE.Group(); tower.position.set(hx1 + 0.7, 0, hz1 - 1.6); root.add(tower);
    const lattice = canvasTex(16, 16, (g) => { g.fillStyle = '#1d1e20'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#3c3e42'; for (let i = 0; i < 16; i += 4) { g.fillRect(i, 0, 1, 16); g.fillRect(0, i, 16, 1); } });
    const tw = new THREE.Mesh(new THREE.BoxGeometry(1.4, H + 1, 3.2), lam({ map: rep(lattice, 2, 24) })); tw.position.y = (H + 1) / 2; tower.add(tw); occluders.push(tw);
    const signT = canvasTex(32, 256, (g) => {
      g.fillStyle = '#1d1e20'; g.fillRect(0, 0, 32, 256); g.fillStyle = '#e9e5dc'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center';
      'STUDIO Z'.split('').forEach((c, i) => { g.save(); g.translate(16, 22 + i * 30); g.fillText(c, 0, 9); g.restore(); });
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 8.8), new THREE.MeshBasicMaterial({ map: signT }));
    sign.position.set(0, 10.5, 1.62); tower.add(sign);
    col(hx1 + 0.7, hz1 - 1.6, 1.4, 3.2);
    // hedge and the green utility box in front
    const hedge = lam({ color: 0x55783f });
    box(cx + 1.5, 0, -9.7, 3, 0.7, 0.8, hedge); col(cx + 1.5, -9.7, 3, 0.8);
    box(cx - 3.4, 0, -9.6, 0.9, 1.3, 0.6, lam({ color: 0x9fb7a3 })); col(cx - 3.4, -9.6, 0.9, 0.6);
  }
  // left: a little white stamp shop (松井印店) with its vertical sign, a low beige house, a building under scaffold sheets
  building(-10.3, -14.5, 4, 8, 7.5, { base: '#e8e6e0', kind: 'flat' });
  {
    const t = canvasTex(32, 192, (g) => { g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, 32, 192); g.strokeStyle = '#2d4f8a'; g.lineWidth = 2; g.strokeRect(2, 2, 28, 188); g.fillStyle = '#2d4f8a'; g.font = 'bold 22px serif'; g.textAlign = 'center'; '松井印店'.split('').forEach((c, i) => g.fillText(c, 16, 36 + i * 42)); });
    const s = mesh(new THREE.BoxGeometry(0.7, 3.6, 0.25), [lam({ color: 0xf2f0ea }), lam({ color: 0xf2f0ea }), lam({ color: 0xf2f0ea }), lam({ color: 0xf2f0ea }), lam({ map: t }), lam({ map: t })], -8.9, 4.2, -10.2);
    void s;
  }
  building(-14.8, -15, 4.4, 9, 9, { base: '#cdb79b', kind: 'flat' });
  {
    const sheetT = canvasTex(32, 32, (g, w, h) => { speckle(g, w, h, '#a7aaa8', 0.16, 0.5); g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < 32; y += 8) g.fillRect(0, y, 32, 1); for (let x = 0; x < 32; x += 11) g.fillRect(x, 0, 1, 32); });
    const sm = lam({ map: rep(sheetT, 4, 8) });
    box(-23, 0, -17, 11, 26, 12, sm, true); col(-23, -17, 11, 12);
  }
  // right: beige block with a CENTURY 21 office on the ground floor
  building(3.3, -16, 6.4, 11, 24, { base: '#d9cdb8', kind: 'flat' });
  {
    const t = canvasTex(64, 16, (g) => { g.fillStyle = '#16161a'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#c9a94e'; g.font = 'bold 9px sans-serif'; g.fillText('CENTURY 21', 5, 11); });
    box(3.3, 0, -10.38, 6, 2.6, 0.12, glassDark);
    mesh(new THREE.PlaneGeometry(4, 1), lam({ map: t }), 3.3, 3.1, -10.3);
  }
  fillBlock(9, 16, -30, -10.5, 8, 20);
  fillBlock(-90, -38.5, -30, -10.5);
  fillBlock(-31.5, -28.5, -30, -10.5, 8, 14);
  // under the expressway the buildings stay low
  fillBlock(24.5, 41, -30, -10.5);
  fillBlock(41, 54, -30, -10.5, 5.6, 8.4);
  fillBlock(54, 63.5, -30, -10.5, 5.6, 8.4);
  fillBlock(76.5, 92, -30, -10.5, 5.6, 8.4);

  // ---------- across the road: the MaxValu tower and its striped neighbour (the view from home) ----------
  {
    const brownT = canvasTex(32, 32, (g, w, h) => { speckle(g, w, h, '#8d7a68', 0.12, 0.6); g.fillStyle = '#6f5f51'; g.fillRect(0, 18, 32, 10); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 17, 32, 1); g.fillStyle = '#4f565d'; g.fillRect(6, 3, 20, 13); });
    const brownN = canvasTex(32, 32, (g, w, h) => { speckle(g, w, h, '#8d7a68', 0.12, 0.6); g.fillStyle = '#6f5f51'; g.fillRect(0, 18, 32, 10); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 17, 32, 1); g.fillStyle = rnd() < 0.5 ? '#e5d193' : '#4f565d'; g.fillRect(6, 3, 20, 13); });
    const w = 20, d = 14, h = 40, x = -15, z = 19.5;
    const mats: THREE.Material[] = [];
    for (const [a, b] of [[d, h], [d, h], [0, 0], [0, 0], [w, h], [w, h]]) {
      if (!a) { mats.push(roofMat); continue; }
      const m = lam({ map: rep(brownT, a / 3.2, b / 2.8) }); G.buildingMats.push({ m, day: m.map, night: rep(brownN, a / 3.2, b / 2.8) }); mats.push(m);
    }
    box(x, 4.5, z + 0.5, w, h - 4.5, d, mats, true); col(x, z, w + 2, d + 1);
    // shop floor: brown tiles, green awnings, the red MaxValu sign and HottoMotto at the end
    const podT = canvasTex(32, 16, (g, w2, h2) => speckle(g, w2, h2, '#7b6858', 0.12, 0.6));
    box(x, 0, z, w + 2, 4.5, d + 1, lam({ map: rep(podT, 6, 1) }), true);
    box(x, 0, z - (d + 1) / 2 - 0.02, w - 1, 2.6, 0.05, glassDark);
    const awn = lam({ color: 0x2f7a5a });
    for (let i = 0; i < 4; i++) { const a = box(x - 7.5 + i * 5, 2.7, z - (d + 1) / 2 - 0.55, 4.4, 0.5, 1.1, awn); a.rotation.x = 0.25; }
    const mvT = canvasTex(64, 24, (g) => { g.fillStyle = '#c8324a'; g.fillRect(0, 0, 64, 24); g.fillStyle = '#fff'; g.font = 'bold italic 12px sans-serif'; g.fillText('MaxValu', 6, 15); g.font = '6px sans-serif'; g.fillText('AEON', 48, 8); });
    mesh(new THREE.PlaneGeometry(3.6, 1.35), lam({ map: mvT }), x - 3, 3.6, z - (d + 1) / 2 - 0.04).rotation.y = Math.PI;
    const hmT = canvasTex(64, 16, (g) => { g.fillStyle = '#3a1c14'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#e9c46a'; g.font = 'bold 8px sans-serif'; g.fillText('HottoMotto', 6, 11); });
    mesh(new THREE.PlaneGeometry(3, 0.75), lam({ map: hmT }), x + 7.5, 3.6, z - (d + 1) / 2 - 0.04).rotation.y = Math.PI;
    // striped tower next door (beige with brown-red stripes)
    building(5.5, 20, 13, 13, 30.8, { base: '#cbbba7', kind: 'balcony', stripe: '#8e5747' });
  }
  fillBlock(-90, -63.5, 10.5, 55);
  fillBlock(-56.5, -27, 10.5, 30);
  fillBlock(-56.5, -27, 33, 55, 6, 18);
  fillBlock(13, 26, 10.5, 55, 8, 26);
  fillBlock(26, 38, 10.5, 55, 5.6, 8.4);
  fillBlock(76.5, 92, 10.5, 55);

  // ---------- trees, lamps, poles ----------
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
  function streetLamp(x: number, z: number, dir: number) {
    mesh(new THREE.CylinderGeometry(0.08, 0.11, 6.2, 6), poleMat, x, 3.1, z);
    const arm = mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6), poleMat, x, 6.1, z + dir * 0.8); void arm;
    lampHeads.push(mesh(new THREE.BoxGeometry(0.35, 0.12, 0.6), lampOff, x, 6.0, z + dir * 1.5));
    col(x, z, 0.25, 0.25);
  }
  for (let x = -86; x <= 86; x += 12) {
    if (Math.abs(x + 35) < 4 || Math.abs(x - 20) < 5 || Math.abs(x - 70) < 7) continue;
    tree(x + 4, -8.9, 0.8); tree(x + 4, 8.9, 0.8);
    streetLamp(x, -7.0, 1); streetLamp(x + 6, 7.0, -1);
  }
  // traffic lights at the big crossings
  const sigMat = lam({ color: 0x3a3d40 });
  for (const [x, z, r] of [[16, -7.2, 0], [24.5, 7.2, Math.PI], [63.5, -7.2, 0], [76.5, 7.2, Math.PI]] as [number, number, number][]) {
    mesh(new THREE.CylinderGeometry(0.09, 0.09, 5, 6), poleMat, x, 2.5, z);
    const head = mesh(new THREE.BoxGeometry(1.2, 0.4, 0.3), sigMat, x, 4.8, z + (r ? -0.6 : 0.6));
    for (let i = 0; i < 3; i++) mesh(new THREE.CircleGeometry(0.12, 10), new THREE.MeshBasicMaterial({ color: [0x3fae5a, 0xd9b444, 0xc23a33][i] }), x - 0.38 + i * 0.38, 4.8, head.position.z + (r ? -0.16 : 0.16)).rotation.y = r;
    col(x, z, 0.25, 0.25);
  }

  // ---------- the Ōoka River: water below the street, stone banks, railings, cherry trees ----------
  const RZ0 = -70, RZ1 = -58;    // water from bank to bank
  const BRIDGES = [{ x: -35, w: 5, kind: 'steel' }, { x: 20, w: 8, kind: 'stone' }, { x: 70, w: 12, kind: 'stone' }];
  {
    const waterT = canvasTex(64, 64, (g, w, h) => { speckle(g, w, h, '#3f6f74', 0.12, 0.4); g.strokeStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 18; i++) { const y = rnd() * h, x = rnd() * w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 + rnd() * 10, y); g.stroke(); } });
    const water = flat(0, (RZ0 + RZ1) / 2, 200, RZ1 - RZ0, lam({ map: rep(waterT, 30, 2) }), -1.7);
    G.yokoWater = water;
    const wallT = canvasTex(32, 16, (g, w, h) => { speckle(g, w, h, '#9b968b', 0.18, 0.6); g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < 16; y += 4) g.fillRect(0, y, 32, 1); });
    const wallM = lam({ map: rep(wallT, 40, 1) });
    for (const z of [RZ0, RZ1]) { const m = mesh(new THREE.PlaneGeometry(200, 1.8), wallM, 0, -0.85, z); m.rotation.y = z === RZ1 ? Math.PI : 0; }
    // north bank promenade and the trees along both banks
    pave(0, RZ1 + 2.2, 184, 4.4); pave(0, RZ0 - 2.6, 184, 5.2);
    const rail = lam({ color: 0x6d7a72 });
    // the water itself can't be walked on: colliders between the bridges
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
    // bridges
    for (const b of BRIDGES) {
      box(b.x, -0.35, (RZ0 + RZ1) / 2, b.w, 0.35, RZ1 - RZ0 + 0.6, lam({ map: rep(asphaltT, b.w / 2, 6) }));
      const side = b.kind === 'steel' ? lam({ color: 0x4f8a6a }) : lam({ color: 0xb8b2a6 });
      for (const sx of [-1, 1]) {
        const xx = b.x + sx * (b.w / 2 - 0.15);
        box(xx, 0, (RZ0 + RZ1) / 2, 0.3, b.kind === 'steel' ? 1.1 : 0.9, RZ1 - RZ0 + 0.6, side);
        col(xx, (RZ0 + RZ1) / 2, 0.3, RZ1 - RZ0 + 0.6);
        if (b.kind === 'steel') for (let k = 0; k < 4; k++) { const a = mesh(new THREE.BoxGeometry(0.2, 0.2, 3.2), side, xx, 1.6, RZ0 + 1.5 + k * 3); a.rotation.x = k % 2 ? 0.5 : -0.5; }
      }
    }
    // cross streets from the river to Isesakicho street
    for (const s of [{ x: -35, w: 6 }, { x: 20, w: 8 }]) road(s.x, -47.5, s.w, 21);
  }
  // north of the river: a road, the Keikyu viaduct with a red train, and a row of buildings
  road(0, -78, 184, 5);
  {
    const viaduct = lam({ color: 0xb4afa4 });
    const deck = box(0, 6.5, -86, 184, 1.1, 6, viaduct, true); void deck;
    for (let x = -90; x <= 90; x += 12) { box(x - 2.2, 0, -86, 0.9, 6.5, 0.9, viaduct, true); box(x + 2.2, 0, -86, 0.9, 6.5, 0.9, viaduct, true); }
    const trainT = canvasTex(64, 16, (g) => { g.fillStyle = '#c4272d'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#efe9df'; g.fillRect(0, 9, 64, 2); g.fillStyle = '#2d3640'; for (let x = 3; x < 64; x += 8) g.fillRect(x, 2, 6, 5); });
    for (let i = 0; i < 4; i++) box(-30 + i * 18.4, 7.6, -86, 18, 3, 2.8, [lam({ color: 0xc4272d }), lam({ color: 0xc4272d }), lam({ color: 0xb7b2a8 }), lam({ color: 0xb7b2a8 }), lam({ map: trainT }), lam({ map: trainT })], true);
    fillBlock(-90, 63.5, -104, -90, 10, 26);
  }

  // ---------- south bank blocks, the linear park and the hotel ----------
  fillBlock(-90, -38.5, -53.2, -37.5);
  fillBlock(-31.5, 16, -53.2, -37.5);
  {
    // linear park (green strip between the river walk and Isesakicho street)
    flat(29, -45.5, 9, 16, lam({ map: rep(grassT, 6, 11) }), 0.006);
    flat(29, -45.5, 2.4, 16, lam({ map: rep(dirtT, 2, 11) }), 0.01);
    for (let z = -52; z <= -40; z += 4) { tree(25.6, z, 0.85); tree(32.4, z + 2, 0.85); }
    const wood = lam({ color: 0x8b6a4a });
    for (const z of [-50, -43]) { box(30.6, 0.4, z, 0.5, 0.08, 1.8, wood); box(30.6, 0, z, 0.4, 0.4, 0.15, poleMat); col(30.6, z, 0.6, 1.8); }
    G.SPOTS.push({ zone: 'alley', at: [YO.x + 30.1, YO.z - 50], label: '공원 벤치에 앉기', seat: { y: 0.48, rot: Math.PI / 2, pose: 'sit', exit: [YO.x + 29.2, YO.z - 50] } } as Spot);
    // HOTEL MYSTAYS
    building(46, -45.5, 14, 14, 33.6, { base: '#e7e4dc', kind: 'office' });
    const hT = canvasTex(32, 256, (g) => { g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, 32, 256); g.fillStyle = '#c8326e'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; 'MYSTAYS'.split('').forEach((c, i) => g.fillText(c, 16, 30 + i * 32)); });
    mesh(new THREE.PlaneGeometry(1.2, 9.6), new THREE.MeshBasicMaterial({ map: hT }), 38.9, 24, -40).rotation.y = -Math.PI / 2;
    fillBlock(54.5, 63.5, -53.2, -37.5, 5.6, 8.4);
    fillBlock(76.5, 92, -53.2, -37.5, 8, 20);
  }

  // ---------- Bandobashi Park and the expressway curving over it ----------
  {
    flat(51.5, 32.5, 23, 44, lam({ map: rep(grassT, 14, 26) }), 0.006);
    // winding gravel path
    const path = lam({ map: rep(dirtT, 2, 2) });
    const pts = [[42, 12], [47, 20], [55, 26], [52, 36], [58, 45], [61, 54]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az);
      flat((ax + bx) / 2, (az + bz) / 2, 2.2, len + 1.6, path, 0.012, -Math.atan2(bx - ax, bz - az));
    }
    for (const [x, z, s] of [[43, 30, 1.2], [45, 42, 1.1], [49, 50, 1], [60, 16, 1.1], [62, 32, 1.2], [56, 40, 0.9], [44, 18, 0.9], [61, 22, 1], [52, 15, 0.8], [47, 35, 1]] as [number, number, number][]) tree(x, z, s);
    // a small playground: slide and a swing frame
    const toy = lam({ color: 0xd9a441 }), toy2 = lam({ color: 0x4f7fa8 });
    box(56, 0, 31, 1.2, 1.6, 1.2, toy2); const sl = box(56, 0.74, 33.3, 0.9, 0.12, 3.4, toy); sl.rotation.x = -0.5; col(56, 32, 1.4, 4);
    for (const sx of [-1, 1]) box(48 + sx * 1.6, 0, 26, 0.12, 2.4, 0.12, toy2);
    box(48, 2.4, 26, 3.4, 0.12, 0.12, toy2); box(48, 0.5, 26, 0.6, 0.06, 0.3, toy); col(48, 26, 3.6, 0.6);
    const wood = lam({ color: 0x8b6a4a });
    box(51, 0.42, 21, 1.8, 0.08, 0.5, wood); col(51, 21, 1.8, 0.6);
    G.SPOTS.push({ zone: 'alley', at: [YO.x + 51, YO.z + 21.4], label: '阪東橋公園 벤치에 앉기', seat: { y: 0.5, rot: 0, pose: 'sit', exit: [YO.x + 51, YO.z + 22.3] } } as Spot);
    const pT = canvasTex(64, 24, (g) => { g.fillStyle = '#e9e3d2'; g.fillRect(0, 0, 64, 24); g.fillStyle = '#2f4a2f'; g.font = 'bold 11px serif'; g.fillText('阪東橋公園', 4, 16); });
    box(42.5, 0, 11.5, 0.15, 1.2, 0.15, wood); mesh(new THREE.PlaneGeometry(2, 0.75), lam({ map: pT }), 42.5, 1.5, 11.6);
    // expressway: a deck on pillars, curving from the south-west over the park and away to the north-east
    const exp = lam({ color: 0xa9a59c }), expSide = lam({ color: 0x94a07a });
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(30, 9, 58), new THREE.Vector3(40, 9, 30), new THREE.Vector3(48, 9, 4), new THREE.Vector3(60, 9, -20), new THREE.Vector3(92, 9, -32)]);
    const N = 24;
    for (let i = 0; i < N; i++) {
      const a = curve.getPoint(i / N), b = curve.getPoint((i + 1) / N), len = a.distanceTo(b), ang = Math.atan2(b.x - a.x, b.z - a.z);
      const seg = mesh(new THREE.BoxGeometry(9, 1.2, len + 0.3), [exp, exp, exp, exp, exp, exp], (a.x + b.x) / 2, 9, (a.z + b.z) / 2, true); seg.rotation.y = ang;
      for (const sx of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(0.3, 1.1, len + 0.3), expSide, (a.x + b.x) / 2 + Math.cos(ang) * sx * 4.4, 10.15, (a.z + b.z) / 2 - Math.sin(ang) * sx * 4.4, true); w.rotation.y = ang; }
      if (i % 3 === 0) {
        const onRoad = Math.abs(a.z) < 7 || STREETS.some((s) => Math.abs(a.x - s.x) < s.w / 2 + 1) || (a.z > -38 && a.z < -30);
        if (!onRoad) { box(a.x, 0, a.z, 1.4, 8.4, 1.4, exp, true); col(a.x, a.z, 1.4, 1.4); }
      }
    }
    // subway entrances: Bandobashi (east) and Yoshinocho (west)
    const mT = (name: string) => canvasTex(64, 32, (g) => { g.fillStyle = '#1f5fa8'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#fff'; g.beginPath(); g.arc(12, 16, 9, 0, 7); g.fill(); g.fillStyle = '#1f5fa8'; g.font = 'bold 11px sans-serif'; g.fillText('B', 8, 20); g.fillStyle = '#fff'; g.font = 'bold 10px sans-serif'; g.fillText(name, 25, 20); });
    for (const [x, z, name] of [[82, 9.6, '阪東橋'], [-82, 9.6, '吉野町']] as [number, number, string][]) {
      box(x, 0, z + 1.6, 3, 2.6, 2.4, lam({ color: 0xcfd3d6 }), true); col(x, z + 1.6, 3, 2.4);
      mesh(new THREE.PlaneGeometry(2.2, 1.1), lam({ map: mT(name) }), x, 2.2, z + 0.38).rotation.y = Math.PI;
    }
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
      char.position.set(YO.x + DOOR.x, 0, YO.z + DOOR.z + 1.4); char.rotation.y = 0; S.camYaw = 0.35; S.camDist = 7; S.walkPitch.alley = 0.3;
      G.applyTime(S.timeIdx);
      G.setUi({ fading: false });
      toast('요시노초. 오늘은 오오카강 따라 걸어 볼까.');
    }, 280);
  }
  G.SPOTS.push({ zone: 'alley', at: [YO.x + DOOR.x, YO.z + DOOR.z + 0.6], r: 1.3, label: '집에 들어가기', act: () => G.goZone('house') } as Spot);
  G.yokohama = { root, go, origin: YO };
}
