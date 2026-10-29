// The per-frame update: movement, HUD text, camera (with wall / building cut-away) and rendering.
import * as THREE from 'three';
import type { Game } from './types';
import { HX } from './core';
import { MAX_REACH_Y } from './interact';

export function setupLoop(G: Game) {
  const { S, keys, char, camera, renderer, scene, collide, occluders } = G;
  const clock = new THREE.Clock();
  const tmpV = new THREE.Vector3();
  const ray = new THREE.Raycaster(), rayDir = new THREE.Vector3(), rayPts = [0.15, 0.75, 1.35];
  const camRay = new THREE.Raycaster(), camDir = new THREE.Vector3(), hiddenOcc: THREE.Object3D[] = [];

  /** Indoors: hide any wall between the camera and the target (doll-house view). */
  function hideBlockingWalls(target: THREE.Vector3) {
    for (const g of G.wallGroups) g.visible = true;
    for (const h of rayPts) {
      const p = new THREE.Vector3(target.x, h + (S.pose === 'lie' && !S.editMode ? -0.3 : 0), target.z);
      rayDir.subVectors(p, camera.position); const dist = rayDir.length(); rayDir.normalize();
      ray.set(camera.position, rayDir); ray.far = dist - 0.25;
      for (const hit of ray.intersectObjects(G.wallGroups, true)) { let o: THREE.Object3D | null = hit.object; while (o && !G.wallGroups.includes(o)) o = o.parent; if (o) o.visible = false; }
    }
  }

  function walk(dt: number) {
    let ix = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
    let iz = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
    let dx = 0, dz = 0, moving = false, faceMove = true;
    if (S.reels) {
      // reels: walk toward the camera, A/D turn; the camera backs away in front
      const turn = (keys['a'] || keys['arrowleft'] ? 1 : 0) - (keys['d'] || keys['arrowright'] ? 1 : 0);
      if (S.pose === 'stand' && !S.seat) char.rotation.y += turn * 2.0 * dt;
      const fw = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 0.5 : 0);
      if (fw) { dx = Math.sin(char.rotation.y) * fw; dz = Math.cos(char.rotation.y) * fw; moving = S.pose !== 'lie'; }
      faceMove = false;
    } else if ((ix || iz) && S.pose !== 'lie') {
      moving = true;
      const len = Math.hypot(ix, iz); ix /= len; iz /= len;
      const sin = Math.sin(S.camYaw), cos = Math.cos(S.camYaw);
      dx = ix * cos + iz * sin; dz = -ix * sin + iz * cos;
    }
    if (moving && (S.pose !== 'stand' || S.seat)) G.standUp();
    if (moving) {
      const maxSp = keys['shift'] ? 4.4 : 2.1;
      S.speedNow = S.speedNow < maxSp ? Math.min(maxSp, S.speedNow + dt * 8) : Math.max(maxSp, S.speedNow - dt * 6);
      const nx = char.position.x + dx * S.speedNow * dt, nz = char.position.z + dz * S.speedNow * dt;
      const p = char.position;
      if (S.zone === 'alley' && S.area === 'city') {
        // Takeshiba: walls, kerbs and stairs from the map's triangles (try each axis so souka slides along walls)
        let gy = collide(nx, p.z) ? null : G.city.moveTo(p.x, p.y, p.z, nx, p.z);
        if (gy !== null) { p.x = nx; p.y = gy; }
        gy = collide(p.x, nz) ? null : G.city.moveTo(p.x, p.y, p.z, p.x, nz);
        if (gy !== null) { p.z = nz; p.y = gy; }
      } else {
        // already overlapping something (e.g. got up next to a table)? let souka walk out of it
        const stuck = collide(p.x, p.z);
        if (stuck || !collide(nx, p.z)) p.x = nx;
        if (stuck || !collide(p.x, nz)) p.z = nz;
      }
      const ob = S.zone === 'alley' ? G.outBounds() : null;
      if (ob) {
        char.position.x = THREE.MathUtils.clamp(char.position.x, ob.x0, ob.x1);
        char.position.z = THREE.MathUtils.clamp(char.position.z, ob.z0, ob.z1);
      } else if (S.zone === 'house') {
        char.position.x = THREE.MathUtils.clamp(char.position.x, HX - 2.2, HX + 14.8);
        char.position.z = THREE.MathUtils.clamp(char.position.z, 0.2, 14.3);
      }
      if (faceMove) {
        const target = Math.atan2(dx, dz);
        let diff = target - char.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        char.rotation.y += diff * Math.min(1, dt * 10);
      }
      S.walkPhase += dt * S.speedNow * 4.2;
    } else {
      S.speedNow = Math.max(0, S.speedNow - dt * 10);
      if (S.speedNow === 0) S.walkPhase = 0;
    }
  }

  function hud() {
    let prompt = '';
    const sp = (S.pose === 'stand' && !S.riding) ? G.nearestSpot() : null;
    if (S.riding) prompt = `${Math.round(Math.abs(S.riding.speed) * 6)}km/h · C 내리기 · L 라이트 ${S.riding.lights ? 'ON' : 'OFF'}`;
    else if (S.held) prompt = 'C : ' + S.held.name + ' 내려놓기 · Z/X 거리';
    else if (S.seat || S.pose === 'sit' || S.pose === 'hug' || S.pose === 'count' || S.pose === 'lie') prompt = 'C : ' + (S.seat && S.seat.pose === 'stand' ? '내려오기' : '일어나기');
    else if (sp) prompt = 'C : ' + sp.label;
    else if (S.zone === 'alley' && S.area === 'alley' && char.position.z < -49 && Math.abs(char.position.x) < 6) {
      prompt = '편의점 도착';
      if (!S.taskDone) { S.taskDone = true; G.setUi({ task: '할 일: 완료 ✓' }); G.toast('캔커피를 샀다. ……출근해야지.'); }
    }
    if (S.reels) prompt = '';
    const [hh, mm] = S.clockBase.split(':').map(Number);
    const mins = hh * 60 + mm + Math.floor(performance.now() / 4000);
    const clockTxt = `10/28 (水) ${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    let room = S.area === 'city' ? '타케시바 TAKESHIBA' : S.area === 'yokohama' ? '요코하마 YOKOHAMA' : '골목 ALLEY';
    if (S.zone === 'house') {
      const lx = char.position.x - HX, lz = char.position.z;
      const r = G.ROOMS.find((o: any) => lx >= o.r[0] && lx <= o.r[1] && lz >= o.r[2] && lz <= o.r[3]);
      room = r ? r.n : '복도';
    }
    G.setUi({ prompt, clock: clockTxt, room });
  }

  function updateCamera(dt: number) {
    let pitch = S.photo ? S.camPitch : S.walkPitch[S.zone];
    const pan = G.photoPan as THREE.Vector3;
    if (S.photo) {
      // photo mode: WASD slides the camera's look-at point around souka, R lifts it
      const ix = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0), iz = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
      const sn = Math.sin(S.camYaw), cs = Math.cos(S.camYaw);
      pan.x += (ix * cs + iz * sn) * dt * 2.5; pan.z += (-ix * sn + iz * cs) * dt * 2.5;
      if (keys['r']) pan.y += dt * 1.5;
      pan.clampLength(0, 6);
    }
    if (S.reels) {
      pitch = 0.16;
      if (!S.drag) { let d = char.rotation.y - S.camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.camYaw += d * Math.min(1, dt * 3); }
    }
    let dist = S.riding && S.riding.type === 'car' ? Math.max(S.camDist, 7) : THREE.MathUtils.clamp(S.camDist, G.minD(), G.maxD());
    const target = tmpV.set(char.position.x, char.position.y + (S.riding ? 0.9 : (S.pose === 'lie' ? 0.35 : S.pose === 'sit' || S.pose === 'hug' || S.pose === 'count' ? 0.6 : 0.78) * (S.size || 1)), char.position.z);
    if (S.photo) target.add(pan);
    if (S.editMode) { target.copy(G.edit.pivot); pitch = G.edit.pitch; dist = G.edit.dist; }
    let cx = target.x + Math.sin(S.camYaw) * Math.cos(pitch) * dist;
    let cz = target.z + Math.cos(S.camYaw) * Math.cos(pitch) * dist;
    let cy = target.y + Math.sin(pitch) * dist;
    // outdoors: pull the camera in a little; if that is not enough, cut the blocking building away
    for (const o of hiddenOcc) o.visible = true; hiddenOcc.length = 0;
    if (S.zone === 'alley') {
      const side = new THREE.Vector3(Math.cos(S.camYaw), 0, -Math.sin(S.camYaw)).multiplyScalar(0.35), origin = new THREE.Vector3();
      camDir.set(cx - target.x, cy - target.y, cz - target.z); const want = camDir.length(); camDir.normalize();
      const hits: THREE.Intersection[] = [];
      for (const k of [0, 1, -1]) { origin.copy(target).addScaledVector(side, k); camRay.set(origin, camDir); camRay.far = want; for (const h of camRay.intersectObjects(occluders, false)) hits.push(h); }
      if (hits.length) {
        const near = Math.min(...hits.map((h) => h.distance));
        if (near >= 2.6) { const d = near - 0.3; cx = target.x + camDir.x * d; cy = target.y + camDir.y * d; cz = target.z + camDir.z * d; }
        else for (const h of hits) if (h.object.visible) { h.object.visible = false; hiddenOcc.push(h.object); }
      }
    }
    if (S.zone === 'alley' && S.area === 'city' && !S.editMode) {
      // the city's buildings are one big mesh each, so pull the camera in front of them instead of hiding them
      const cam = new THREE.Vector3(cx, cy, cz), f = G.city.hitFrac(target, cam);
      if (f < 1) { const d = Math.max(0.6, f * target.distanceTo(cam) - 0.3) / target.distanceTo(cam); cx = target.x + (cx - target.x) * d; cy = target.y + (cy - target.y) * d; cz = target.z + (cz - target.z) * d; }
    }
    cy = Math.max(cy, char.position.y + 0.15);
    camera.position.set(cx, cy, cz);
    camera.lookAt(target);
    if (S.zone === 'house') hideBlockingWalls(target);
  }

  let raf = 0;
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (S.editMode) G.edit.update(dt);
    else if (!S.photo) {
      if (keys['q']) S.camYaw += dt * 1.8;
      if (keys['e']) S.camYaw -= dt * 1.8;
      G.refreshDynCols();
      if (S.riding) G.updateRide(dt); else walk(dt);
      // auto blink
      S.blinkT -= dt;
      if (S.blinkT < 0) { G.setExpr('blink'); if (S.blinkT < -0.12) { G.setExpr('default'); S.blinkT = 2 + Math.random() * 3; } }
      hud();
    }

    G.applyPose(dt);
    G.sun.position.set(char.position.x - 6, char.position.y + 14, char.position.z + 8); G.sun.target.position.set(char.position.x, char.position.y, char.position.z);
    G.blob.position.set(char.position.x, char.position.y + 0.012, char.position.z);
    G.blob.visible = !(S.riding && S.riding.type === 'car');
    updateCamera(dt);

    // where a carried prop will land
    const marker = G.marker as THREE.Mesh;
    if (S.held && !S.photo && !S.editMode) {
      const [mx, my, mz] = G.dropPoint(); marker.position.set(mx, my + 0.02, mz);
      (marker.material as THREE.MeshBasicMaterial).color.set(my > MAX_REACH_Y ? 0xff5a4a : 0xffd84a); marker.visible = true;
    } else marker.visible = false;

    // lit windows from the evening on
    const night = S.timeIdx >= 2;
    for (const b of G.buildingMats) { const want = night ? b.night : b.day; if (b.m.map !== want) { b.m.map = want; b.m.needsUpdate = true; } }

    renderer.render(scene, camera);
    if (S.reels) G.drawComp();
    raf = requestAnimationFrame(tick);
  }

  G.start = () => { clock.getDelta(); raf = requestAnimationFrame(tick); };
  G.stop = () => cancelAnimationFrame(raf);
}
