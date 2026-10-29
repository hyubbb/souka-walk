import * as THREE from 'three';
import type { Game } from './types';

export const TIMES = [
  { name: '아침', bg: 0xc4dff0, sky: 0xfff6e6, ground: 0x9c8b6e, hemi: 0.98, dir: 0.78, dc: 0xffe6bf, clock: '08:12', lamps: 0 },
  { name: '낮', bg: 0xa4d2f2, sky: 0xffffff, ground: 0xa59577, hemi: 1.05, dir: 0.9, dc: 0xfff5e2, clock: '12:40', lamps: 0 },
  { name: '저녁', bg: 0xf2ab7a, sky: 0xffd0a0, ground: 0x7a5a48, hemi: 0.8, dir: 0.72, dc: 0xff9f5c, clock: '17:55', lamps: 0.6 },
  { name: '밤', bg: 0x1d2645, sky: 0x5d6c9c, ground: 0x2c2520, hemi: 0.52, dir: 0.06, dc: 0x8090ff, clock: '22:30', lamps: 1 },
];

export function setupLighting(G: Game) {
  const { scene, S } = G;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.6); sun.position.set(-4, 10, 6); scene.add(sun);
  scene.fog = new THREE.Fog(0xcccccc, 16, 58);
  const fog = scene.fog as THREE.Fog;

  /** Sky, fog and light colours for a time of day; indoors the lights stay warm. */
  function applyTime(i: number) {
    S.timeIdx = i; const t = TIMES[i];
    scene.background = new THREE.Color(t.bg); fog.color.set(t.bg);
    hemi.color.set(t.sky); hemi.groundColor.set(t.ground); hemi.intensity = t.hemi;
    sun.color.set(t.dc); sun.intensity = t.dir;
    if (S.zone === 'house') {
      hemi.color.set(i === 3 ? 0xffe2b8 : 0xfff4e4); hemi.groundColor.set(0x8a7a66); hemi.intensity = i === 3 ? 0.85 : 0.95;
      sun.intensity = i === 3 ? 0.15 : 0.45;
      fog.near = 40; fog.far = 140;
    } else if (S.area === 'city') { fog.near = 70; fog.far = 300; }
    else if (S.area === 'yokohama') { fog.near = 40; fog.far = 170; }
    else { fog.near = 16; fog.far = 58; }
    const far = S.zone === 'alley' && S.area === 'city' ? 340 : 200;
    if (G.camera.far !== far) { G.camera.far = far; G.camera.updateProjectionMatrix(); }
    if (G.M) G.M.glass.color.set(t.bg).lerp(new THREE.Color(0xffffff), i === 3 ? 0.05 : 0.35);
    if (G.applyLamps) G.applyLamps(t.lamps);
    S.clockBase = t.clock;
    G.notify();
  }

  Object.assign(G, { hemi, sun, applyTime, TIMES });
}
