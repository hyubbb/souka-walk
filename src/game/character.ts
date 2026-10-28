// souka: low-poly body, face decals (eyes / mouth / blush), accessories and poses.
import * as THREE from 'three';
import type { Game, Pose } from './types';
import { HX } from './core';

export const EXPR = [
  { key: 'default', label: '기본' }, { key: 'blink', label: '깜빡' }, { key: 'surprised', label: '놀람' },
  { key: 'happy', label: '행복' }, { key: 'confused', label: '혼란' }, { key: 'suspicious', label: '의심' },
];
export const MOUTHS = [{ key: 'line', label: '일자' }, { key: 'cat', label: ':3' }, { key: 'o', label: 'o' }];
export const ACC = [{ key: 'blush', label: '볼터치' }, { key: 'hat', label: '털모자' }, { key: 'phones', label: '헤드폰' }] as const;
export const POSES: { key: Pose; label: string }[] = [{ key: 'stand', label: '서기' }, { key: 'think', label: '생각' }, { key: 'sit', label: '앉기' }, { key: 'lie', label: '눕기' }];

export function buildCharacter(G: Game) {
  const { scene, canvasTex, S } = G;
  const skin = new THREE.MeshPhongMaterial({ color:0xece9e1, flatShading:true, shininess:0, specular:0x000000, emissive:0x1c1b18 });
  const char = new THREE.Group();     // world position + facing
  const body = new THREE.Group();     // pose root (for sit / lie)
  char.add(body);

  const headGroup = new THREE.Group();
  const headMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 1), skin);
  headMesh.scale.set(1.0, 0.94, 0.96); headGroup.add(headMesh);

  // face decals
  function eyeTex(type, side) {
    return canvasTex(128, 128, (g) => {
      g.scale(4, 4); g.clearRect(0,0,32,32); g.strokeStyle='#121212'; g.fillStyle='#121212'; g.lineWidth=2.6;
      const c=16, r=12.5;
      if (type==='blink') { g.fillRect(3,15,26,3); return; }
      if (type==='happy') { g.beginPath(); g.arc(16,23,10,Math.PI*1.15,Math.PI*1.85); g.stroke(); return; }
      g.beginPath(); g.arc(c,c,r,0,Math.PI*2); g.stroke();
      let px=c+side*5, py=c+1, pr=2.6;
      if (type==='surprised') { px=c; py=c; pr=1.9; }
      if (type==='confused')  { px=c+(side>0?6:-6); py=c+(side>0?-5:5); }
      if (type==='suspicious'){ g.clearRect(0,0,32,10); g.fillRect(2,9,28,3); px=c+side*6; py=c+1; }
      g.beginPath(); g.arc(px,py,pr,0,Math.PI*2); g.fill();
    });
  }
  const eyeTexL: Record<string, THREE.Texture> = {}, eyeTexR: Record<string, THREE.Texture> = {};
  EXPR.forEach(e => { eyeTexL[e.key] = eyeTex(e.key, -1); eyeTexR[e.key] = eyeTex(e.key, 1); });
  const mouthTex = canvasTex(64, 32, (g) => { g.scale(4, 4); g.clearRect(0,0,16,8); g.fillStyle='#121212'; g.fillRect(2,3,12,2); });
  function decal(tex, size, x, y, R) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map:tex, alphaTest:0.5, polygonOffset:true, polygonOffsetFactor:-4 }));
    const z = Math.sqrt(Math.max(0.0001, R*R - x*x - y*y));
    const n = new THREE.Vector3(x, y, z).normalize();
    m.position.copy(n.clone().multiplyScalar(R)); m.lookAt(n.clone().multiplyScalar(R*3));
    headGroup.add(m); return m;
  }
  const eyeL = decal(eyeTexL.default, 0.2, -0.15, -0.07, 0.372);   // smaller, lower (viewer's left)
  const eyeR = decal(eyeTexR.default, 0.25, 0.16, 0.035, 0.38);     // bigger, higher
  const mouth = decal(mouthTex, 0.075, 0.02, -0.13, 0.352);
  const mouthMat = mouth.material as THREE.MeshBasicMaterial;
  mouth.scale.y = 0.5;
  headGroup.position.y = 1.07;
  const mouthTexes: Record<string, THREE.Texture> = {
    line: mouthTex,
    cat: canvasTex(64, 32, (g) => { g.scale(4, 4); g.clearRect(0,0,16,8); g.strokeStyle='#121212'; g.lineWidth=1.3; g.lineCap='round'; g.beginPath(); g.moveTo(2.5,2.5); g.quadraticCurveTo(5,7,8,3.6); g.quadraticCurveTo(11,7,13.5,2.5); g.stroke(); }),
    o: canvasTex(64, 32, (g) => { g.scale(4, 4); g.clearRect(0,0,16,8); g.strokeStyle='#121212'; g.lineWidth=1.2; g.beginPath(); g.ellipse(8,4,1.9,2.4,0,0,7); g.stroke(); }),
  };
  function setMouth(k) {
    S.mouth = k; mouthMat.map = mouthTexes[k]; mouthMat.needsUpdate = true;
    const sc = k === 'cat' ? 1.45 : 1; mouth.scale.set(sc, 0.5*sc, 1);
    G.notify();
  }
  const blushTex = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16,16,2,16,16,15); gr.addColorStop(0,'rgba(255,135,150,.8)'); gr.addColorStop(1,'rgba(255,135,150,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(16,16,15,11,0,0,7); g.fill(); });
  function softDecal(t, size, x, y, R) { const m = decal(t, size, x, y, R); m.material = new THREE.MeshBasicMaterial({ map:t, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-3 }); m.scale.y = 0.7; return m; }
  const blush = [softDecal(blushTex, 0.14, -0.225, -0.165, 0.356), softDecal(blushTex, 0.14, 0.255, -0.115, 0.356)];
  const hat = new THREE.Group();
  { const hm = new THREE.MeshPhongMaterial({ color:0xe2ad48, flatShading:true, shininess:0, specular:0, side:THREE.DoubleSide });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.385, 10, 5, 0, Math.PI*2, 0, Math.PI*0.36), hm); hat.add(cap);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.352, 0.36, 0.085, 12, 1, true), new THREE.MeshPhongMaterial({ color:0xc98f2e, flatShading:true, shininess:0, specular:0, side:THREE.DoubleSide })); band.position.y = 0.15; hat.add(band);
    const pom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), hm); pom.position.y = 0.42; hat.add(pom);
    hat.rotation.x = -0.12; hat.scale.set(1, 0.94, 0.96); hat.visible = false; headGroup.add(hat); }
  const phones = new THREE.Group();
  { const pm = new THREE.MeshPhongMaterial({ color:0xf3f1ea, flatShading:true, shininess:20, specular:0x222222 }), pad = new THREE.MeshPhongMaterial({ color:0xf2a4b4, flatShading:true, shininess:0, specular:0 });
    const bandT = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.026, 4, 14, Math.PI), pm); bandT.position.y = 0.0; phones.add(bandT);
    for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.07, 10), pm); c.rotation.z = Math.PI/2; c.position.set(sx*0.39, -0.02, 0); phones.add(c);
      const pd = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 10), pad); pd.rotation.z = Math.PI/2; pd.position.set(sx*0.35, -0.02, 0); phones.add(pd); }
    phones.scale.set(1, 0.94, 1); phones.visible = false; headGroup.add(phones); }
  function applyAcc() {
    for (const b of blush) b.visible = S.acc.blush; hat.visible = S.acc.hat; phones.visible = S.acc.phones;
    G.notify();
  }
  body.add(headGroup);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.4, 7), skin); torso.position.y = 0.55; body.add(torso);
  function limb(len, r, x, y, handR, foot?) {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r, r*1.05, len, 6), skin); seg.position.y = -len/2; pivot.add(seg);
    if (handR) { const h = new THREE.Mesh(new THREE.IcosahedronGeometry(handR, 0), skin); h.position.y = -len - handR*0.4; pivot.add(h); }
    if (foot) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.16), skin); f.position.set(0, -len, 0.025); pivot.add(f); }
    body.add(pivot); return pivot;
  }
  const legL = limb(0.32, 0.058, -0.075, 0.38, 0, true);
  const legR = limb(0.32, 0.058,  0.075, 0.38, 0, true);
  const armL = limb(0.29, 0.043, -0.165, 0.71, 0.055);
  const armR = limb(0.29, 0.043,  0.165, 0.71, 0.055);
  armL.rotation.z = -0.14; armR.rotation.z = 0.14;
  // feet stand on y=0: leg pivot 0.38 - 0.32 - 0.035
  body.position.y = 0.035;

  // blob shadow
  const blobTex = canvasTex(16,16,(g)=>{ const gr=g.createRadialGradient(8,8,1,8,8,8); gr.addColorStop(0,'rgba(0,0,0,.55)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,16,16); });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshBasicMaterial({ map:blobTex, transparent:true, depthWrite:false }));
  blob.rotation.x = -Math.PI/2; blob.position.y = 0.012; scene.add(blob);

  char.position.set(HX + 3.2, 0, 4.6); char.rotation.y = 0.6; // morning: next to the bed
  scene.add(char);

  const eyeMatL = eyeL.material as THREE.MeshBasicMaterial, eyeMatR = eyeR.material as THREE.MeshBasicMaterial;
  function setExpr(k: string) {
    if (S.expr === k) return;
    S.expr = k; eyeMatL.map = eyeTexL[k]; eyeMatR.map = eyeTexR[k];
    if (S.photo) G.notify();
  }
  function setPose(k: Pose) { S.pose = k; G.notify(); }
  function toggleAcc(k: 'blush' | 'hat' | 'phones') { S.acc[k] = !S.acc[k]; applyAcc(); }

  /** Set the limbs for the current pose; called every frame. */
  function applyPose(dt: number) {
    body.rotation.set(0, 0, 0); body.position.set(0, 0.035, 0); headGroup.rotation.set(0, 0, 0);
    legL.rotation.set(0, 0, 0); legR.rotation.set(0, 0, 0);
    armL.rotation.set(0, 0, -0.14); armR.rotation.set(0, 0, 0.14);
    const { pose, walkPhase, speedNow, seatY } = S;
    if (pose === 'stand') {
      const walk = Math.min(1, speedNow / 2);
      const s = Math.sin(walkPhase) * walk;
      const run = THREE.MathUtils.clamp((speedNow - 2.1) / 2.3, 0, 1);
      legL.rotation.x = s * (0.6 + 0.35 * run); legR.rotation.x = -s * (0.6 + 0.35 * run);
      armL.rotation.x = -s * (0.45 + 0.6 * run); armR.rotation.x = s * (0.45 + 0.6 * run);
      body.rotation.x = 0.16 * run;
      body.position.y = 0.035 + Math.abs(Math.sin(walkPhase)) * 0.03 * walk + seatY;
      headGroup.rotation.z = Math.sin(walkPhase) * 0.04 * walk;
      if (S.held) { armL.rotation.set(-1.25, 0, 0.32); armR.rotation.set(-1.25, 0, -0.32); }
      if (speedNow === 0 && !S.held && !S.riding) {   // idle: little head tilt, sometimes looks around
        S.idleT += dt;
        headGroup.rotation.z = Math.sin(S.idleT * 0.9) * 0.05;
        headGroup.rotation.y = Math.pow(Math.max(0, Math.sin(S.idleT * 0.35)), 3) * 0.4;
      } else S.idleT = 0;
    } else if (pose === 'think') {
      armR.rotation.set(-2.15, 0, -0.35); armL.rotation.set(-0.55, 0, 0.35);
      headGroup.rotation.z = 0.12; headGroup.rotation.x = 0.06;
    } else if (pose === 'sit') {
      body.position.y = seatY - 0.33;
      legL.rotation.x = legR.rotation.x = seatY < 0.1 ? -1.25 : -1.5;
      armL.rotation.set(-0.9, 0, -0.05); armR.rotation.set(-0.9, 0, 0.05);
      headGroup.rotation.x = 0.08;
    } else if (pose === 'ride') {
      body.position.y = seatY - 0.33;
      const s = Math.sin(walkPhase);
      legL.rotation.x = -1.05 + s * 0.45; legR.rotation.x = -1.05 - s * 0.45;
      armL.rotation.set(-1.2, 0, 0.12); armR.rotation.set(-1.2, 0, -0.12);
      body.rotation.x = 0.12; headGroup.rotation.x = -0.05;
    } else if (pose === 'lie') {
      body.rotation.x = Math.PI / 2 - 0.05; body.position.set(0, 0.19 + seatY, -0.6);
      armL.rotation.set(0, 0, -0.25); armR.rotation.set(0, 0, 0.25);
      headGroup.rotation.y = 0.9;
    }
  }

  Object.assign(G, { char, body, headGroup, blob, eyeTexL, eyeTexR, mouthTexes, setExpr, setMouth, setPose, applyAcc, toggleAcc, applyPose });
}
