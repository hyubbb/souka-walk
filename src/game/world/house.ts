// The house from the HOUSE SHEET (bedroom, work room, living room, kitchen, bath, entrance, balcony),
// scaled up so souka can walk around. Built at x = HX so it never overlaps the alley.
import * as THREE from 'three';
import type { Game, Holdable } from '../types';
import { HX } from '../core';

export function buildHouse(G: Game) {
  const { scene, canvasTex, speckle, lam, rnd, addCol, O, E, addBuilding } = G;
  // ---------- house (based on HOUSE SHEET, scaled up for walking) ----------
  // local coords: x 0..15 (west→east), z 0..14.5 (north→south); balcony x -2.4..0
  const house = new THREE.Group(); house.position.set(HX, 0, 0); scene.add(house);
  const addColL = (cx, cz, w, d) => addCol(cx + HX, cz, w, d);
  const OH = (name) => O(name, house, HX);
  const FACE = { '+x':0, '-x':1, '+y':2, '-y':3, '+z':4, '-z':5 };
  function withFront(base, front, dir, top?) { const a = [base,base,base,base,base,base]; a[FACE[dir]] = front; if (top) a[2] = top; return a; }
  function hbox(w, h, d, mat, x, y, z, opt: any = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h/2, z); if (opt.rot) m.rotation.y = opt.rot;
    (opt.parent || house).add(m);
    if (opt.col !== false && y < 0.3) addColL(x, z, w + (opt.pad||0), d + (opt.pad||0));
    return m;
  }
  const tex = {
    plaster: canvasTex(32, 32, (g,w,h) => speckle(g,w,h,'#d3c7b1',0.1,0.5)),
    wood: canvasTex(64, 64, (g) => {
      for (let y=0; y<64; y+=8) { let x = -(rnd()*40|0);
        while (x < 64) { const L = 22 + rnd()*30|0; g.fillStyle = ['#9c8668','#8f7a5e','#a38e70','#8a7559'][rnd()*4|0]; g.fillRect(x,y,L,8); g.fillStyle='rgba(0,0,0,.22)'; g.fillRect(x,y,1,8); x += L; }
        g.fillStyle='rgba(0,0,0,.28)'; g.fillRect(0,y+7,64,1); g.fillStyle='rgba(255,255,255,.08)'; g.fillRect(0,y,64,1); }
    }),
    tile: canvasTex(32, 32, (g,w,h) => { speckle(g,w,h,'#a7aba9',0.1,0.4); g.fillStyle='#7c817f'; for (let i=0;i<32;i+=16){ g.fillRect(i,0,1,32); g.fillRect(0,i,32,1); } }),
    tileW: canvasTex(32, 32, (g,w,h) => { speckle(g,w,h,'#d6d9d5',0.06,0.3); g.fillStyle='#a9aeab'; for (let i=0;i<32;i+=8){ g.fillRect(i,0,1,32); g.fillRect(0,i,32,1); } }),
    concrete: canvasTex(32, 32, (g,w,h) => speckle(g,w,h,'#8f8c86',0.2,0.6)),
    furn: canvasTex(32, 32, (g,w,h) => { speckle(g,w,h,'#7e5636',0.12,0.4); g.fillStyle='rgba(0,0,0,.12)'; for (let x=0;x<32;x+=5) g.fillRect(x+(rnd()*2|0),0,1,32); }),
    dark: canvasTex(32, 32, (g,w,h) => { speckle(g,w,h,'#4e3626',0.12,0.4); g.fillStyle='rgba(0,0,0,.18)'; for (let x=0;x<32;x+=4) g.fillRect(x,0,1,32); }),
    plaid: canvasTex(32, 32, (g) => { g.fillStyle='#4b5b88'; g.fillRect(0,0,32,32); g.fillStyle='rgba(28,34,68,.6)'; for (let i=0;i<32;i+=8){ g.fillRect(i,0,3,32); g.fillRect(0,i,32,3); } g.fillStyle='rgba(225,230,245,.35)'; for (let i=5;i<32;i+=8){ g.fillRect(i,0,1,32); g.fillRect(0,i,32,1); } }, [2,2]),
    sofa: canvasTex(16, 16, (g,w,h) => speckle(g,w,h,'#5f7149',0.15,0.6)),
    rugGray: canvasTex(32, 32, (g,w,h) => { speckle(g,w,h,'#8d8c88',0.15,0.7); g.strokeStyle='#6f6e6a'; g.strokeRect(1.5,1.5,29,29); }),
    rugNavy: canvasTex(32, 32, (g,w,h) => { speckle(g,w,h,'#38446a',0.15,0.7); }),
    rugBrown: canvasTex(32, 32, (g,w,h) => { speckle(g,w,h,'#5e5047',0.2,0.8); g.strokeStyle='#463b34'; g.strokeRect(1.5,1.5,29,29); }),
    door: canvasTex(32, 64, (g,w,h) => { speckle(g,w,h,'#8a5f3a',0.1,0.4); g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(5,6,22,22); g.fillRect(5,34,22,24); g.fillStyle='rgba(255,255,255,.08)'; g.fillRect(6,7,20,1); g.fillRect(6,35,20,1); g.fillStyle='#c9c4b8'; g.fillRect(25,30,4,3); }),
    frontDoor: canvasTex(32, 64, (g,w,h) => { speckle(g,w,h,'#4a4d50',0.1,0.4); g.fillStyle='#3a3c3e'; g.fillRect(3,3,26,58); g.fillStyle='#55585b'; g.fillRect(4,4,24,56); g.fillStyle='#bfc3c6'; g.fillRect(23,30,4,8); g.fillStyle='#1a1a1a'; g.fillRect(15,18,2,2); g.fillStyle='#d8d8d0'; g.fillRect(10,8,12,4); }),
    books: canvasTex(32, 64, (g) => { g.fillStyle='#4e3626'; g.fillRect(0,0,32,64); for (let y=2; y<62; y+=15) { let x=2; while (x<30) { const bw=2+rnd()*3|0, bh=9+rnd()*4|0; g.fillStyle=['#8b2f2f','#2f4f7b','#c9b27a','#3e6b45','#d6d0c0','#6b3f6b','#b86b2f'][rnd()*7|0]; g.fillRect(x,y+12-bh,bw,bh); x+=bw+1; } g.fillStyle='#3a281c'; g.fillRect(0,y+12,32,2); } }),
    crt: canvasTex(16, 16, (g) => { g.fillStyle='#d7d2c4'; g.fillRect(0,0,16,16); g.fillStyle='#2a3242'; g.fillRect(2,2,12,10); g.fillStyle='#4f6a8a'; g.fillRect(3,3,4,2); g.fillStyle='#8c877a'; g.fillRect(6,13,4,1); }),
    tv: canvasTex(32, 16, (g) => { g.fillStyle='#1d1e20'; g.fillRect(0,0,32,16); g.fillStyle='#3c4a5c'; g.fillRect(2,2,28,11); g.fillStyle='#6d8299'; g.fillRect(4,3,8,3); g.fillStyle='#e0e0e0'; g.fillRect(28,14,2,1); }),
    counter: canvasTex(64, 16, (g) => { g.fillStyle='#d9d2c2'; g.fillRect(0,0,64,16); for (let x=0;x<64;x+=16){ g.fillStyle='#b9b09d'; g.fillRect(x,0,1,16); g.fillStyle='#7d7568'; g.fillRect(x+12,6,2,4); } g.fillStyle='#8c8678'; g.fillRect(0,15,64,1); }),
    stove: canvasTex(32, 16, (g) => { g.fillStyle='#9a9c9c'; g.fillRect(0,0,32,16); g.fillStyle='#2b2b2b'; for (const [x,y] of [[8,5],[22,5],[8,11],[22,11]]) { g.beginPath(); g.arc(x,y,3,0,7); g.fill(); } }),
    sink: canvasTex(32, 16, (g) => { g.fillStyle='#9fa3a4'; g.fillRect(0,0,32,16); g.fillStyle='#c7cbcc'; g.fillRect(6,3,20,10); g.fillStyle='#6b6f70'; g.fillRect(15,7,2,2); }),
    fridge: canvasTex(16, 32, (g) => { g.fillStyle='#e8e8e4'; g.fillRect(0,0,16,32); g.fillStyle='#b8b8b2'; g.fillRect(0,11,16,1); g.fillRect(13,4,1,5); g.fillRect(13,14,1,8); g.fillStyle='#e05a4a'; g.fillRect(3,15,3,3); g.fillStyle='#f3e48a'; g.fillRect(7,17,4,4); g.fillStyle='#6aa0d8'; g.fillRect(4,22,3,2); }),
    washer: canvasTex(16, 16, (g) => { g.fillStyle='#e6e7e4'; g.fillRect(0,0,16,16); g.fillStyle='#b5b7b5'; g.fillRect(0,3,16,1); g.fillStyle='#5f6a72'; g.beginPath(); g.arc(8,9.5,4.5,0,7); g.fill(); g.fillStyle='#9fb1bd'; g.beginPath(); g.arc(8,9.5,3,0,7); g.fill(); g.fillStyle='#4a90d0'; g.fillRect(11,1,3,1); }),
    acUnit: canvasTex(16, 16, (g) => { g.fillStyle='#d6d6d0'; g.fillRect(0,0,16,16); g.fillStyle='#55585a'; g.beginPath(); g.arc(6,8,5,0,7); g.fill(); g.fillStyle='#8a8d8e'; for (let i=0;i<4;i++){ g.fillRect(1,4+i*2,10,1); } }),
    shoes: canvasTex(32, 32, (g) => { g.fillStyle='#6b4a32'; g.fillRect(0,0,32,32); for (let y=4;y<32;y+=10){ g.fillStyle='#4a3324'; g.fillRect(0,y+6,32,2); for (let x=2;x<30;x+=7){ g.fillStyle=['#2b2b2b','#b03a2e','#e0ddd5','#3f5f8f'][rnd()*4|0]; g.fillRect(x,y+2,5,4); } } }),
  };
  function poster(seed2) {
    return canvasTex(16, 20, (g) => { g.fillStyle='#e9e4d6'; g.fillRect(0,0,16,20); g.fillStyle='#3b3b3b'; g.fillRect(0,0,16,1); g.fillRect(0,19,16,1); g.fillRect(0,0,1,20); g.fillRect(15,0,1,20);
      const cs=['#5f7f9f','#9f6a4f','#6f8f5f','#8a7aa0','#c9a65a']; g.fillStyle=cs[seed2%5]; g.fillRect(3,3,10,9); g.fillStyle=cs[(seed2+2)%5]; g.beginPath(); g.arc(8,8,3,0,7); g.fill(); g.fillStyle='#777'; g.fillRect(3,14,10,1); g.fillRect(3,16,7,1); });
  }
  const M = {
    wall: lam({ map:tex.plaster }), cap: lam({ color:0x2f3032 }),
    furn: lam({ map:tex.furn }), dark: lam({ map:tex.dark }), white: lam({ color:0xe6e4dc }),
    black: lam({ color:0x26272a }), metal: lam({ color:0x9a9d9e }), mattress: lam({ color:0xe9e7e0 }),
    plaid: lam({ map:tex.plaid }), sofa: lam({ map:tex.sofa }), pot: lam({ color:0x8a6248 }),
    leaf: new THREE.MeshPhongMaterial({ color:0x55803f, flatShading:true, shininess:0, specular:0 }),
    counterTop: lam({ color:0x8f9193 }), lamp: new THREE.MeshBasicMaterial({ color:0xf6dfa0 }),
    glass: new THREE.MeshBasicMaterial({ color:0xbfd6e0, transparent:true, opacity:0.35, depthWrite:false }),
  };
  function floor(x1, z1, x2, z2, t, scale = 2, y = 0.012) {
    const w = x2-x1, d = z2-z1; const tt = t.clone(); tt.needsUpdate = true; tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(w/scale, d/scale);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam({ map:tt })); m.rotation.x = -Math.PI/2; m.position.set((x1+x2)/2, y, (z1+z2)/2); house.add(m); return m;
  }
  // walls: axis aligned segments with openings {a,b,t:'door'|'window'|'front'}
  const WT = 0.2, WH = 2.6, wallGroups = [];
  function wall(x1, z1, x2, z2, ops = []) {
    const horiz = Math.abs(z1 - z2) < 1e-6, len = horiz ? x2 - x1 : z2 - z1;
    const g = new THREE.Group(); house.add(g); wallGroups.push(g);
    const piece = (a, b, y0, y1, mat = M.wall) => {
      if (b - a < 0.001) return; const l = b - a, h = y1 - y0, c = (a + b) / 2;
      const m = new THREE.Mesh(horiz ? new THREE.BoxGeometry(l, h, WT) : new THREE.BoxGeometry(WT, h, l), mat);
      if (horiz) m.position.set(x1 + c, (y0+y1)/2, z1); else m.position.set(x1, (y0+y1)/2, z1 + c);
      g.add(m);
      if (y1 >= WH - 0.001) { const cap = new THREE.Mesh(horiz ? new THREE.BoxGeometry(l, 0.06, WT+0.04) : new THREE.BoxGeometry(WT+0.04, 0.06, l), M.cap); cap.position.set(m.position.x, WH + 0.03, m.position.z); g.add(cap); }
      if (y0 < 0.01) { if (horiz) addColL(x1 + c, z1, l, WT + 0.04); else addColL(x1, z1 + c, WT + 0.04, l); }
      return m;
    };
    let cur = 0;
    for (const o of ops.sort((p, q) => p.a - q.a)) {
      piece(cur, o.a, 0, WH);
      if (o.t === 'window') {
        piece(o.a, o.b, 0, 0.85); piece(o.a, o.b, 1.95, WH);
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(o.b - o.a, 1.1), M.glass); const c = (o.a + o.b) / 2;
        if (horiz) gl.position.set(x1 + c, 1.4, z1); else { gl.position.set(x1, 1.4, z1 + c); gl.rotation.y = Math.PI/2; }
        g.add(gl);
        const fr = new THREE.Mesh(horiz ? new THREE.BoxGeometry(0.06, 1.1, WT*0.6) : new THREE.BoxGeometry(WT*0.6, 1.1, 0.06), M.white);
        fr.position.copy(gl.position); g.add(fr);
      } else if (o.t === 'slide') {
        piece(o.a, o.b, 2.15, WH);
        const gl = new THREE.Mesh(new THREE.PlaneGeometry((o.b - o.a) / 2, 2.1), M.glass);
        const c = o.a + (o.b - o.a) * 0.25;
        if (horiz) gl.position.set(x1 + c, 1.07, z1 + 0.06); else { gl.position.set(x1 + 0.06, 1.07, z1 + c); gl.rotation.y = Math.PI/2; }
        g.add(gl);
        if (horiz) addColL(x1 + c, z1, (o.b-o.a)/2, WT); else addColL(x1, z1 + c, WT, (o.b-o.a)/2);
      } else {
        piece(o.a, o.b, 2.0, WH);
        const dw = o.b - o.a;
        if (o.t === 'front') {
          const dm = new THREE.Mesh(horiz ? new THREE.BoxGeometry(dw, 2.0, 0.08) : new THREE.BoxGeometry(0.08, 2.0, dw), withFront(M.black, lam({ map:tex.frontDoor }), horiz ? '-z' : '+x'));
          if (horiz) dm.position.set(x1 + (o.a+o.b)/2, 1.0, z1 - 0.07); else dm.position.set(x1 + 0.07, 1.0, z1 + (o.a+o.b)/2);
          g.add(dm); if (horiz) addColL(x1 + (o.a+o.b)/2, z1, dw, WT); else addColL(x1, z1 + (o.a+o.b)/2, WT, dw);
        } else {
          // open door leaf, swung 90° into the room on the hinge side
          const leaf = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.05, 1.98, 0.05), lam({ map:tex.door }));
          const pivot = new THREE.Group();
          const sgn = o.swing || 1;
          if (horiz) { pivot.position.set(x1 + o.a, 0, z1); leaf.position.set((dw-0.05)/2, 0.99, 0); pivot.rotation.y = -sgn * Math.PI/2 * 0.92; }
          else { pivot.position.set(x1, 0, z1 + o.a); pivot.rotation.y = Math.PI/2; leaf.position.set(-(dw-0.05)/2, 0.99, 0); pivot.rotation.y += sgn * Math.PI/2 * 0.92; }
          pivot.add(leaf); g.add(pivot);
        }
      }
      cur = o.b;
    }
    piece(cur, len, 0, WH);
    return g;
  }
  function wallDecor(t, w, h, x, y, z, rotY) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam({ map:t })); m.position.set(x, y, z); m.rotation.y = rotY; house.add(m); return m; }

  // floors
  floor(0, 0, 7.5, 6, tex.wood);            // bedroom
  floor(7.5, 0, 15, 6, tex.wood);           // work room
  floor(0, 6, 8, 14.5, tex.wood);           // living
  floor(8, 6, 15, 11, tex.wood);            // kitchen / hall
  floor(8, 11, 11.5, 14.5, tex.tileW, 1);   // bath
  floor(11.5, 11, 15, 12.6, tex.tile, 1.5); // entrance step
  floor(11.5, 12.6, 15, 14.5, tex.tile, 1.5, 0.004);
  floor(-2.4, 0, 0, 14.5, tex.concrete);    // balcony
  const stepEdge = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.05, 0.08), M.furn); stepEdge.position.set(13.25, 0.03, 12.6); house.add(stepEdge);
  // outside ground + slab
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), lam({ map:canvasTex(32,32,(g,w,h)=>speckle(g,w,h,'#7a776f',0.25,0.7),[30,30]) }));
  outside.rotation.x = -Math.PI/2; outside.position.set(7, -0.02, 7); house.add(outside);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(17.8, 0.3, 14.9), M.cap); slab.position.set(6.3, -0.15, 7.25); house.add(slab);

  // exterior walls
  wall(0, 0, 15, 0, [{ a:2.4, b:4.8, t:'window' }, { a:9.8, b:12.2, t:'window' }]);
  wall(0, 0, 0, 14.5, [{ a:3.6, b:5.4, t:'window' }, { a:8.6, b:12.2, t:'slide' }]);
  wall(0, 14.5, 15, 14.5, [{ a:2.6, b:5.2, t:'window' }, { a:12.6, b:13.8, t:'front' }]);
  wall(15, 0, 15, 14.5, [{ a:1.3, b:2.9, t:'window' }]);
  // interior walls
  wall(7.5, 0, 7.5, 6);
  wall(0, 6, 7.5, 6, [{ a:5.6, b:6.8, t:'door', swing:-1 }]);
  wall(7.5, 6, 15, 6, [{ a:0.7, b:1.9, t:'door', swing:-1 }]);
  wall(8, 11, 8, 14.5);
  wall(8, 11, 11.5, 11, [{ a:1.3, b:2.5, t:'door', swing:1 }]);
  wall(11.5, 11, 11.5, 14.5);
  wall(8, 6, 8, 7.0); // small pillar between living and kitchen

  // balcony railing
  const railMat = lam({ color:0x3a3b3d });
  for (let z = 0.2; z <= 14.4; z += 0.6) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), railMat); p.position.set(-2.35, 0.5, z); house.add(p); }
  hbox(0.08, 0.08, 14.5, railMat, -2.35, 1.0, 7.25, { col:false }); addColL(-2.35, 7.25, 0.2, 14.5);
  hbox(2.4, 0.08, 0.08, railMat, -1.2, 1.0, 0.05, { col:false }); addColL(-1.2, 0.05, 2.4, 0.2);
  hbox(2.4, 0.08, 0.08, railMat, -1.2, 1.0, 14.45, { col:false }); addColL(-1.2, 14.45, 2.4, 0.2);
  OH('실외기');
  hbox(0.6, 0.55, 0.85, withFront(M.white, lam({ map:tex.acUnit }), '+x'), -1.9, 0, 6.3);
  E();

  // Furniture is now Kenney models placed by props.ts (HOUSE_DEFAULTS). What stays here is hand-built.
  // 1. BEDROOM
  wallDecor(poster(1), 0.55, 0.7, 5.6, 1.6, 0.11, 0);
  wallDecor(poster(3), 0.45, 0.55, 6.3, 1.7, 0.11, 0);
  wallDecor(poster(4), 0.5, 0.62, 0.11, 1.6, 1.8, Math.PI/2);

  // 2. WORK ROOM
  wallDecor(poster(2), 0.5, 0.62, 8.2, 1.7, 0.11, 0);

  // 4. LIVING ROOM
  wallDecor(poster(0), 0.7, 0.55, 0.11, 1.6, 7.3, Math.PI/2);

  OH('빨래 바구니');
  hbox(0.4, 0.3, 0.3, lam({ color:0xc9b48a }), 11.05, 0, 11.45);                   // laundry basket
  E();

  // 6. ENTRANCE
  OH('신발장');
  hbox(0.45, 1.0, 1.9, withFront(M.furn, lam({ map:tex.shoes }), '-x'), 14.7, 0, 12.3); // shoe rack
  E();
  OH('신발');
  hbox(0.22, 0.08, 0.32, M.black, 12.9, 0.004, 13.9, { col:false });
  hbox(0.22, 0.08, 0.32, M.black, 13.2, 0.004, 13.95, { col:false });
  hbox(0.22, 0.08, 0.32, lam({ color:0xe0ddd5 }), 13.7, 0.004, 13.8, { col:false });
  E();
  OH('우산');
  const umb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), lam({ color:0x3f5f8f })); umb.position.set(14.75, 0.45, 13.9); umb.rotation.z = 0.12; house.add(umb);
  E();

  // ---- real-size props (size gags) ----
  const holdables = [];
  const phongWhite = new THREE.MeshPhongMaterial({ color:0xf1efe8, shininess:30, specular:0x333333 });
  { // giant mug on the coffee table (can be carried)
    const g = new THREE.Group(); house.add(g); g.position.set(2.1, 0.38, 9.1);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.42, 12), phongWhite); cup.position.y = 0.21; g.add(cup);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.203, 0.198, 0.06, 12), lam({ color:0xd2543f })); stripe.position.y = 0.3; g.add(stripe);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), lam({ color:0x5a3a24 })); coffee.rotation.x = -Math.PI/2; coffee.position.y = 0.4; g.add(coffee);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 5, 10), phongWhite); handle.position.set(0.22, 0.22, 0); g.add(handle);
    holdables.push({ obj:g, name:'머그컵', hold:[0, 0.42, 0.3], rx:0 });
  }
  { // giant TV remote on the sofa
    const g = new THREE.Group(); house.add(g); g.position.set(3.7, 0.4, 6.85); g.rotation.y = 0.4;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.78), M.black); b.position.y = 0.045; g.add(b);
    const cols = [0xd64a3a, 0x4a9a5a, 0xe0c04a, 0x4a7ad0];
    for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.05), lam({ color:cols[i] })); k.position.set(-0.075 + i*0.05, 0.1, -0.25); g.add(k); }
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.045), lam({ color:0x777a7e })); k.position.set(-0.06 + c*0.06, 0.1, -0.05 + r*0.08); g.add(k); }
    const pw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.06), lam({ color:0xc0392b })); pw.position.set(0, 0.1, 0.3); g.add(pw);
    holdables.push({ obj:g, name:'리모컨', hold:[0, 0.48, 0.3], rx:-1.15 });
  }
  // bathroom scale (stand on it)
  const scaleTex = canvasTex(32, 32, (g) => { g.fillStyle='#eeeeea'; g.fillRect(0,0,32,32); g.fillStyle='#d6d6d0'; g.fillRect(0,0,32,2); g.fillStyle='#3a4a40'; g.fillRect(10,5,12,6); g.fillStyle='#9fe0a8'; g.fillRect(11,6,10,4); g.fillStyle='#c9c9c3'; g.fillRect(5,16,9,11); g.fillRect(18,16,9,11); });
  OH('체중계');
  hbox(0.72, 0.09, 0.72, withFront(M.white, M.white, '+z', lam({ map:scaleTex })), 10.0, 0, 12.85, { col:false });
  E();
  // pile of clothes in the bedroom
  OH('옷 더미');
  for (const [x, z, w, d, y, c] of [[5.9,3.7,0.9,0.7,0,0x5b6c8f],[5.95,3.75,0.75,0.6,0.07,0xd9d2c0],[5.85,3.65,0.6,0.5,0.13,0xb85a4a],[6.0,3.8,0.45,0.4,0.19,0x6f8a5a]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), lam({ color:c })); m.position.set(x, y + 0.035, z); m.rotation.y = (x*7) % 1; house.add(m); }
  E();

  // neighbourhood outside the windows
  for (const [x, z, w, d, h] of [[-9,-6,8,6,7],[4,-9,9,5,9],[16,-8,8,6,6],[24,4,6,10,8],[22,20,8,6,5],[6,24,10,6,7],[-10,20,8,8,6],[-12,6,5,8,9]]) addBuilding(HX + x, z, w, d, h);

  // rooms (for HUD label)
  const ROOMS = [
    { n:'1. BEDROOM 침실',     r:[0,7.5,0,6] }, { n:'2. WORK ROOM 작업실', r:[7.5,15,0,6] },
    { n:'5. BATH ROOM 욕실',   r:[8,11.5,11,14.5] }, { n:'6. ENTRANCE 현관', r:[11.5,15,11,14.5] },
    { n:'3. KITCHEN 부엌',     r:[8,15,6,11] }, { n:'4. LIVING ROOM 거실', r:[0,8,6,14.5] },
    { n:'BALCONY 베란다',      r:[-2.4,0,0,14.5] },
  ];

  // door into the house from the alley (back wall)
  const alleyDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.0), lam({ map:tex.frontDoor }));
  alleyDoor.position.set(0, 1.0, 13.99); alleyDoor.rotation.y = Math.PI; scene.add(alleyDoor);
  const alleyStep = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), lam({ color:0x9a968e })); alleyStep.position.set(0, 0.06, 13.75); scene.add(alleyStep);

  Object.assign(G, { house, M, tex, wallGroups, holdables, ROOMS });
}
