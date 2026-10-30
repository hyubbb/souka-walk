// Kenney models: loading, the souka colour tone, spawning them as editable objects, seats, thumbnails,
// and the warehouse (take things out / put them away).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { EditObj, Game, Spot } from './types';
import { HX } from './core';
import { CATALOG, CATALOG_BY_ID, type CatalogItem } from './catalog';
import { HEAVY_URLS } from './heavyAssets';

// Every model file, as a URL (inlined as data: URLs in the single-file build).
const MODEL_URLS: Record<string, string> = {
  ...(import.meta.glob(['../assets/{kenney,pack2}/**/*.glb', '../assets/pack3/*.glb'], { query: '?url', import: 'default', eager: true }) as Record<string, string>),
  ...HEAVY_URLS,
};
const COLORMAPS = import.meta.glob('../assets/kenney/*/Textures/colormap.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const urlFor = (file: string) => MODEL_URLS[/^pack\d\//.test(file) ? `../assets/${file}.glb` : `../assets/kenney/${file}.glb`];
/** Catalog entries whose model is in this build (the single-file page leaves the heavy ones out). */
export const AVAILABLE = CATALOG.filter((c) => !!urlFor(c.file));

/** Models reduced without normals (to simplify further): rebuild them flat-shaded, low-poly style.
 *  Reads through getX() so interleaved attributes work (BufferGeometry.toNonIndexed in r128 does not). */
export function flatShade(g: THREE.BufferGeometry) {
  const idx = g.index, p = g.attributes.position, uv = g.attributes.uv, n = idx ? idx.count : p.count;
  const P = new Float32Array(n * 3), U = uv ? new Float32Array(n * 2) : null;
  for (let i = 0; i < n; i++) {
    const k = idx ? idx.getX(i) : i;
    P[i * 3] = p.getX(k); P[i * 3 + 1] = p.getY(k); P[i * 3 + 2] = p.getZ(k);
    if (U) { U[i * 2] = uv.getX(k); U[i * 2 + 1] = uv.getY(k); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  if (U) out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  for (const gr of g.groups) out.addGroup(gr.start, gr.count, gr.materialIndex);
  out.computeVertexNormals();
  return out;
}

/** One loader per kit, so "Textures/colormap.png" inside a city-kit model resolves to that kit's colormap. */
const loaders: Record<string, GLTFLoader> = {};
function loaderFor(kit: string) {
  if (!loaders[kit]) {
    const manager = new THREE.LoadingManager();
    const cmap = COLORMAPS[`../assets/kenney/${kit}/Textures/colormap.png`];
    if (cmap) manager.setURLModifier((url) => (/colormap\.png$/.test(url) ? cmap : url));
    loaders[kit] = new GLTFLoader(manager);
  }
  return loaders[kit];
}

// --- the souka tone: Kenney's toy colours, faded and warmed so they sit next to our hand-made world ---
const WARM = new THREE.Color(0.95, 0.9, 0.82);
/** Kenney furniture materials re-coloured to the HOUSE SHEET palette (beige, wood, grey, olive sofa, blue-grey). */
const PALETTE: Record<string, number> = {
  wood: 0xa98a68, woodDark: 0x6f5039, fur: 0x8d6c50,
  carpet: 0x6f7f56, carpetDarker: 0x56653f, carpetBlue: 0x5f6f82, carpetWhite: 0xe6dfcf,
  metal: 0xb8bab4, metalLight: 0xe4e1d8, metalMedium: 0x727671, metalDark: 0x4d5250,
  glass: 0xc6d4d2, plant: 0x6c8b4c, lamp: 0xf0dea6, _defaultMat: 0xe9e5db,
  // second pack: furniture parts were renamed to these keys when converted, buildings keep their own names
  brick: 0x9a5b48, fabric: 0xbfae8e, vase: 0x8fa3a6,
  euLightYellow: 0xd8cca0, euBeige: 0xb7aa8a, euWhite: 0xe3dfd3, euGrey: 0x6b6d6a, euDarkGrey: 0x3b3c3c, euBrown: 0x5b4535,
  euDarkRed: 0x7b3d35, euBrickRed: 0x8c4c3c, euLightBlue: 0x9eafb2, euGreyBlue: 0x6d7c80, euLightGrey: 0xb1b1ab, euWhiteBlue: 0xc8cfcd,
};
function toneColor(c: THREE.Color, name?: string) {
  if (name && PALETTE[name] !== undefined) return new THREE.Color(PALETTE[name]);
  const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
  const out = new THREE.Color().setHSL(hsl.h, hsl.s * 0.58, hsl.l * 0.86 + 0.05);
  return out.lerp(WARM, 0.1);
}
const toned = new Map<string, THREE.Material>();
export function toneMaterial(m: any): THREE.Material {
  if (toned.has(m.uuid)) return toned.get(m.uuid)!;
  const glass = /glass/i.test(m.name || '') || (m.opacity !== undefined && m.opacity < 1);
  const out = new THREE.MeshLambertMaterial({
    color: m.map ? new THREE.Color(1, 1, 1) : toneColor(m.color || new THREE.Color(1, 1, 1), m.name),
    map: m.map || null,
    transparent: glass, opacity: glass ? 0.55 : 1, side: m.side,
  });
  if (m.map) {
    // textured city-kit models: fade and warm the texture in the shader
    out.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, 0.6) * 0.9 + vec3(0.05, 0.035, 0.0);`);
    };
    (out as any).customProgramCacheKey = () => 'souka-tone';
  }
  toned.set(m.uuid, out); return out;
}

/** The town kit paints everything from a 32×32 palette; the shop's awnings share the red swatch with its roof trim
 *  and door frame. Awning triangles are the red ones that stick out past the walls below the roof: move those
 *  into a second material group so they can take another colour. */
function recolorAwnings(model: THREE.Object3D, color: number) {
  model.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = []; model.traverse((o: any) => { if (o.isMesh) meshes.push(o); });
  const v = new THREE.Vector3();
  for (const mesh of meshes) {
    const g = mesh.geometry as THREE.BufferGeometry, p = g.attributes.position, uv = g.attributes.uv, idx = g.index;
    if (!uv) continue;
    const n = idx ? idx.count : p.count, at = (i: number) => (idx ? idx.getX(i) : i);
    // quantized models store UVs as normalized integers, which r128's getX() returns raw
    const norm = (a: any) => (!a.normalized ? 1 : a.array instanceof Int16Array ? 1 / 32767 : a.array instanceof Uint16Array ? 1 / 65535 : a.array instanceof Int8Array ? 1 / 127 : a.array instanceof Uint8Array ? 1 / 255 : 1);
    const un = norm(uv), pn = norm(p);
    const tris: { red: boolean; beige: boolean; c: THREE.Vector3 }[] = [];
    for (let t = 0; t < n; t += 3) {
      const c = new THREE.Vector3(); let red = true, beige = true;
      for (let k = 0; k < 3; k++) {
        const i = at(t + k), u = uv.getX(i) * un, w = uv.getY(i) * un;
        if (!(u >= 0.5 && w >= 0.75)) red = false;
        if (!(u < 0.5 && w >= 0.75)) beige = false;
        c.add(v.set(p.getX(i) * pn, p.getY(i) * pn, p.getZ(i) * pn).applyMatrix4(mesh.matrixWorld).multiplyScalar(1 / 3));
      }
      tris.push({ red, beige, c });
    }
    const walls = new THREE.Box3(); for (const t of tris) if (t.beige) walls.expandByPoint(t.c);
    if (walls.isEmpty()) continue;
    // relative to the wall box: awnings hang in the upper band of the walls, out at the edges, and the front
    // pair leaves the door frame (centre) alone; the roof trim is above the band
    const cx = (walls.min.x + walls.max.x) / 2, cz = (walls.min.z + walls.max.z) / 2;
    const hx = (walls.max.x - walls.min.x) / 2, hz = (walls.max.z - walls.min.z) / 2, h = walls.max.y - walls.min.y;
    const isAwning = (t: (typeof tris)[number]) => {
      if (!t.red) return false;
      const fy = (t.c.y - walls.min.y) / h, ax = Math.abs(t.c.x - cx) / hx, az = Math.abs(t.c.z - cz) / hz;
      return fy > 0.6 && fy < 1.15 && ((az > 0.72 && ax > 0.2) || ax > 0.76);
    };
    const keep: number[] = [], awn: number[] = [];
    tris.forEach((t, k) => (isAwning(t) ? awn : keep).push(at(k * 3), at(k * 3 + 1), at(k * 3 + 2)));
    if (!awn.length) continue;
    const ng = g.clone(); ng.setIndex([...keep, ...awn]); ng.clearGroups();
    ng.addGroup(0, keep.length, 0); ng.addGroup(keep.length, awn.length, 1);
    const base = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    mesh.geometry = ng; mesh.material = [base, new THREE.MeshLambertMaterial({ color })];
  }
}

/** A loaded, toned, scaled model whose footprint is centred on (0,0) and whose bottom is at y = 0. */
interface Template { root: THREE.Object3D; w: number; d: number; h: number }
const templates = new Map<string, Promise<Template>>();
function loadTemplate(item: CatalogItem): Promise<Template> {
  if (!templates.has(item.id)) {
    const kit = item.file.split('/')[0];
    templates.set(item.id, loaderFor(kit).loadAsync(urlFor(item.file)).then((gltf) => {
      const model = gltf.scene;
      model.traverse((o: any) => {
        if (!o.isMesh) return;
        if (!o.geometry.attributes.normal) o.geometry = flatShade(o.geometry);
        o.material = Array.isArray(o.material) ? o.material.map(toneMaterial) : toneMaterial(o.material);
      });
      if (item.recolor === 'awningBlack') recolorAwnings(model, 0x232325);
      if (item.ry) { model.rotation.y = item.ry; model.updateMatrixWorld(true); }
      const raw = new THREE.Box3().setFromObject(model);
      const rawH = Math.max(0.001, raw.max.y - raw.min.y), rawL = Math.max(0.001, raw.max.x - raw.min.x, raw.max.z - raw.min.z);
      const s = item.len ? item.len / rawL : item.h ? item.h / rawH : (item.s ?? 2);
      model.scale.multiplyScalar(s);
      const b = new THREE.Box3().setFromObject(model);
      model.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
      const root = new THREE.Group(); root.add(model);
      return { root, w: b.max.x - b.min.x, d: b.max.z - b.min.z, h: b.max.y - b.min.y };
    }));
  }
  return templates.get(item.id)!;
}

/** Small things look for a surface below this height (so they land on the counter, not on the cabinets above it). */
export const TOP_FROM = 1.5;

export interface SpawnOpts { x: number; z: number; r?: number; y?: number; s?: number; zone?: 'house' | 'alley'; name?: string; uid?: string; spawned?: boolean }

/** Where the default Kenney furniture goes in the house (house-local x / z, rotation; s here is the model scale). */
const HOUSE_DEFAULTS: [string, string, number, number, number, Partial<SpawnOpts>?][] = [
  // 1. bedroom
  ['침대', 'bedDouble', 2.95, 1.25, 0],
  ['협탁', 'cabinetBedDrawerTable', 4.45, 0.45, 0],
  ['탁상 램프', 'lampRoundTable', 4.45, 0.4, 0],
  ['옷장', 'bookcaseClosedDoors', 7.05, 2.1, -Math.PI / 2],
  ['러그(침실)', 'rugRectangle', 3.1, 3.7, 0],
  ['화분(침실)', 'pottedPlant', 0.5, 5.4, 0],
  ['곰 인형', 'bear', 3.6, 2.15, -0.4, { s: 1.3 }],
  // 2. work room
  ['책상', 'desk', 11.0, 0.5, 0],
  ['모니터', 'computerScreen', 10.9, 0.3, 0],
  ['키보드', 'computerKeyboard', 10.9, 0.65, 0],
  ['책상 램프', 'lampSquareTable', 11.65, 0.3, 0],
  ['작업 의자', 'chairDesk', 11.0, 1.55, Math.PI],
  ['책장', 'bookcaseOpen', 14.6, 4.3, -Math.PI / 2],
  ['책 더미', 'books', 14.6, 4.3, -Math.PI / 2],
  ['라디오', 'radio', 8.5, 0.35, 0.4],
  ['러그(작업실)', 'rugRounded', 11.1, 2.9, 0],
  ['화분(작업실)', 'pottedPlant', 14.4, 0.5, 0],
  // 4. living room
  ['소파', 'loungeSofa', 2.7, 6.65, 0, { s: 2.3 }],
  ['쿠션', 'pillowBlue', 1.9, 6.6, 0.2],
  ['커피 테이블', 'tableCoffee', 2.7, 9.1, 0, { s: 2.0 }],
  ['TV 장', 'cabinetTelevision', 2.7, 14.1, Math.PI, { s: 2.2 }],
  ['TV', 'televisionVintage', 2.7, 14.1, Math.PI],
  ['수납장', 'sideTableDrawers', 5.2, 6.45, 0],
  ['스탠드', 'lampRoundFloor', 0.55, 6.6, 0],
  ['러그(거실)', 'rugRound', 2.7, 9.3, 0, { s: 2.8 }],
  ['화분(거실)', 'pottedPlant', 0.55, 13.9, 0],
  ['화분(거실) 2', 'pottedPlant', 7.4, 7.6, 0],
  // 3. kitchen: a counter run along the north wall, upper cabinets above it
  ['주방 수납장', 'kitchenCabinetDrawer', 10.55, 6.47, 0],
  ['싱크대', 'kitchenSink', 11.41, 6.47, 0],
  ['주방 수납장 2', 'kitchenCabinet', 12.27, 6.47, 0],
  ['가스레인지', 'kitchenStove', 13.13, 6.47, 0],
  ['주방 수납장 3', 'kitchenCabinet', 13.99, 6.47, 0],
  ['상부장', 'kitchenCabinetUpperDouble', 10.98, 6.25, 0],
  ['후드', 'hoodModern', 13.13, 6.25, 0],
  ['상부장 2', 'kitchenCabinetUpperDouble', 14.3, 6.25, 0],
  ['커피 머신', 'kitchenCoffeeMachine', 10.55, 6.4, 0],
  ['토스터', 'toaster', 13.99, 6.4, 0],
  ['냉장고', 'kitchenFridge', 14.45, 8.4, -Math.PI / 2],
  ['식탁', 'table', 10.7, 8.8, 0],
  ['식탁 의자', 'chair', 10.7, 7.95, 0],
  ['식탁 의자 2', 'chair', 10.7, 9.65, Math.PI],
  ['작은 화분', 'plantSmall2', 11.2, 8.7, 0],
  ['쓰레기통', 'trashcan', 8.5, 10.5, 0],
  // 5. bathroom (the sink is real-size: taller than souka)
  ['세탁기', 'washer', 10.9, 14.0, Math.PI, { s: 2.2 }],
  ['세면대', 'bathroomSinkSquare', 8.42, 12.4, Math.PI / 2, { s: 2.9 }],
  ['욕실 거울', 'bathroomMirror', 8.2, 12.4, Math.PI / 2, { y: 1.85, s: 2.6 }],
  ['변기', 'toilet', 9.3, 14.05, Math.PI],
  // 6. entrance
  ['택배 상자', 'cardboardBoxOpen', 12.3, 11.9, 0, { s: 3 }],
  ['옷걸이', 'coatRackStanding', 11.95, 14.1, 0],
  // balcony
  ['화분(베란다)', 'pottedPlant', -1.8, 2.2, 0, { s: 2.6 }],
  ['화분(베란다) 2', 'pottedPlant', -1.8, 13.4, 0, { s: 2.3 }],
];

export function setupProps(G: Game) {
  const { S, scene, editObjs, colliders, placeObj, toast } = G;
  const house: THREE.Group = G.house;
  const SPOTS: Spot[] = G.SPOTS;

  const shadowsOn = () => !!(G.QUALITY && G.QUALITY[S.qualIdx].shadow);
  const parentFor = (zone: 'house' | 'alley') => (zone === 'house' ? house : scene);
  const uniqueName = (base: string) => { let n = base, i = 2; while (editObjs.some((o: EditObj) => o.name === n)) n = `${base} ${i++}`; return n; };
  let uidSeq = Date.now() % 100000;

  /** Create the object right away (so edit mode can hold it) and fill in the model when it has loaded. */
  function spawn(id: string, opts: SpawnOpts): EditObj | null {
    const item = CATALOG_BY_ID[id]; if (!item || !urlFor(item.file)) return null;
    const zone = opts.zone || 'house';
    const parent = parentFor(zone), off = zone === 'house' ? HX : 0;
    const g = new THREE.Group();
    const y = opts.y ?? item.y ?? 0;
    g.position.set(opts.x - off, y, opts.z); g.rotation.y = opts.r || 0; g.scale.setScalar(opts.s || 1);
    parent.add(g);
    const o: EditObj = {
      name: opts.name || uniqueName(item.name), label: item.name, g, cols: [], off,
      init: { x: opts.x - off, y, z: opts.z, r: opts.r || 0 }, hidden: false, persist: !opts.spawned,
      item, spawned: !!opts.spawned, uid: opts.uid || (opts.spawned ? 'u' + (uidSeq++).toString(36) : undefined),
      top: !!item.top, fixedY: item.y !== undefined || opts.y !== undefined,
    };
    g.userData.edit = o; editObjs.push(o);
    o.ready = loadTemplate(item).then((t) => {
      if (!g.parent && !editObjs.includes(o)) return;  // put away before it finished loading
      const m = t.root.clone();
      const shadow = shadowsOn();
      m.traverse((c: any) => { if (c.isMesh) { c.castShadow = shadow && !item.flat; c.receiveShadow = shadow; } });
      g.add(m);
      o.size = { w: t.w, d: t.d, h: t.h };
      if (item.col !== false && !item.car && !item.top && !item.flat && t.w > 0.15 && t.d > 0.15) {
        const col = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
        colliders.push(col); o.cols.push({ col, lx: 0, lz: 0, hw: t.w / 2, hd: t.d / 2 });
      }
      placeObj(o);
      if (item.seat) addSeatSpot(o, item, t, zone);
      if (item.occ) m.traverse((c: any) => { if (c.isMesh) G.occluders.push(c); });
      if (item.car && G.addModelCar) G.addModelCar(o);
      G.resetSurfaces();
      return o;
    });
    return o;
  }

  /** A C-key spot to sit on / lie on this furniture; it follows the object when moved, turned or scaled. */
  function addSeatSpot(o: EditObj, item: CatalogItem, t: Template, zone: 'house' | 'alley') {
    const lie = item.seat === 'lie';
    const label = item.id === 'cardboardBoxOpen' ? '상자에 들어가기' : item.id === 'bathtub' ? '욕조에 들어가기' : `${o.label}에 ${lie ? '눕기' : '앉기'}`;
    const sp: Spot = {
      zone, label, o, at: [0, 0], l: [0, lie ? t.d * 0.08 : t.d * 0.12], r: Math.max(t.w, t.d) / 2 + (lie ? 0.6 : 0.3),
      seat: { y: 0, rot: 0, pose: lie ? 'lie' : 'sit', auto: true, rl: lie ? Math.PI : 0, el: lie ? [t.w / 2 + 0.5, 0] : [0, t.d / 2 + 0.5] },
    };
    SPOTS.push(sp);
  }

  function removeSpotsOf(o: EditObj) { for (let i = SPOTS.length - 1; i >= 0; i--) if (SPOTS[i].o === o) SPOTS.splice(i, 1); }

  // ---- the warehouse ----
  /** Somewhere in front of souka (or the middle of the edit view) on the floor. */
  function dropSpot(): { x: number; z: number; zone: 'house' | 'alley' } {
    if (S.editMode) return { x: G.edit.pivot.x, z: G.edit.pivot.z, zone: S.zone };
    const c = G.char.position, r = G.char.rotation.y;
    return { x: c.x + Math.sin(r) * 1.4, z: c.z + Math.cos(r) * 1.4, zone: S.zone };
  }
  function takeOut(id: string) {
    const p = dropSpot();
    const o = spawn(id, { ...p, r: S.editMode ? 0 : G.char.rotation.y + Math.PI, spawned: true });
    if (!o) return;
    o.ready!.then(() => { scene.updateMatrixWorld(true); if (S.area === 'city' && S.zone === 'alley') G.city.settle(); if (o.top) { o.g.position.y = G.surfaceY(o.off + o.g.position.x, o.g.position.z, o.g, TOP_FROM); } G.edit.select(o); G.edit.saveSoon(); });
    G.edit.select(o);
    toast(`${o.label}을(를) 꺼냈어요.`);
  }
  /** Put an object away: things taken from the catalog disappear, the house's own furniture waits in the box. */
  function putAway(o: EditObj) {
    if (o.hold && S.held === o.hold) return;
    if (o.spawned) {
      o.g.parent?.remove(o.g);
      for (const k of o.cols) { const i = colliders.indexOf(k.col); if (i >= 0) colliders.splice(i, 1); }
      removeSpotsOf(o);
      if (o.item?.occ) o.g.traverse((c: any) => { const i = G.occluders.indexOf(c); if (i >= 0) G.occluders.splice(i, 1); });
      editObjs.splice(editObjs.indexOf(o), 1);
    } else { o.hidden = true; placeObj(o); }
    if (S.sel === o) G.edit.select(null);
    G.resetSurfaces(); G.edit.saveSoon(); G.notify();
  }
  /** Bring one of the house's own pieces back out of the box, in front of souka. */
  function takeBack(o: EditObj) {
    const p = dropSpot();
    if (o.g.parent !== parentFor(p.zone)) {      // moved between house and alley
      o.g.parent?.remove(o.g); parentFor(p.zone).add(o.g); o.off = p.zone === 'house' ? HX : 0;
    }
    o.g.position.x = p.x - o.off; o.g.position.z = p.z;
    if (o.top) o.g.position.y = G.surfaceY(p.x, p.z, o.g, TOP_FROM);
    o.hidden = false; placeObj(o); G.edit.select(o); G.resetSurfaces(); G.edit.saveSoon(); G.notify();
  }
  const stored = () => editObjs.filter((o: EditObj) => o.hidden);

  // ---- thumbnails, rendered once per item in the same tone as the game ----
  let thumbR: THREE.WebGLRenderer | null = null;
  const thumbScene = new THREE.Scene();
  thumbScene.add(new THREE.HemisphereLight(0xfff6e6, 0x8a7a66, 1.0));
  const tl = new THREE.DirectionalLight(0xffffff, 0.55); tl.position.set(2, 4, 3); thumbScene.add(tl);
  const thumbCam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const thumbs: Record<string, string> = {};
  const queue: string[] = []; let busy = false;
  function wantThumbs(ids: string[]) {
    for (const id of ids) if (!thumbs[id] && !queue.includes(id)) queue.push(id);
    pump();
  }
  async function pump() {
    if (busy) return; busy = true;
    let n = 0;
    while (queue.length) {
      const id = queue.shift()!; const item = CATALOG_BY_ID[id]; if (!item) continue;
      try {
        const t = await loadTemplate(item);
        if (!thumbR) { thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setSize(96, 96, false); }
        const m = t.root.clone(); thumbScene.add(m);
        const size = Math.max(t.w, t.h, t.d);
        thumbCam.position.set(size * 1.25, t.h * 0.5 + size * 0.95, size * 1.75);
        thumbCam.lookAt(0, t.h * 0.42, 0);
        thumbR.render(thumbScene, thumbCam);
        thumbs[id] = thumbR.domElement.toDataURL('image/png');
        thumbScene.remove(m);
      } catch { thumbs[id] = ''; }
      if (++n % 6 === 0) { G.notify(); await new Promise((r) => setTimeout(r, 0)); }
    }
    busy = false; G.notify();
  }

  // ---- the default furniture ----
  for (const [name, id, x, z, r, extra] of HOUSE_DEFAULTS) {
    const item = CATALOG_BY_ID[id];
    const s = extra?.s ? extra.s / (item.s ?? 2) : 1;   // HOUSE_DEFAULTS give the model scale; spawn wants a multiplier
    const o = spawn(id, { x: HX + x, z, r, name, zone: 'house', ...(extra || {}), s: 1 });
    if (o && s !== 1) { o.baseScale = s; o.g.scale.setScalar(s); }
  }
  const defaultsReady = Promise.all(editObjs.filter((o: EditObj) => o.ready).map((o: EditObj) => o.ready));
  /** Once the furniture is in place, settle small things (and the giant mug / remote) onto what is under them. */
  function settle() {
    G.resetSurfaces();
    scene.updateMatrixWorld(true);   // models added since the last frame are not in their final place yet
    for (const o of editObjs as EditObj[]) {
      if (!o.hidden && !o.keepY && (o.top || o.hold)) {
        const wp = new THREE.Vector3(); o.g.getWorldPosition(wp);
        o.g.position.y = G.surfaceY(wp.x, wp.z, o.g, TOP_FROM);
      }
    }
    G.resetSurfaces();
  }

  G.props = { spawn, takeOut, putAway, takeBack, stored, wantThumbs, thumbs, defaultsReady, settle, CATALOG };
}
