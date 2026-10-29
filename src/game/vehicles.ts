// The parked car and bicycle in front of the house: get in / out, lights, simple arcade driving.
import * as THREE from 'three';
import type { Game } from './types';

export function setupVehicles(G: Game) {
  const { S, scene, canvasTex, lam, colliders, dynCols, keys, char, collide, toast } = G;
  const setPose = (p: any) => G.setPose(p);
  // ---------- vehicles (parked in front of the house, alley start) ----------
  const vehicles: any[] = [];
  const beamTex = canvasTex(32, 64, (g) => {
    const gr = g.createLinearGradient(0, 64, 0, 0); gr.addColorStop(0, 'rgba(255,240,200,.55)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(12, 64); g.lineTo(20, 64); g.lineTo(32, 0); g.lineTo(0, 0); g.closePath(); g.fill();
  });
  function headlight(parent, x, y, z, dist, intensity) {
    const spot = new THREE.SpotLight(0xfff0c8, 0, dist, 0.55, 0.6, 1.2);
    spot.position.set(x, y, z); const tgt = new THREE.Object3D(); tgt.position.set(x, 0, z + 8);
    parent.add(spot); parent.add(tgt); spot.target = tgt; spot.userData.on = intensity; return spot;
  }
  function beam(parent, w, l, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshBasicMaterial({ map:beamTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI/2; m.rotation.z = Math.PI; m.position.set(0, 0.03, z + l/2); m.visible = false; parent.add(m); return m;
  }
  function wheel(r, w, mat) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 8), mat); m.rotation.z = Math.PI/2; const g = new THREE.Group(); g.add(m); return g; }

  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  function makeCar(x, z, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    const paint = lam({ color:0xa7c3c4 }), trim = lam({ color:0x3a3c3e }), tyre = lam({ color:0x222222 });
    const winTex = canvasTex(32, 16, (c) => { c.fillStyle='#a7c3c4'; c.fillRect(0,0,32,16); c.fillStyle='#3f4e60'; c.fillRect(2,2,13,12); c.fillRect(17,2,13,12); c.fillStyle='#6d8296'; c.fillRect(3,3,5,2); c.fillRect(18,3,5,2); });
    const shieldTex = canvasTex(32, 16, (c) => { c.fillStyle='#a7c3c4'; c.fillRect(0,0,32,16); c.fillStyle='#3f4e60'; c.fillRect(2,2,28,12); c.fillStyle='#6d8296'; c.fillRect(4,3,10,2); });
    const win = lam({ map:winTex }), shield = lam({ map:shieldTex });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.58, 2.9), paint); body.position.y = 0.6; g.add(body);
    const cabinMats = [win, win, paint, paint, shield, shield];
    // with the windscreen open you look into the cabin, so its inside faces have to draw too
    const inWin = lam({ map:winTex, side:THREE.DoubleSide }), inPaint = lam({ color:0xa7c3c4, side:THREE.DoubleSide }), inShield = lam({ map:shieldTex, side:THREE.DoubleSide });
    const openMats = [inWin, inWin, inPaint, inPaint, hidden, inShield];
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.62, 2.0), cabinMats); cabin.position.set(0, 1.2, -0.25); g.add(cabin);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 2.04), paint); roof.position.set(0, 1.53, -0.25); g.add(roof);
    // while driving the windscreen is open, so you can see souka at the wheel from the front
    const openFront = (open) => { cabin.material = open ? openMats : cabinMats; };
    for (const zz of [1.47, -1.47]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.1), trim); b.position.set(0, 0.38, zz); g.add(b); }
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.02), lam({ color:0xf0eee4 })); plate.position.set(0, 0.55, 1.46); g.add(plate);
    const lampOff = new THREE.MeshBasicMaterial({ color:0xb9b8ae }), lampOn = new THREE.MeshBasicMaterial({ color:0xfff6cf });
    const tailOff = new THREE.MeshBasicMaterial({ color:0x6e2a26 }), tailOn = new THREE.MeshBasicMaterial({ color:0xff3a2a });
    const lamps = [], tails = [];
    for (const sx of [-0.5, 0.5]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.04), lampOff); l.position.set(sx, 0.72, 1.46); g.add(l); lamps.push(l);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.04), tailOff); t.position.set(sx*1.1, 0.72, -1.46); g.add(t); tails.push(t);
    }
    const wheels = [], fronts = [];
    for (const [wx, wz] of [[-0.66, 0.95], [0.66, 0.95], [-0.66, -0.95], [0.66, -0.95]]) {
      const w = wheel(0.27, 0.2, tyre); const piv = new THREE.Group(); piv.position.set(wx, 0.27, wz); piv.add(w); g.add(piv);
      wheels.push(w); if (wz > 0) fronts.push(piv);
    }
    const spot = headlight(g, 0, 0.75, 1.5, 18, 2.2);
    const bm = beam(g, 3.2, 7, 1.5);
    // driver's seat: head (r 0.36, centre 0.74 above the hips) stays inside the cabin (y 0.89-1.51, x ±0.68)
    const v = { type:'car', name:'차', g, openFront, seat:{ x:-0.28, z:-0.15, y:0.36 }, heading:rot, speed:0, steer:0, lights:false, wheels, fronts, wheelR:0.27,
      spec:{ max:7.5, rev:-2.8, acc:4.5, brake:9, turn:1.25 }, circles:[[0,-1.0,0.78],[0,0,0.78],[0,1.0,0.78]],
      size:[1.5, 3.0], grab:2.1, exit:1.25, seatY:0, lamps, tails, lampOn, lampOff, tailOn, tailOff, spot, beam:bm };
    vehicles.push(v); return v;
  }

  function makeBike(x, z, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    const lean = new THREE.Group(); g.add(lean);
    const dark = lam({ color:0x2b2b2b }), frame = lam({ color:0xb8584a }), chrome = lam({ color:0xa9adb0 });
    const rear = wheel(0.32, 0.05, dark); const rp = new THREE.Group(); rp.position.set(0, 0.32, -0.48); rp.add(rear); lean.add(rp);
    const fork = new THREE.Group(); fork.position.set(0, 0, 0.48); lean.add(fork);
    const front = wheel(0.32, 0.05, dark); const fp = new THREE.Group(); fp.position.set(0, 0.32, 0); fp.add(front); fork.add(fp);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.85), frame); top.position.set(0, 0.62, 0.02); lean.add(top);
    const down = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.8), frame); down.position.set(0, 0.46, 0.05); down.rotation.x = 0.62; lean.add(down);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.05), frame); post.position.set(0, 0.6, -0.3); lean.add(post);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.24), dark); saddle.position.set(0, 0.82, -0.3); lean.add(saddle);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), chrome); stem.position.set(0, 0.6, 0); fork.add(stem);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.04), dark); bar.position.set(0, 0.9, -0.05); fork.add(bar);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.26), chrome); basket.position.set(0, 0.8, 0.2); fork.add(basket);
    const lampOff = new THREE.MeshBasicMaterial({ color:0xb9b8ae }), lampOn = new THREE.MeshBasicMaterial({ color:0xfff6cf });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.06), lampOff); lamp.position.set(0, 0.72, 0.36); fork.add(lamp);
    const spot = headlight(g, 0, 0.75, 0.7, 10, 1.2);
    const bm = beam(g, 1.4, 4, 0.7);
    const v = { type:'bike', name:'자전거', g, lean, heading:rot, speed:0, steer:0, lights:false, wheels:[rear, front], fronts:[fork], wheelR:0.32,
      spec:{ max:4.6, rev:-0.8, acc:2.6, brake:6, turn:1.9 }, circles:[[0,-0.4,0.28],[0,0.4,0.28]],
      size:[0.5, 1.4], grab:1.3, exit:0.65, seatY:0.74, lamps:[lamp], tails:[], lampOn, lampOff, spot, beam:bm };
    vehicles.push(v); return v;
  }
  /** A car model from the warehouse (pack3): no moving parts, but it drives, steers and has headlights. */
  function addModelCar(o) {
    const g = o.g, sc = g.scale.x, w = o.size.w, d = o.size.d;
    const spot = headlight(g, 0, 0.7 / sc, d / 2, 18, 2.2);
    const bm = beam(g, 3.2 / sc, 7 / sc, d / 2);
    const r = w * sc * 0.5;
    // closed models: souka gets in and is not drawn while driving (it would poke through the body)
    const v = { type:'car', name:o.label, g, o, hideRider:true, seat:{ x:0, z:0, y:0 }, heading:g.rotation.y, speed:0, steer:0, lights:false, wheels:[], fronts:[], wheelR:0.3,
      spec:{ max:8.5, rev:-2.8, acc:5, brake:9, turn:1.2 }, circles:[[0, -d*sc*0.32, r], [0, 0, r], [0, d*sc*0.32, r]],
      size:[w*sc, d*sc], grab:d*sc*0.5 + 0.7, exit:w*sc*0.5 + 0.5, seatY:0, lamps:[], tails:[], lampOn:null, lampOff:null, spot, beam:bm };
    vehicles.push(v); return v;
  }
  /** Parked outdoors and not put away (warehouse cars can also sit in the house as decoration). */
  const vehicleLive = (v) => !v.o || (!v.o.hidden && v.g.parent === scene);
  const inCity = () => S.area === 'city';

  const myCar = makeCar(-1.55, 5.6, Math.PI);   // parked nose toward the alley (-z)
  const myBike = makeBike(2.3, 10.6, Math.PI - 0.2);

  function vehFootprint(v) {
    const c = Math.abs(Math.cos(v.heading)), s = Math.abs(Math.sin(v.heading));
    const hx = (c*v.size[0] + s*v.size[1]) / 2, hz = (s*v.size[0] + c*v.size[1]) / 2;
    return { minX:v.g.position.x-hx, maxX:v.g.position.x+hx, minZ:v.g.position.z-hz, maxZ:v.g.position.z+hz, veh:v };
  }
  function refreshDynCols() {
    for (let i = vehicles.length - 1; i >= 0; i--) if (vehicles[i].o && !vehicles[i].g.parent && vehicles[i] !== S.riding) vehicles.splice(i, 1);  // put away
    dynCols.length = 0;
    for (const v of vehicles) {
      if (!vehicleLive(v) || v === S.riding) continue;
      if (v.o) v.heading = v.g.rotation.y;   // it may have been turned in edit mode
      dynCols.push(vehFootprint(v));
    }
  }
  function vehBlocked(v, x, z, h) {
    const sn = Math.sin(h), cs = Math.cos(h);
    for (const [ox, oz, r] of v.circles) {
      const px = x + ox*cs + oz*sn, pz = z - ox*sn + oz*cs;
      for (const list of [colliders, dynCols]) for (const c of list) {
        if (c.veh === v) continue;
        const qx = Math.max(c.minX, Math.min(px, c.maxX)), qz = Math.max(c.minZ, Math.min(pz, c.maxZ));
        if ((px-qx)*(px-qx) + (pz-qz)*(pz-qz) < r*r) return true;
      }
      if (!G.inOutBounds(px, pz, 0.3)) return true;
    }
    return false;
  }
  function setLights(v, on) {
    v.lights = on;
    for (const l of v.lamps) l.material = on ? v.lampOn : v.lampOff;
    for (const t of v.tails) t.material = on ? v.tailOn : v.tailOff;
    v.spot.intensity = on ? v.spot.userData.on : 0; v.beam.visible = on;
  }
  function mount(v) {
    S.riding = v; v.speed = 0; S.seat = null; S.speedNow = 0;
    if (v.type === 'car') {
      // the home-made car: souka at the wheel (normal size, so it fits); the warehouse models: out of sight
      char.scale.setScalar(1); S.seatY = v.seat.y; setPose('drive');
      if (v.hideRider) char.visible = false;
      if (v.openFront) v.openFront(true);
      placeRider(v);
    } else { S.seatY = v.seatY; setPose('ride'); }
    toast(v.type === 'car' ? '차에 탔다. 부릉.' : '자전거에 탔다.');
  }
  function dismount() {
    const v = S.riding; if (!v) return;
    if (Math.abs(v.speed) > 0.6) { toast('멈추고 내리자.'); return; }
    const h = v.heading, sn = Math.sin(h), cs = Math.cos(h), px = v.g.position.x, pz = v.g.position.z;
    // the car itself must not count as an obstacle (dynCols leaves out the one being ridden), so search first
    refreshDynCols();
    const ok = (x: number, z: number): number | null => {
      if (collide(x, z)) return null;
      if (inCity()) { const gy = G.city.groundAt(x, z, v.g.position.y + 0.6); return gy === null || Math.abs(gy - v.g.position.y) > 0.6 ? null : gy; }
      return G.inOutBounds(x, z) ? 0 : null;
    };
    // driver's door, other door, behind, in front, then anywhere around the car further out
    const side = v.size[0] / 2 + 0.45, end = v.size[1] / 2 + 0.45;
    const tries: [number, number][] = [[-cs*side, sn*side], [cs*side, -sn*side], [-sn*end, -cs*end], [sn*end, cs*end]];
    for (let r = Math.max(side, 0.9); r <= end + 2.5; r += 0.35)
      for (let a = 0; a < 20; a++) tries.push([Math.sin(a / 20 * Math.PI * 2) * r, Math.cos(a / 20 * Math.PI * 2) * r]);
    let spot: [number, number, number] | null = null;
    for (const [dx, dz] of tries) { const y = ok(px + dx, pz + dz); if (y !== null) { spot = [px + dx, y, pz + dz]; break; } }
    if (!spot) { toast('내릴 자리가 없어.'); return; }
    S.riding = null; refreshDynCols();
    char.position.set(spot[0], spot[1], spot[2]);
    if (v.openFront) v.openFront(false);
    v.speed = 0; char.visible = true; char.scale.setScalar(S.size || 1); char.rotation.y = h; S.seatY = 0; setPose('stand');
  }
  /** Put souka in the driver's seat (car-local offset, turned with the car). */
  function placeRider(v) {
    const s = v.seat, sc = v.g.scale.x || 1, sn = Math.sin(v.heading), cs = Math.cos(v.heading);
    char.position.set(v.g.position.x + (s.x * cs + s.z * sn) * sc, v.g.position.y, v.g.position.z + (-s.x * sn + s.z * cs) * sc);
    char.rotation.y = v.heading;
  }
  function updateRide(dt) {
    const v = S.riding, sp = v.spec;
    const thr = (keys['w']||keys['arrowup'] ? 1 : 0) - (keys['s']||keys['arrowdown'] ? 1 : 0);
    if (thr > 0) v.speed += (v.speed < 0 ? sp.brake : sp.acc) * dt;
    else if (thr < 0) v.speed -= (v.speed > 0 ? sp.brake : sp.acc * 0.6) * dt;
    else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 2.4 * dt);
    v.speed = THREE.MathUtils.clamp(v.speed, sp.rev, sp.max);
    const steerIn = (keys['a']||keys['arrowleft'] ? 1 : 0) - (keys['d']||keys['arrowright'] ? 1 : 0);
    v.steer += (steerIn - v.steer) * Math.min(1, dt * 6);
    const nh = v.heading + v.steer * sp.turn * dt * THREE.MathUtils.clamp(v.speed / 2.5, -1, 1);
    const nx = v.g.position.x + Math.sin(nh) * v.speed * dt, nz = v.g.position.z + Math.cos(nh) * v.speed * dt;
    let ny = v.g.position.y, ok = true;
    if (inCity()) {
      // the city map: walls and kerbs come from its triangle grid, and the car follows the ground
      const gy = G.city.moveTo(v.g.position.x, v.g.position.y, v.g.position.z, nx, nz, v.size[1] / 2 + 0.2);
      if (gy === null) ok = Math.abs(v.speed) < 0.01; else ny = gy;
    }
    if (!ok || vehBlocked(v, nx, nz, nh)) { v.speed *= -0.15; }
    else { v.g.position.x = nx; v.g.position.z = nz; v.g.position.y = ny; v.heading = nh; }
    v.g.rotation.y = v.heading;
    for (const w of v.wheels) w.rotation.x += v.speed * dt / v.wheelR;
    for (const f of v.fronts) f.rotation.y = v.steer * 0.45;
    if (v.lean) v.lean.rotation.z = -v.steer * 0.22 * THREE.MathUtils.clamp(v.speed / sp.max, 0, 1);
    if (v.type === 'car' && v.tails.length) { const braking = thr < 0 && v.speed > 0.2; for (const t of v.tails) t.material = (braking || v.lights) ? v.tailOn : v.tailOff; }
    // rider + camera follow
    if (v.type === 'bike') {
      char.position.set(v.g.position.x - Math.sin(v.heading) * 0.3, v.g.position.y, v.g.position.z - Math.cos(v.heading) * 0.3);
      char.rotation.y = v.heading; S.walkPhase += dt * v.speed * 3.2;
    } else placeRider(v);
    if (Math.abs(v.speed) > 0.5 && !S.drag && !S.reels) {
      const want = v.heading + (v.speed > 0 ? Math.PI : Math.PI);
      let d = want - S.camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.camYaw += d * Math.min(1, dt * 2.2);
    }
  }

  Object.assign(G, { vehicles, myCar, myBike, refreshDynCols, mount, dismount, setLights, updateRide, addModelCar, vehicleLive });
}
