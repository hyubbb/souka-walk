// The alley in front of the house: buildings, gardens, signs, poles, lamps, vending machines, the convenience store.
// Built with the seeded rnd(), so the order of calls below decides the layout - keep it.
import * as THREE from 'three';
import type { Game } from '../types';

export function buildAlley(G: Game) {
  const { scene, canvasTex, speckle, lam, rnd, addCol, occluders, O, E } = G;
  // ground
  const grassTex = canvasTex(32, 32, (g,w,h) => speckle(g,w,h,'#7d7666',0.3,0.7), [40,40]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160,160), lam({ map:grassTex }));
  ground.rotation.x = -Math.PI/2; ground.position.set(0,-0.01,-20); scene.add(ground);
  const asphalt = canvasTex(64, 64, (g,w,h) => { speckle(g,w,h,'#57534e',0.2,0.7); g.fillStyle='rgba(0,0,0,.18)'; for(let i=0;i<6;i++){g.fillRect(rnd()*w|0,rnd()*h|0,4+rnd()*10|0,1);} });
  function road(cx, cz, w, d) {
    const t = asphalt.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w/2, d/2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam({ map:t }));
    m.rotation.x = -Math.PI/2; m.position.set(cx, 0, cz); scene.add(m);
  }
  road(0, -16, 6, 58);       // alley
  road(0, -48.5, 44, 7);     // cross street
  // side paint lines
  const paint = lam({ color:0xe8e4d6 });
  for (const x of [-2.55, 2.55]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 57), paint); l.rotation.x=-Math.PI/2; l.position.set(x,0.005,-16.5); scene.add(l); }
  // "止まれ" style stop bar + crosswalk near the end
  const stopBar = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.35), paint); stopBar.rotation.x=-Math.PI/2; stopBar.position.set(0,0.006,-43.5); scene.add(stopBar);
  for (let i=0;i<7;i++){ const s=new THREE.Mesh(new THREE.PlaneGeometry(0.45,4.4),paint); s.rotation.x=-Math.PI/2; s.position.set(-2.7+i*0.9,0.006,-48.5); scene.add(s); }
  // manhole
  const manTex = canvasTex(32,32,(g)=>{g.clearRect(0,0,32,32);g.fillStyle='#3d3c3a';g.beginPath();g.arc(16,16,15,0,7);g.fill();g.strokeStyle='#555350';g.lineWidth=1;for(let r=4;r<15;r+=3){g.beginPath();g.arc(16,16,r,0,7);g.stroke();}});
  const man = new THREE.Mesh(new THREE.PlaneGeometry(1,1), lam({ map:manTex, alphaTest:0.5 })); man.rotation.x=-Math.PI/2; man.position.set(0.6,0.007,-20); scene.add(man);

  // buildings
  const WALLS = ['#e4d4b8','#dcc2a2','#efe4cf','#cdb79b','#e8c9ae','#cfdac8','#f1ddc3','#d9c7cf'];
  function buildingTex(base, lit) {
    return canvasTex(32, 32, (g,w,h) => {
      speckle(g,w,h,base,0.18,0.6);
      g.fillStyle='rgba(0,0,0,.12)'; g.fillRect(0,31,32,1);
      for (let y=5; y<28; y+=14) for (let x=4; x<28; x+=14) {
        g.fillStyle='#4b5560'; g.fillRect(x-1,y-1,10,9);
        g.fillStyle = lit && rnd()<0.45 ? '#e9d79a' : (rnd()<0.5?'#6b7a86':'#7d8b94'); g.fillRect(x,y,8,7);
        g.fillStyle='rgba(255,255,255,.25)'; g.fillRect(x,y,8,1);
        g.fillStyle='#8e8a82'; g.fillRect(x-1,y+8,10,1);
      }
    });
  }
  const roofMat = lam({ color:0x77746d });
  const buildingMats = []; // for night window swap
  function addBuilding(cx, cz, w, d, h) {
    const base = WALLS[rnd()*WALLS.length|0];
    const day = buildingTex(base, false), night = buildingTex(base, true);
    for (const t of [day, night]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    const sideX = lam({ map:day }), sideZ = lam({ map:day.clone() });
    sideX.map.repeat.set(d/3.2, h/3.2); sideZ.map.repeat.set(w/3.2, h/3.2); sideZ.map.needsUpdate = true;
    const nX = night.clone(); nX.needsUpdate=true; nX.repeat.set(d/3.2,h/3.2);
    const nZ = night.clone(); nZ.needsUpdate=true; nZ.repeat.set(w/3.2,h/3.2);
    buildingMats.push({ m:sideX, day:sideX.map, night:nX }, { m:sideZ, day:sideZ.map, night:nZ });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sideX, sideX, roofMat, roofMat, sideZ, sideZ]);
    mesh.position.set(cx, h/2, cz); scene.add(mesh); occluders.push(mesh);
    // little roof edge
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w+0.15, 0.18, d+0.15), roofMat); lip.position.set(cx, h+0.09, cz); scene.add(lip); occluders.push(lip);
    addCol(cx, cz, w, d);
  }
  // --- street furniture helpers (density) ---
  const blockTex = canvasTex(32, 16, (g,w,h) => { speckle(g,w,h,'#b9b4a8',0.18,0.6); g.fillStyle='rgba(0,0,0,.25)'; for (let y=0;y<16;y+=5) g.fillRect(0,y,32,1); for (let y=0;y<16;y+=5) for (let x=(y/5%2)*6;x<32;x+=12) g.fillRect(x,y,1,5); });
  const leafMat = new THREE.MeshPhongMaterial({ color:0x5d8a45, flatShading:true, shininess:0, specular:0 });
  const leafMat2 = new THREE.MeshPhongMaterial({ color:0x6f9b4e, flatShading:true, shininess:0, specular:0 });
  const trunkMat = lam({ color:0x6b4f3a });
  function tree(x, z, s = 1) {
    O('나무', scene);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1*s, 0.14*s, 1.6*s, 6), trunkMat); t.position.set(x, 0.8*s, z); scene.add(t);
    for (const [ox, oy, oz, r, m] of [[0,2.1,0,0.95,leafMat],[0.45,1.7,0.2,0.65,leafMat2],[-0.4,1.8,-0.25,0.7,leafMat2],[0.1,2.6,-0.1,0.6,leafMat]] as [number, number, number, number, THREE.Material][]) {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r*s, 0), m); f.position.set(x+ox*s, oy*s, z+oz*s); scene.add(f); occluders.push(f); }
    addCol(x, z, 0.35*s, 0.35*s);
    E();
  }
  function garden(side, cz, len) {
    const bw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.15, len), lam({ map:(() => { const t = blockTex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len/1.6, 1); return t; })() }));
    bw.position.set(side*3.05, 0.575, cz); scene.add(bw); occluders.push(bw); addCol(side*3.05, cz, 0.25, len);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(4.5, len), lam({ color:0x6a7f4a })); grass.rotation.x = -Math.PI/2; grass.position.set(side*5.4, 0.01, cz); scene.add(grass);
    tree(side*4.3, cz, 0.9 + rnd()*0.3);
    if (rnd() < 0.5) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.3, 6), lam({ color:0x9a6a4a })); pot.position.set(side*2.75, 0.15, cz + len/2 - 0.3); scene.add(pot);
      const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), leafMat2); pl.position.set(side*2.75, 0.45, cz + len/2 - 0.3); scene.add(pl); addCol(side*2.75, cz + len/2 - 0.3, 0.35, 0.35); }
  }
  const SIGN_WORDS = ['ラーメン','喫茶','薬局','クリーニング','居酒屋','美容室','古本','花屋','定食','たばこ'];
  const SIGN_COLS = [['#b8322a','#fff4e0'],['#2d4f7c','#ffffff'],['#f2d14b','#3a2a1a'],['#3e6b45','#f4f0e0'],['#f4efe2','#b8322a']];
  function signTex(word, cols) {
    return canvasTex(32, 128, (g) => { g.fillStyle = cols[0]; g.fillRect(0,0,32,128); g.strokeStyle = cols[1]; g.lineWidth = 2; g.strokeRect(2,2,28,124);
      g.fillStyle = cols[1]; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const ch = [...word]; const step = Math.min(26, 112 / ch.length); ch.forEach((c, i) => g.fillText(c, 16, 64 - (ch.length-1)*step/2 + i*step)); });
  }
  function maybeSign(side, cz, len, h) {
    if (rnd() > 0.45 || h < 3.5) return;
    const word = SIGN_WORDS[rnd()*SIGN_WORDS.length|0], cols = SIGN_COLS[rnd()*SIGN_COLS.length|0];
    const t = signTex(word, cols);
    const face = new THREE.MeshBasicMaterial({ map:t }), edge = lam({ color:0x555555 });
    const sg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.5, 0.1), [edge, edge, edge, edge, face, face]);
    sg.rotation.y = Math.PI/2; sg.position.set(side*(3 - 0.3), 2.9, cz + (rnd()-0.5)*len*0.4); scene.add(sg);
    if (rnd() < 0.6) { // little awning
      const aw = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, Math.min(2.4, len*0.6)), lam({ color: new THREE.Color(cols[0]) }));
      aw.position.set(side*2.7, 2.15, cz); aw.rotation.z = side*0.25; scene.add(aw);
    }
    if (rnd() < 0.5) { const ac = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.7), lam({ color:0xd8d6cf })); ac.position.set(side*2.78, 0.25, cz - len*0.3); scene.add(ac); addCol(side*2.78, cz - len*0.3, 0.45, 0.75); }
  }

  for (const side of [-1, 1]) {
    let z = 13;
    while (z > -45) {
      const len = Math.min(3 + rnd()*4, z + 45);
      const d = 5, h = 3.2 + rnd()*6;
      addBuilding(side*(3 + d/2), z - len/2, d, len, h);   // depth along x, frontage along z
      if (side === 1 || z < 4) maybeSign(side, z - len/2, len, h);
      if (rnd() < 0.32 && z - len > -40 && z - len < 6) { garden(side, z - len - 1.4, 2.8); z -= len + 2.8; }
      else z -= len + (rnd() < 0.2 ? 1.0 : 0);
    }
  }
  // back wall behind start
  addBuilding(0, 15.5, 6.2, 3, 4.5);
  // cross street far side buildings
  for (const [x, w] of [[-14,10],[14,10],[-8.2,2.2],[8.2,2.2]]) addBuilding(x, -56, w, 6, 3.5 + rnd()*5);

  // convenience store
  const storeFront = canvasTex(128, 64, (g) => {
    g.fillStyle='#ece9e1'; g.fillRect(0,0,128,64);
    g.fillStyle='#3d8a57'; g.fillRect(0,4,128,6); g.fillStyle='#e0703b'; g.fillRect(0,10,128,3);
    g.fillStyle='#f7f4ec'; g.fillRect(0,13,128,12);
    g.fillStyle='#2c3b6b'; g.font='bold 10px sans-serif'; g.textBaseline='middle'; g.fillText('ふつうマート', 6, 19.5);
    g.fillStyle='#e0703b'; g.fillText('24H', 100, 19.5);
    // glass
    for (let x=4; x<124; x+=30) { g.fillStyle='#9fc4cf'; g.fillRect(x,28,26,32); g.fillStyle='#c9e2e7'; g.fillRect(x,28,26,3);
      for (let y=36; y<58; y+=7) { g.fillStyle='#6f8f99'; g.fillRect(x+2,y,22,1); for(let k=0;k<6;k++){g.fillStyle=['#d9534f','#f0c050','#5aa0d0','#7bbf6a','#ffffff'][(rnd()*5)|0]; g.fillRect(x+3+k*3.5|0,y-3,2,3);} } }
    g.fillStyle='#55605f'; g.fillRect(64-9,30,18,30); g.fillStyle='#b9d7de'; g.fillRect(64-8,31,7,28); g.fillRect(64+1,31,7,28);
  });
  const storeMatFront = new THREE.MeshBasicMaterial({ map:storeFront });
  const storeWall = lam({ color:0xe2ded4 });
  const store = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 6), [storeWall, storeWall, roofMat, roofMat, storeMatFront, storeWall]);
  store.position.set(0, 2, -56); scene.add(store); occluders.push(store); addCol(0, -56, 14, 6);
  storeFront.wrapS = THREE.RepeatWrapping; // fine as one panel

  // vending machine
  const vendTex = canvasTex(32, 64, (g) => {
    g.fillStyle='#d8dde0'; g.fillRect(0,0,32,64); g.fillStyle='#2f6fb3'; g.fillRect(0,0,32,6);
    g.fillStyle='#f4f8fa'; g.fillRect(3,8,26,30);
    for (let r=0;r<3;r++) for (let c=0;c<5;c++){ g.fillStyle=['#d9534f','#f0c050','#5aa0d0','#7bbf6a','#8a5a3c','#ffffff'][(rnd()*6)|0]; g.fillRect(5+c*5,10+r*10,3,7); g.fillStyle='#e05050'; g.fillRect(5+c*5,18+r*10,3,1); }
    g.fillStyle='#4b5157'; g.fillRect(4,42,10,6); g.fillStyle='#222'; g.fillRect(4,52,24,8); g.fillStyle='#9aa4aa'; g.fillRect(20,42,6,6);
  });
  const vendTexRed = canvasTex(32, 64, (g) => {
    g.fillStyle='#c8382e'; g.fillRect(0,0,32,64); g.fillStyle='#ffffff'; g.fillRect(0,0,32,6);
    g.fillStyle='#f4f8fa'; g.fillRect(3,8,26,30);
    for (let r=0;r<3;r++) for (let c=0;c<5;c++){ g.fillStyle=['#d9534f','#f0c050','#5aa0d0','#7bbf6a','#8a5a3c','#ffffff'][(rnd()*6)|0]; g.fillRect(5+c*5,10+r*10,3,7); g.fillStyle='#e05050'; g.fillRect(5+c*5,18+r*10,3,1); }
    g.fillStyle='#4b5157'; g.fillRect(4,42,10,6); g.fillStyle='#222'; g.fillRect(4,52,24,8); g.fillStyle='#9aa4aa'; g.fillRect(20,42,6,6);
  });
  function vending(x, z, rotY, red?) {
    const side = lam({ color: red ? 0xc8382e : 0xd0d5d8 });
    const front = new THREE.MeshBasicMaterial({ map: red ? vendTexRed : vendTex });
    const mats = [side, side, side, side, front, side];
    O('자판기', scene);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.7), mats);
    m.position.set(x, 0.9, z); m.rotation.y = rotY; scene.add(m); addCol(x, z, 0.8, 0.9);
    E();
  }
  vending(2.45, -6, -Math.PI/2);
  vending(2.45, -7, -Math.PI/2);
  vending(-2.45, -39, Math.PI/2, true);
  vending(-2.45, -40, Math.PI/2);

  // utility poles + wires
  const poleMat = lam({ color:0x9a958c });
  const poleTops = [];
  for (let i=0; i<5; i++) {
    const z = 10 - i*12, x = (i % 2 ? 2.75 : -2.75);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 7.5, 6), poleMat); p.position.set(x, 3.75, z); scene.add(p);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), poleMat); bar.position.set(x, 7, z); scene.add(bar);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.25), lam({ color:0xf2d24c })); sign.position.set(x + (x>0?-0.13:0.13), 2.2, z); scene.add(sign);
    poleTops.push(new THREE.Vector3(x, 6.95, z)); addCol(x, z, 0.3, 0.3);
  }
  const wireMat = new THREE.LineBasicMaterial({ color:0x222222 });
  for (let i=0; i<poleTops.length-1; i++) for (const off of [-0.6, 0, 0.6]) {
    const a = poleTops[i].clone(), b = poleTops[i+1].clone(); a.x += off; b.x += off;
    const pts = []; for (let k=0;k<=10;k++){ const t=k/10; const v=a.clone().lerp(b,t); v.y -= Math.sin(t*Math.PI)*0.5; pts.push(v); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }

  // bicycles
  function bike(x, z) {
    const g = new THREE.Group(); const dark = lam({ color:0x2b2b2b }), frame = lam({ color:0x6b8fb3 });
    for (const zz of [-0.45, 0.45]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 4, 10), dark); w.position.set(0, 0.32, zz); w.rotation.y = Math.PI/2; g.add(w); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.8), frame); top.position.set(0, 0.62, 0); g.add(top);
    const down = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.75), frame); down.position.set(0, 0.45, 0.05); down.rotation.x = 0.6; g.add(down);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.22), dark); seat.position.set(0, 0.78, -0.3); g.add(seat);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), dark); bar.position.set(0, 0.85, 0.38); g.add(bar);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.25), lam({ color:0x9aa0a4 })); basket.position.set(0, 0.8, 0.6); g.add(basket);
    O('자전거(세워둔)', scene);
    g.position.set(x, 0, z); g.rotation.y = 0.15; scene.add(g); addCol(x, z, 0.5, 1.4);
    E();
  }
  bike(-2.45, -14); bike(-2.45, -15.4);

  // bench (interaction)
  O('벤치', scene);
  const benchMat = lam({ color:0x8a6a4a }), legMat = lam({ color:0x555555 });
  const bench = new THREE.Group();
  const seatB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 1.7), benchMat); seatB.position.y = 0.42; bench.add(seatB);
  const backB = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 1.7), benchMat); backB.position.set(0.24, 0.7, 0); bench.add(backB);
  for (const zz of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.06), legMat); l.position.set(0, 0.21, zz); bench.add(l); }
  bench.position.set(2.45, 0, -30); scene.add(bench); addCol(2.55, -30, 0.35, 1.7);
  E();
  const BENCH_SEAT = new THREE.Vector3(2.3, 0, -30);

  // traffic cone
  // curve mirror (カーブミラー)
  { const orange = lam({ color:0xe86a2a });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), orange); pole.position.set(2.6, 1.3, -43.2); scene.add(pole);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 12), orange); rim.rotation.x = Math.PI/2; rim.rotation.z = 0.0; rim.position.set(2.6, 2.75, -43.1); rim.rotation.y = -0.5; scene.add(rim);
    const mir = new THREE.Mesh(new THREE.CircleGeometry(0.36, 12), new THREE.MeshPhongMaterial({ color:0xc9d6dc, shininess:90, specular:0xffffff }));
    mir.position.set(2.6, 2.75, -43.06); mir.rotation.y = -0.5; scene.add(mir); addCol(2.6, -43.2, 0.2, 0.2); }
  tree(-6.5, -50.5, 1.0); tree(6.8, -50.8, 1.1);
  // street lamps on the utility poles (warm pools of light at night)
  const lampHeadOff = lam({ color:0xd8d4c8 }), lampHeadOn = new THREE.MeshBasicMaterial({ color:0xffd27a });
  const poolTex = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16,16,1,16,16,16); gr.addColorStop(0,'rgba(255,200,110,.6)'); gr.addColorStop(1,'rgba(255,200,110,0)'); g.fillStyle=gr; g.fillRect(0,0,32,32); });
  const streetLamps = [];
  for (const [x, z] of [[-2.75, 10], [2.75, -2], [-2.75, -14], [2.75, -26], [-2.75, -38], [3.2, -47], [-3.2, -50]]) {
    const dir = x > 0 ? -1 : 1;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), poleMat); arm.position.set(x + dir*0.45, 4.6, z); scene.add(arm);
    if (Math.abs(x) > 3) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.7, 6), poleMat); p.position.set(x, 2.35, z); scene.add(p); addCol(x, z, 0.25, 0.25); }
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.22), lampHeadOff); head.position.set(x + dir*0.85, 4.55, z); scene.add(head);
    const light = new THREE.PointLight(0xffc477, 0, 11, 1.6); light.position.set(x + dir*0.85, 4.3, z); scene.add(light);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map:poolTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI/2; pool.position.set(x + dir*1.4, 0.02, z); pool.visible = false; scene.add(pool);
    streetLamps.push({ head, light, pool });
  }
  function applyLamps(level) {
    for (const l of streetLamps) { l.light.intensity = 1.5 * level; l.head.material = level > 0 ? lampHeadOn : lampHeadOff; l.pool.visible = level > 0; l.pool.material.opacity = level; }
  }
  // transformers on the utility poles
  for (let i = 0; i < 5; i += 2) { const x = (i % 2 ? 2.75 : -2.75), z = 10 - i*12; const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 7), lam({ color:0x8f948f })); tr.position.set(x + (x > 0 ? 0.25 : -0.25), 5.6, z); scene.add(tr); }
  O('라바콘', scene);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 6), lam({ color:0xe0662f })); cone.position.set(-2.2, 0.27, -36); scene.add(cone); addCol(-2.2, -36, 0.3, 0.3);
  E();

  Object.assign(G, { addBuilding, buildingMats, applyLamps, roofMat });
}
