// souka: smooth soft-vinyl body (character sheet v2), a face painted on the head (eyes / mouth / blush), accessories and poses.
import * as THREE from 'three';
import type { Game, Pose } from './types';
import { HX } from './core';

export const EXPR = [
  { key: 'default', label: '기본' }, { key: 'blink', label: '깜빡' }, { key: 'surprised', label: '놀람' },
  { key: 'happy', label: '행복' }, { key: 'confused', label: '혼란' }, { key: 'suspicious', label: '의심' },
  { key: 'love', label: '두근' },
];
export const MOUTHS = [{ key: 'line', label: '일자' }, { key: 'cat', label: ':3' }, { key: 'o', label: 'o' }];
export const ACC = [{ key: 'blush', label: '볼터치' }, { key: 'hat', label: '털모자' }, { key: 'phones', label: '헤드폰' }] as const;
export const POSES: { key: Pose; label: string }[] = [
  { key: 'stand', label: '서기' }, { key: 'think', label: '생각' }, { key: 'sit', label: '앉기' }, { key: 'hug', label: '무릎 안기' },
  { key: 'money', label: '돈 들기' }, { key: 'count', label: '돈 세기' }, { key: 'peek', label: '엿보기' }, { key: 'lie', label: '눕기' },
];
/** Poses where souka is down on the floor (camera aims lower, moving makes souka get up). */
export const LOW_POSES: Pose[] = ['sit', 'hug', 'count', 'lie'];

