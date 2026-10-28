// Quality presets: render resolution, texture filtering and real-time shadows.
import * as THREE from 'three';
import type { Game } from './types';

export const QUALITY = [
  { name: '레트로', w: 360, h: 450, linear: false, shadow: false, map: 0 },
  { name: '보통', w: 720, h: 900, linear: true, shadow: true, map: 1024 },
  { name: '선명', w: 1080, h: 1350, linear: true, shadow: true, map: 2048 },
];
const isPOT = (n: number) => (n & (n - 1)) === 0;

export function setupQuality(G: Game) {
  const { S, renderer, scene, canvas, sun } = G;
  const cam = sun.shadow.camera as THREE.OrthographicCamera;
  cam.left = -14; cam.right = 14; cam.top = 14; cam.bottom = -14; cam.near = 1; cam.far = 60;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun.target);

  function filter(t: THREE.Texture, linear: boolean, pot: boolean) {
    t.magFilter = linear ? THREE.LinearFilter : THREE.NearestFilter;
    t.generateMipmaps = linear && pot;
    t.minFilter = linear ? (pot ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter) : THREE.NearestFilter;
    t.anisotropy = linear ? Math.min(4, renderer.capabilities.getMaxAnisotropy()) : 1;
    t.needsUpdate = true;
  }
  function setQuality(i: number) {
    S.qualIdx = i; const q = QUALITY[i];
    G.applyRenderSize();
    canvas.classList.toggle('retro', !q.linear);
    renderer.shadowMap.enabled = q.shadow;
    if (q.shadow && sun.shadow.mapSize.x !== q.map) { sun.shadow.mapSize.set(q.map, q.map); if (sun.shadow.map) { sun.shadow.map.dispose(); (sun.shadow as any).map = null; } }
    sun.castShadow = q.shadow;
    const seen = new Set<THREE.Material>();
    scene.traverse((o: any) => {
      if (!o.isMesh) return;
      const flat = o.geometry && o.geometry.type === 'PlaneGeometry';
      o.castShadow = q.shadow && !flat && !o.material.transparent;
      o.receiveShadow = q.shadow;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (seen.has(m)) continue; seen.add(m); m.needsUpdate = true;
        const t = m.map as THREE.Texture | null; if (!t || !t.image) continue;
        filter(t, q.linear, isPOT(t.image.width) && isPOT(t.image.height));
      }
    });
    // face textures that are not on the model right now
    for (const t of [...Object.values(G.eyeTexL), ...Object.values(G.mouthTexes), ...Object.values(G.eyeTexR)] as THREE.Texture[]) filter(t, q.linear, true);
    G.blob.material.opacity = q.shadow ? 0.45 : 1;
    G.notify();
  }

  Object.assign(G, { QUALITY, setQuality });
}
