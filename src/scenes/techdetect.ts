// TechDetect: a classroom door and the teacher's laptop. Students come through
// the door one at a time; the webcam locks scan brackets onto each face, pops
// a check when it knows them, and the attendance list on screen fills in. The last one raises a hand, and
// the camera brackets the hand too, because it knows *who* has a question.

import { BoxGeometry, CanvasTexture, CapsuleGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SphereGeometry, SRGBColorSpace, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createStage, seg, ease, easeIn, passed } from './kit';
import { makeAvatar } from './avatar';
import { load, DEFAULT, OPTIONS, type Avatar } from '../scripts/avatar';
import { sfx } from '../scripts/sound';

const backOut = (x: number) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
const C = {
  floor: '#e9dcc3', wall: '#f4f1ea', wood: '#b98b5e', skin: '#f1c9a5',
  amber: '#f0a020', green: '#2f9e5b',
};

export const create = () => createStage((kit) => {
  const { scene, toon, blob } = kit;

  // a small classroom corner: floor, a short wall with a doorway, a chalkboard
  const floor = new Mesh(new RoundedBoxGeometry(5.0, 0.08, 2.3, 2, 0.04), toon(C.floor)); floor.position.y = -0.04;
  scene.add(floor);
  const wallL = new Mesh(new RoundedBoxGeometry(1.0, 1.45, 0.12, 2, 0.04), toon(C.wall)); wallL.position.set(-2.0, 0.72, -0.9);
  const wallR = new Mesh(new RoundedBoxGeometry(2.6, 1.45, 0.12, 2, 0.04), toon(C.wall)); wallR.position.set(0.75, 0.72, -0.9);
  scene.add(wallL, wallR);
  for (const x of [-1.47, -0.57]) {
    const post = new Mesh(new RoundedBoxGeometry(0.09, 1.5, 0.18, 2, 0.03), toon(C.wood)); post.position.set(x, 0.75, -0.88); scene.add(post);
  }
  const lintel = new Mesh(new RoundedBoxGeometry(0.99, 0.1, 0.18, 2, 0.03), toon(C.wood)); lintel.position.set(-1.02, 1.5, -0.88);
  scene.add(lintel);
  const board = new Mesh(new RoundedBoxGeometry(1.3, 0.62, 0.04, 2, 0.02), toon('#2f5d4a')); board.position.set(0.95, 0.88, -0.82);
  const frame = new Mesh(new RoundedBoxGeometry(1.38, 0.7, 0.03, 2, 0.02), toon(C.wood)); frame.position.set(0.95, 0.88, -0.84);
  scene.add(frame, board);
  const chalk = new MeshBasicMaterial({ color: '#e9efe9' });
  for (const [x, y, w] of [[0.62, 1.02, 0.42], [0.72, 0.9, 0.6], [0.58, 0.78, 0.34]]) {
    const l = new Mesh(new BoxGeometry(w, 0.025, 0.01), chalk); l.position.set(x + w / 2 - 0.2, y, -0.795); scene.add(l);
  }

  // the teacher's desk with a laptop: its webcam watches the door, and its
  // screen shows the attendance list filling in
  const DESK = new Vector3(1.45, 0, 0.35);
  const desk = new Group(); desk.position.copy(DESK); scene.add(desk);
  const top = new Mesh(new RoundedBoxGeometry(1.15, 0.06, 0.62, 2, 0.02), toon(C.wood)); top.position.y = 0.66; desk.add(top);
  for (const [x, z] of [[-0.5, -0.24], [0.5, -0.24], [-0.5, 0.24], [0.5, 0.24]]) {
    const leg = new Mesh(new CylinderGeometry(0.025, 0.025, 0.64, 8), toon('#8a6a4a')); leg.position.set(x, 0.32, z); desk.add(leg);
  }
  const deskShadow = blob(1.4, 0.9); deskShadow.position.set(DESK.x, 0.004, DESK.z); scene.add(deskShadow);
  const lap = new Group(); lap.position.set(0, 0.69, 0);
  // aim the screen between the students' spot and the viewer, so both can "see" it
  lap.rotation.y = Math.atan2(-0.35 - DESK.x, 3 - DESK.z);
  desk.add(lap);
  lap.add(new Mesh(new RoundedBoxGeometry(0.62, 0.03, 0.42, 2, 0.012), toon('#d3d5de')));
  const hinge = new Group(); hinge.position.set(0, 0.02, -0.2); hinge.rotation.x = -0.25; lap.add(hinge);
  const lid = new Mesh(new RoundedBoxGeometry(0.62, 0.42, 0.025, 2, 0.012), toon('#d3d5de')); lid.position.y = 0.21; hinge.add(lid);
  const sc = document.createElement('canvas'); sc.width = 256; sc.height = 160;
  const sg = sc.getContext('2d')!;
  const screenTex = kit.own(new CanvasTexture(sc)); screenTex.colorSpace = SRGBColorSpace;
  const screen = new Mesh(new PlaneGeometry(0.54, 0.34), new MeshBasicMaterial({ map: screenTex })); screen.position.set(0, 0.215, 0.014); hinge.add(screen);
  // a little USB webcam clipped to the top of the lid (no scanning rays, just a camera)
  const webcam = new Group(); webcam.position.set(0, 0.47, 0.01); webcam.scale.setScalar(1.35); hinge.add(webcam);
  webcam.add(new Mesh(new RoundedBoxGeometry(0.17, 0.08, 0.08, 3, 0.03), toon('#2a2d35')));
  const clip = new Mesh(new RoundedBoxGeometry(0.06, 0.05, 0.07, 2, 0.015), toon('#2a2d35')); clip.position.set(0, -0.045, -0.02); webcam.add(clip);
  const lensGeo = new CylinderGeometry(0.03, 0.03, 0.03, 16); lensGeo.rotateX(Math.PI / 2);
  const camLens = new Mesh(lensGeo, toon('#15171c')); camLens.position.z = 0.045; webcam.add(camLens);
  const glint = new Mesh(new SphereGeometry(0.018, 10, 8), new MeshBasicMaterial({ color: '#4b6cb7' })); glint.scale.z = 0.3; glint.position.z = 0.062; webcam.add(glint);
  const led = new MeshBasicMaterial({ color: '#f0a020' });
  const ledM = new Mesh(new SphereGeometry(0.011, 8, 6), led); ledM.position.set(0.06, 0.015, 0.042); webcam.add(ledM);
  let drawn = -1;
  const drawScreen = (n: number) => {
    if (n === drawn) return; drawn = n;
    sg.fillStyle = '#f7f6f2'; sg.fillRect(0, 0, 256, 160);
    sg.fillStyle = '#d9820f'; sg.fillRect(0, 0, 256, 26);
    sg.fillStyle = '#fff'; sg.font = '600 15px ui-monospace, monospace'; sg.fillText('attendance', 12, 18);
    configs.map((c) => OPTIONS.shirt[c.shirt]).forEach((shirt, i) => {
      const y = 46 + i * 36;
      sg.fillStyle = shirt; sg.beginPath(); sg.arc(22, y, 8, 0, Math.PI * 2); sg.fill();
      sg.fillStyle = '#c9ccd6'; sg.fillRect(40, y - 5, 120, 10);
      if (i < n) { sg.strokeStyle = '#2f9e5b'; sg.lineWidth = 5; sg.lineCap = 'round'; sg.beginPath(); sg.moveTo(206, y); sg.lineTo(214, y + 8); sg.lineTo(230, y - 8); sg.stroke(); }
    });
    screenTex.needsUpdate = true;
  };
  const cam = { position: DESK };                           // where the "camera" is, for aiming
  const SPOT = new Vector3(-0.35, 0, 0.15);                 // where each student stops to be seen

  // scan brackets and a check mark (flat, always facing the camera)
  const bracket = (size: number, color: string) => {
    const g = new Group(), m = new MeshBasicMaterial({ color, transparent: true, depthWrite: false });
    const s = size / 2, arm = size * 0.28, th = 0.025;
    for (const [sx, sy] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
      const h = new Mesh(new BoxGeometry(arm, th, 0.01), m); h.position.set(sx * (s - arm / 2), sy * s, 0);
      const v = new Mesh(new BoxGeometry(th, arm, 0.01), m); v.position.set(sx * s, sy * (s - arm / 2), 0);
      g.add(h, v);
    }
    g.visible = false; scene.add(g);
    return { g, m };
  };
  const check = () => {
    const g = new Group(), m = new MeshBasicMaterial({ color: C.green });
    const a = new Mesh(new BoxGeometry(0.1, 0.035, 0.02), m); a.position.set(-0.04, -0.02, 0); a.rotation.z = -0.8;
    const b = new Mesh(new BoxGeometry(0.2, 0.035, 0.02), m); b.position.set(0.05, 0.02, 0); b.rotation.z = 0.9;
    const disc = new Mesh(new CylinderGeometry(0.15, 0.15, 0.02, 24), toon('#ffffff')); disc.rotation.x = Math.PI / 2; disc.position.z = -0.02;
    g.add(disc, a, b); g.visible = false; scene.add(g);
    return g;
  };

  // students: simple toy avatars. The first one is *you*, if you've made an
  // avatar (the head button in the top bar); the other two are fixed.
  const PRESETS: Avatar[] = [
    { ...DEFAULT },
    { skin: 3, head: 1, hair: 1, hairColor: 0, eyes: 2, shirt: 1, body: 1 },
    { skin: 0, head: 2, hair: 2, hairColor: 3, eyes: 0, shirt: 3, body: 0 },
  ];
  const configs = PRESETS.map((p, i) => (i === 0 ? load() ?? p : p));
  const students = configs.map((cfg) => {
    const { g, arm } = makeAvatar(kit, cfg);
    scene.add(g);
    const sh = blob(0.5, 0.36); scene.add(sh);
    return { g, arm, sh, face: bracket(0.42, C.amber), hand: bracket(0.3, C.amber), ok: check() };
  });
  // rebuild the first student whenever the visitor edits their avatar
  addEventListener('avatar-change', (e) => {
    const cfg = (e as CustomEvent<Avatar | null>).detail ?? PRESETS[0];
    configs[0] = cfg;
    scene.remove(students[0].g);
    const { g, arm } = makeAvatar(kit, cfg);
    scene.add(g);
    students[0].g = g; students[0].arm = arm;
    drawn = -1;                                            // redraw the attendance list colors
  });

  const L = 8.4, GAP = 2.5;
  const DOOR_IN = new Vector3(-1.02, 0, -1.35), DOOR = new Vector3(-1.02, 0, -0.55), OUT = new Vector3(3.6, 0, 0.35);

  return (t, prev) => {
    const u = t % L;
    let anyOk = false;
    students.forEach((s, i) => {
      const k = u - i * GAP;
      const on = k >= 0 && k < 4.4;
      s.g.visible = s.sh.visible = on;
      s.face.g.visible = s.hand.g.visible = s.ok.visible = false;
      if (!on) return;
      // through the door → to the spot → (be seen) → off to the right
      const p = new Vector3(); let walking = true, heading = 0;
      if (k < 0.7) { p.lerpVectors(DOOR_IN, DOOR, k / 0.7); heading = 0; }
      else if (k < 1.5) { p.lerpVectors(DOOR, SPOT, ease(seg(k, 0.7, 1.5))); heading = Math.atan2(SPOT.x - DOOR.x, SPOT.z - DOOR.z); }
      else if (k < 2.6) { p.copy(SPOT); walking = false; heading = Math.atan2(cam.position.x - SPOT.x, cam.position.z - SPOT.z) * 0.6; }
      else { p.lerpVectors(SPOT, OUT, easeIn(seg(k, 2.6, 4.4))); heading = Math.PI / 2; }
      s.g.position.set(p.x, walking ? Math.abs(Math.sin(t * 9)) * 0.04 : 0, p.z);
      s.g.rotation.y = heading;
      s.sh.position.set(p.x, 0.004, p.z);
      // the camera sees them
      const face = new Vector3(p.x, 0.86, p.z + 0.2);              // overlays face the viewer, like a HUD
      if (k > 1.55 && k < 2.6) {
        const pop = backOut(seg(k, 1.55, 1.8));
        s.face.g.visible = true; s.face.g.position.copy(face); s.face.g.rotation.set(0, 0, 0);
        s.face.g.scale.setScalar(Math.max(0.001, 1.6 - 0.6 * pop));
        s.face.m.color.set(k > 1.95 ? C.green : C.amber);
      }
      if (k > 1.95 && k < 2.9) {
        s.ok.visible = true; anyOk = true;
        s.ok.position.set(p.x + 0.28, 1.25, p.z + 0.2); s.ok.rotation.set(0, 0, 0);
        s.ok.scale.setScalar(Math.max(0.001, backOut(seg(k, 1.95, 2.2)) * (1 - seg(k, 2.7, 2.9))));
      }
      // the last student raises a hand, and the camera notices
      const raise = i === students.length - 1 ? Math.sin(Math.PI * seg(k, 1.7, 2.55)) : 0;
      s.arm.rotation.z = 2.8 * Math.min(1, raise * 1.6);
      if (raise > 0.6) {
        const handPos = new Vector3(0.2, 0.66, 0).applyAxisAngle(new Vector3(0, 1, 0), heading).add(new Vector3(p.x, 0.45, p.z));
        s.hand.g.visible = true; s.hand.g.position.copy(handPos).add(new Vector3(0, 0, 0.2)); s.hand.g.rotation.set(0, 0, 0);
      }
      if (passed(prev, t, i * GAP + 1.95, L)) kit.sfx(sfx.plink);
      if (i === students.length - 1 && passed(prev, t, i * GAP + 2.0, L)) kit.sfx(sfx.pop);
    });
    led.color.set(anyOk ? '#5be38a' : '#f0a020');
    drawScreen(students.filter((_, i) => u - i * GAP > 1.95).length);
  };
}, { lookAt: new Vector3(0, 0.85, 0), minSpan: 6.0, minHeight: 3.0, outline: 0.012 });