export function buildCharacter(G: Game) {
  const { scene, canvasTex, S } = G;
  // smooth, slightly soft-vinyl white (sheet v2): smooth shading, a faint broad highlight
  const skin = new THREE.MeshPhongMaterial({ color:0xf1efe9, shininess:8, specular:0x141414, emissive:0x1c1c1c });
  /** A round-ended tube along -y from the pivot (r0 at the top, r1 at the bottom end), like soft clay. */
  function capsule(len: number, r0: number, r1: number) {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 - (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r1, -len + r1 - Math.sin(a) * r1)); }
    // round top centred on the pivot: the limb turns like a ball joint and never comes apart at the shoulder / hip
    for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0)); }
    return new THREE.LatheGeometry(pts, 18);
  }
  const char = new THREE.Group();     // world position + facing
  const body = new THREE.Group();     // pose root (for sit / lie)
  char.add(body);

  const headGroup = new THREE.Group();
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.36, 36, 26), skin);
  headMesh.scale.set(1.04, 0.96, 1.0); headGroup.add(headMesh);

  // face decals
  function eyeTex(type, side) {
    return canvasTex(128, 128, (g) => {
      g.scale(4, 4); g.clearRect(0,0,32,32); g.strokeStyle='#121212'; g.fillStyle='#121212'; g.lineWidth=2.4;
      const c=16, r=12.5;
      if (type==='blink') { g.fillRect(3,15,26,3); return; }
      if (type==='happy') { g.beginPath(); g.arc(16,23,10,Math.PI*1.15,Math.PI*1.85); g.stroke(); return; }
      g.beginPath(); g.arc(c,c,r,0,Math.PI*2); g.stroke();
      let px=c+(side>0?3:1), py=c+1, pr=3.3;   // both pupils glance a little to the viewer's right
      if (type==='surprised') { px=c; py=c; pr=1.9; }
      if (type==='confused')  { px=c+(side>0?6:-6); py=c+(side>0?-5:5); }
      if (type==='suspicious'){ g.clearRect(0,0,32,10); g.fillRect(2,9,28,3); px=c+side*6; py=c+1; }
      if (type==='love') {
        if (side > 0) {   // the big eye squeezes shut with a little pink heart beside it
          g.clearRect(0,0,32,32); g.beginPath(); g.arc(c,c,r,0,Math.PI*2); g.stroke(); g.fillRect(4,15,24,2.6);
          g.beginPath(); g.arc(c-4,c+5,2.2,0,Math.PI*2); g.fill(); return;
        }
        px=c+3; py=c+3;
      }
      g.beginPath(); g.arc(px,py,pr,0,Math.PI*2); g.fill();
    });
  }
  const eyeTexL: Record<string, THREE.Texture> = {}, eyeTexR: Record<string, THREE.Texture> = {};
  EXPR.forEach(e => { eyeTexL[e.key] = eyeTex(e.key, -1); eyeTexR[e.key] = eyeTex(e.key, 1); });
  const mouthTex = canvasTex(64, 32, (g) => { g.scale(4, 4); g.clearRect(0,0,16,8); g.fillStyle='#121212'; g.fillRect(2,3,12,2); });
  // The face is painted straight onto the head's own texture (not stuck-on planes), so the eyes and mouth
  // follow the curve of the head instead of floating in front of it like glasses.
  // One texture per face (expression × mouth × blush), made once and reused, so blinking costs nothing.
  const FW = 1536, FH = 768;
  let fg: CanvasRenderingContext2D;
  const headMat = skin.clone(); headMesh.material = headMat;
  const faces = new Map<string, THREE.CanvasTexture>();
  /** Draw an image centred on the head point (x, y) (front view, radius R), w × h in head units. */
  function paint(img: CanvasImageSource, x: number, y: number, R: number, w: number, h: number) {
    const z = Math.sqrt(Math.max(1e-4, R * R - x * x - y * y));
    const theta = Math.acos(y / R), phi = Math.atan2(z, -x);           // SphereGeometry: x = -cos(phi) sin(theta), z = sin(phi) sin(theta)
    const cx = phi / (Math.PI * 2) * FW, cy = theta / Math.PI * FH;
    const pw = (w / R) / (Math.PI * 2) * FW / Math.sin(theta), ph = (h / R) / Math.PI * FH;
    fg.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  }
  headGroup.position.y = 0.915;   // sheet: about 3.5 heads tall, the head is over half of souka
  const mouthTexes: Record<string, THREE.Texture> = {
    line: mouthTex,
    cat: canvasTex(64, 32, (g) => { g.scale(4, 4); g.clearRect(0,0,16,8); g.strokeStyle='#121212'; g.lineWidth=1.3; g.lineCap='round'; g.beginPath(); g.moveTo(2.5,2.5); g.quadraticCurveTo(5,7,8,3.6); g.quadraticCurveTo(11,7,13.5,2.5); g.stroke(); }),
    o: canvasTex(64, 32, (g) => { g.scale(4, 4); g.clearRect(0,0,16,8); g.strokeStyle='#121212'; g.lineWidth=1.2; g.beginPath(); g.ellipse(8,4,1.9,2.4,0,0,7); g.stroke(); }),
  };
  const blushTex = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16,16,2,16,16,15); gr.addColorStop(0,'rgba(255,135,150,.8)'); gr.addColorStop(1,'rgba(255,135,150,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(16,16,15,11,0,0,7); g.fill(); });
  function drawFace() {
    const key = `${S.expr || 'default'}|${S.mouth || 'line'}|${S.acc.blush ? 1 : 0}`;
    let tex = faces.get(key);
    if (!tex) {
      const c = document.createElement('canvas'); c.width = FW; c.height = FH; fg = c.getContext('2d')!;
      paintFace();
      tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; faces.set(key, tex);
    }
    if (headMat.map !== tex) { headMat.map = tex; headMat.needsUpdate = true; }
  }
  function paintFace() {
    fg.imageSmoothingEnabled = true;
    fg.fillStyle = '#ffffff'; fg.fillRect(0, 0, FW, FH);
    if (S.acc.blush) { paint(blushTex.image, -0.24, -0.19, 0.36, 0.13, 0.09); paint(blushTex.image, 0.25, -0.16, 0.36, 0.13, 0.09); }
    const e = S.expr || 'default';
    paint(eyeTexL[e].image, -0.19, -0.06, 0.36, 0.215, 0.215);   // smaller, lower (viewer's left)
    paint(eyeTexR[e].image, 0.215, -0.005, 0.36, 0.27, 0.27);     // big, out towards the right edge
    const sc = S.mouth === 'cat' ? 1.45 : 1;
    paint(mouthTexes[S.mouth || 'line'].image, -0.015, -0.155, 0.36, 0.07 * sc, 0.035 * sc);
  }
  function setMouth(k) { S.mouth = k; drawFace(); G.notify(); }
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
    drawFace(); hat.visible = S.acc.hat; phones.visible = S.acc.phones;
    G.notify();
  }
  body.add(headGroup);

  // soft pear-shaped torso: narrow neck under the big head, round belly, round bottom
  // short, slightly bottom-heavy body with a thin neck under the big head
  const torsoPts = [[0.0, 0.19], [0.085, 0.196], [0.13, 0.23], [0.145, 0.29], [0.142, 0.37], [0.131, 0.44], [0.11, 0.51], [0.08, 0.56], [0.055, 0.6], [0.05, 0.64], [0.0, 0.66]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve(torsoPts).getPoints(24), 24), skin);
  torso.scale.z = 0.88; body.add(torso);
  function limb(len, r, x, y, handR, foot?) {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
    // arms end in a soft mitten (wider at the end), legs in a rounded foot
    const seg = new THREE.Mesh(capsule(len, r, handR || r * 1.15), skin); pivot.add(seg);
    if (foot) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 12), skin); f.scale.set(1, 0.55, 1.35); f.position.set(0, -len + 0.012, 0.03); pivot.add(f); }
    body.add(pivot); return pivot;
  }
  // shoulders sit on the torso surface, hips inside the round bottom (feet still touch y = 0)
  // stubby legs, short thick arms that end at the hips (sheet proportions)
  const legL = limb(0.225, 0.068, -0.07, 0.22, 0, true);
  const legR = limb(0.225, 0.068,  0.07, 0.22, 0, true);
  // arms start high and close to the neck and fall outward in an A shape (sloping shoulders, sheet front view)
  const ARM_Z = 0.42;
  const armL = limb(0.29, 0.048, -0.078, 0.56, 0.057);
  const armR = limb(0.29, 0.048,  0.078, 0.56, 0.057);
  armL.rotation.z = -ARM_Z; armR.rotation.z = ARM_Z;
  // feet stand on y = 0: body 0.035 + hip 0.22 - leg 0.225 + foot centre 0.012 - foot half-height 0.041
  body.position.y = 0.035;

  // money (sheet: HOLDING MONEY / COUNTING): a bundle in the hands and a few on the floor
  const billTex = canvasTex(32, 16, (g) => { g.fillStyle = '#6f9d52'; g.fillRect(0, 0, 32, 16); g.fillStyle = '#4f7a3a'; g.fillRect(0, 6, 32, 4); g.fillStyle = '#e8e4d6'; g.fillRect(13, 5, 6, 6); g.fillStyle = '#86b366'; g.fillRect(2, 2, 6, 2); g.fillRect(24, 12, 6, 2); });
  const billMat = new THREE.MeshLambertMaterial({ map: billTex });
  function bundle(n: number) {
    const b = new THREE.Group();
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.045, 0.085), billMat); m.position.set((i % 2) * 0.012, i * 0.047, ((i * 7) % 3) * 0.006); m.rotation.y = (i % 3 - 1) * 0.08; b.add(m); }
    return b;
  }
  const handMoney = bundle(3); handMoney.position.set(0, 0.36, 0.2); handMoney.visible = false; body.add(handMoney);
  const floorMoney = new THREE.Group(); floorMoney.visible = false; char.add(floorMoney);
  for (const [x, z, r, n] of [[-0.3, 0.42, 0.4, 2], [0.28, 0.48, -0.3, 3], [0.05, 0.62, 0.9, 1], [-0.12, 0.32, -0.6, 1]] as [number, number, number, number][]) {
    const b = bundle(n); b.position.set(x, 0.0, z); b.rotation.y = r; floorMoney.add(b);
  }
  const countMoney = bundle(2); countMoney.visible = false; armR.add(countMoney); countMoney.position.set(0, -0.27, 0.02); countMoney.rotation.x = Math.PI / 2;

  // blob shadow
  const blobTex = canvasTex(16,16,(g)=>{ const gr=g.createRadialGradient(8,8,1,8,8,8); gr.addColorStop(0,'rgba(0,0,0,.55)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,16,16); });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshBasicMaterial({ map:blobTex, transparent:true, depthWrite:false }));
  blob.rotation.x = -Math.PI/2; blob.position.y = 0.012; scene.add(blob);

  char.position.set(HX + 3.2, 0, 4.6); char.rotation.y = 0.6; // morning: next to the bed
  scene.add(char);

  function setExpr(k: string) {
    if (S.expr === k) return;
    S.expr = k; drawFace();
    if (S.photo) G.notify();
  }
  function setPose(k: Pose) { S.pose = k; G.notify(); }
  function toggleAcc(k: 'blush' | 'hat' | 'phones') { S.acc[k] = !S.acc[k]; applyAcc(); }
  /** souka's size; the car sets its own while you drive. */
  function setSize(s: number) {
    S.size = s; if (!(S.riding && S.riding.type === 'car')) char.scale.setScalar(s);
    try { localStorage.setItem('souka-size', String(s)); } catch { /* private mode */ }
    G.notify();
  }
  try { const v = Number(localStorage.getItem('souka-size')); if (v > 0.3 && v < 3) { S.size = v; char.scale.setScalar(v); } } catch { /* ignore */ }

  /** Set the limbs for the current pose; called every frame. */
  function applyPose(dt: number) {
    body.rotation.set(0, 0, 0); body.position.set(0, 0.035, 0); headGroup.rotation.set(0, 0, 0);
    legL.rotation.set(0, 0, 0); legR.rotation.set(0, 0, 0);
    armL.rotation.set(0, 0, -ARM_Z); armR.rotation.set(0, 0, ARM_Z);
    const { pose, walkPhase, speedNow } = S;
    const seatY = S.seatY / (char.scale.x || 1);
    handMoney.visible = pose === 'money'; floorMoney.visible = countMoney.visible = pose === 'count';
    const t = performance.now() / 1000;
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
      body.position.y = seatY - 0.15;   // hips on the seat, legs just clear of it
      legL.rotation.x = legR.rotation.x = seatY < 0.1 ? -1.25 : -1.5;
      armL.rotation.set(-0.9, 0, -0.05); armR.rotation.set(-0.9, 0, 0.05);
      headGroup.rotation.x = 0.08;
    } else if (pose === 'ride') {
      body.position.y = seatY - 0.16;
      const s = Math.sin(walkPhase);
      legL.rotation.x = -1.05 + s * 0.45; legR.rotation.x = -1.05 - s * 0.45;
      armL.rotation.set(-1.2, 0, 0.12); armR.rotation.set(-1.2, 0, -0.12);
      body.rotation.x = 0.12; headGroup.rotation.x = -0.05;
    } else if (pose === 'hug') {     // on the floor, knees up, arms around them, head down a little
      body.position.y = seatY - 0.15; body.rotation.x = 0.22;
      legL.rotation.set(-2.05, 0, 0.12); legR.rotation.set(-2.05, 0, -0.12);
      armL.rotation.set(-1.35, 0, 0.5); armR.rotation.set(-1.35, 0, -0.5);
      headGroup.rotation.x = 0.18;
    } else if (pose === 'money') {   // hugging a bundle of notes to the chest, quietly pleased
      armL.rotation.set(-1.05, 0, 0.42); armR.rotation.set(-1.05, 0, -0.42);
      headGroup.rotation.x = 0.12; headGroup.rotation.z = Math.sin(t * 1.3) * 0.04;
    } else if (pose === 'count') {   // kneeling over little piles of notes, flicking through one
      body.position.y = seatY - 0.07; body.rotation.x = 0.32;
      legL.rotation.set(-1.15, 0, 0.1); legR.rotation.set(-1.15, 0, -0.1);
      armL.rotation.set(-0.95, 0, 0.25); armR.rotation.set(-0.95 + Math.sin(t * 7) * 0.18, 0, -0.25);
      headGroup.rotation.x = 0.28;
    } else if (pose === 'peek') {    // leaning out sideways from behind something
      body.rotation.z = 0.38; body.position.x = -0.12;
      legL.rotation.z = -0.38; legR.rotation.z = -0.28;
      armL.rotation.set(-0.3, 0, -0.5); armR.rotation.set(-0.2, 0, 0.9);
      headGroup.rotation.z = 0.18; headGroup.rotation.y = Math.sin(t * 0.8) * 0.12;
    } else if (pose === 'drive') {   // in the driver's seat, hands on the wheel
      body.position.y = seatY - 0.16;
      legL.rotation.x = legR.rotation.x = -1.45;
      armL.rotation.set(-1.15, 0, -0.12); armR.rotation.set(-1.15, 0, 0.12);
      headGroup.rotation.x = 0.04; headGroup.rotation.z = Math.sin(S.walkPhase * 0.3) * 0.03;
    } else if (pose === 'lie') {
      body.rotation.x = Math.PI / 2 - 0.05; body.position.set(0, 0.19 + seatY, -0.6);
      armL.rotation.set(0, 0, -0.25); armR.rotation.set(0, 0, 0.25);
      headGroup.rotation.y = 0.9;
    }
  }

  Object.assign(G, { setSize, char, body, headGroup, blob, eyeTexL, eyeTexR, mouthTexes, setExpr, setMouth, setPose, applyAcc, toggleAcc, applyPose });
}
