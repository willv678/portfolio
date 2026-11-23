// TechDetect: a classroom door and a webcam on a little tripod. Students come
// through the door one at a time; the camera locks scan brackets onto each
// face and pops a check when it knows them. The last one raises a hand, and
// the camera brackets the hand too, because it knows *who* has a question.

import { CapsuleGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, BoxGeometry, SphereGeometry, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createStage, seg, ease, easeIn, passed } from './kit';
import { sfx } from '../scripts/sound';

const backOut = (x: number) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
const C = {
  floor: '#e9dcc3', wall: '#f4f1ea', wood: '#b98b5e', skin: '#f1c9a5',
  cam: '#2a2d35', lens: '#1b1d23', tripod: '#8d939c', amber: '#f0a020', green: '#2f9e5b',
  shirts: ['#5b8def', '#e2463c', '#7c6cf6'],
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

  // the webcam on a tripod, aimed at the spot in front of the door
  const cam = new Group(); cam.position.set(1.35, 0, 0.55);
  const stick = (a: Vector3, b: Vector3, r: number, color: string) => {
    const m = new Mesh(new CylinderGeometry(r, r, a.distanceTo(b), 6), toon(color));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  };
  const apex = new Vector3(0, 0.82, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    cam.add(stick(apex, new Vector3(Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26), 0.016, C.tripod));
  }
  cam.add(stick(apex, new Vector3(0, 0.95, 0), 0.02, C.tripod));
  const head = new Group(); head.position.y = 1.06; cam.add(head);
  head.add(new Mesh(new RoundedBoxGeometry(0.42, 0.28, 0.26, 3, 0.07), toon(C.cam)));
  const lensGeo = new CylinderGeometry(0.095, 0.095, 0.1, 20); lensGeo.rotateX(Math.PI / 2);
  const lens = new Mesh(lensGeo, toon(C.lens)); lens.position.z = 0.17; head.add(lens);
  const glass = new Mesh(new SphereGeometry(0.06, 12, 8), new MeshBasicMaterial({ color: '#4b6cb7' })); glass.scale.z = 0.3; glass.position.z = 0.22; head.add(glass);
  const led = new MeshBasicMaterial({ color: '#ff5d5d' });
  const ledM = new Mesh(new SphereGeometry(0.026, 8, 6), led); ledM.position.set(0.14, 0.09, 0.13); head.add(ledM);
  scene.add(cam);
  const camShadow = blob(0.7, 0.55); camShadow.position.set(1.35, 0.004, 0.55); scene.add(camShadow);
  const SPOT = new Vector3(-0.35, 0, 0.15);                 // where each student stops to be seen
  head.rotation.y = Math.atan2(SPOT.x - cam.position.x, SPOT.z - cam.position.z);

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

  // students: capsule bodies, no faces
  const students = C.shirts.map((shirt) => {
    const g = new Group();
    const body = new Mesh(new CapsuleGeometry(0.17, 0.32, 4, 12), toon(shirt)); body.position.y = 0.42;
    const h = new Mesh(new SphereGeometry(0.14, 18, 12), toon(C.skin)); h.position.y = 0.86;
    const arm = new Group(); arm.position.set(0.2, 0.66, 0);
    const a = new Mesh(new CapsuleGeometry(0.05, 0.24, 4, 8), toon(shirt)); a.position.y = -0.15; arm.add(a);
    g.add(body, h, arm);
    scene.add(g);
    const sh = blob(0.5, 0.36); scene.add(sh);
    return { g, arm, sh, face: bracket(0.42, C.amber), hand: bracket(0.3, C.amber), ok: check() };
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
    led.color.set(anyOk ? '#5be38a' : Math.sin(t * 6) > 0 ? '#ff5d5d' : '#7a3434');
  };
}, { lookAt: new Vector3(0, 0.85, 0), minSpan: 6.0, minHeight: 3.0, outline: 0.012 });
