// SimGate: a toy car lapping a little track. A drone (the AI agent) drops
// traffic cones to test it, and a checkpoint gate judges every drop.
//   Test 1 — a fair cone: the gate lights green, the cone lands, the car swerves.
//   Test 2 — the agent tries to cheat (a cone right under the car's nose, which
//            no driver could avoid): the gate lights red and the cone is zapped.
// That second beat is the paper's reward-hacking story, told in two seconds.

import {
  BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Path, RingGeometry,
  Shape, ShapeGeometry, SphereGeometry, TorusGeometry, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createStage, seg, ease, easeIn, passed } from './kit';
import { sfx } from '../scripts/sound';

const C = {
  islandTop: '#a6dcb3', road: '#3d4350', dash: '#f4f1e8',
  car: '#ff8a3d', glass: '#bfe6ff', roof: '#ffffff', tire: '#25252b', headlight: '#fff1a8',
  gate: '#f2f0ea', lampBox: '#2a2d35', green: '#5be38a', red: '#ff5d5d', dim: '#4a4f5a',
  cone: '#ff7a2f', drone: '#eef3f7', rim: '#2f7d5b', trunk: '#8a5a3c', leaf: '#5fbf7a',
};

const T = 12;                    // full loop: two laps, two tests
const A = 2.5, B = 1.0;          // track ellipse radii (x, z)
const LAP = 6;
const theta = (t: number) => -Math.PI / 2 + (2 * Math.PI / LAP) * t;
const onTrack = (th: number, o = 0) => new Vector3((A + o) * Math.cos(th), 0, (B + o) * Math.sin(th));

export const create = () => createStage((kit) => {
  const { scene, toon, blob } = kit;
  // A flat patch of grass just big enough for the car to run onto.
  const grassShape = new Shape(); grassShape.absellipse(0, 0, A + 0.95, B + 0.8, 0, Math.PI * 2, false);
  const grass = new Mesh(new ShapeGeometry(grassShape, 96), toon(C.islandTop));
  grass.rotation.x = -Math.PI / 2; grass.position.y = 0.0005;
  scene.add(grass);

  // ---------- track ----------
  const ring = new Shape(); ring.absellipse(0, 0, A + 0.3, B + 0.3, 0, Math.PI * 2, false);
  const hole = new Path(); hole.absellipse(0, 0, A - 0.3, B - 0.3, 0, Math.PI * 2, true);
  ring.holes.push(hole);
  const road = new Mesh(new ShapeGeometry(ring, 96), toon(C.road));
  road.rotation.x = -Math.PI / 2; road.position.y = 0.002;
  scene.add(road);
  const dashGeo = new BoxGeometry(0.16, 0.004, 0.03), dashMat = new MeshBasicMaterial({ color: C.dash });
  for (let i = 0; i < 26; i++) {
    const th = (i / 26) * Math.PI * 2, d = new Mesh(dashGeo, dashMat);
    d.position.copy(onTrack(th)).y = 0.006;
    d.rotation.y = Math.atan2(-B * Math.cos(th), -A * Math.sin(th));
    scene.add(d);
  }

  // ---------- a few lollipop trees ----------
  for (const [x, z, s] of [[-1.9, 1.35, 1], [3.0, -0.75, 1.1], [0.35, -0.2, 0.8], [-0.55, 0.25, 0.65]]) {
    const tree = new Group();
    const trunk = new Mesh(new CylinderGeometry(0.03, 0.04, 0.25, 8), toon(C.trunk)); trunk.position.y = 0.125;
    const crown = new Mesh(new SphereGeometry(0.17, 16, 12), toon(C.leaf)); crown.position.y = 0.32;
    tree.add(trunk, crown); tree.position.set(x, 0, z); tree.scale.setScalar(s);
    scene.add(tree);
    const sh = blob(0.5 * s, 0.35 * s); sh.position.set(x, 0.004, z); scene.add(sh);
  }

  // ---------- the checkpoint gate (right side, facing the camera) ----------
  const gate = new Group();
  for (const dx of [-0.42, 0.42]) {
    const post = new Mesh(new CylinderGeometry(0.035, 0.035, 0.8, 10), toon(C.gate));
    post.position.set(dx, 0.4, 0); gate.add(post);
  }
  const bar = new Mesh(new RoundedBoxGeometry(0.98, 0.09, 0.09, 3, 0.03), toon(C.gate));
  bar.position.y = 0.8; gate.add(bar);
  const lampBox = new Mesh(new RoundedBoxGeometry(0.16, 0.3, 0.12, 3, 0.04), toon(C.lampBox));
  lampBox.position.y = 1.0; gate.add(lampBox);
  const lampRed = new MeshBasicMaterial({ color: C.dim }), lampGreen = new MeshBasicMaterial({ color: C.dim });
  for (const [y, m] of [[1.07, lampRed], [0.93, lampGreen]] as const) {
    const l = new Mesh(new SphereGeometry(0.045, 14, 10), m); l.position.set(0, y, 0.06); gate.add(l);
  }
  gate.position.set(A, 0, 0);
  scene.add(gate);

  // ---------- the car ----------
  const car = new Group(), body = new Group();
  car.add(body);
  const hull = new Mesh(new RoundedBoxGeometry(0.56, 0.16, 0.32, 3, 0.06), toon(C.car)); hull.position.y = 0.15;
  const cabin = new Mesh(new RoundedBoxGeometry(0.3, 0.15, 0.28, 3, 0.06), toon(C.glass)); cabin.position.set(-0.03, 0.29, 0);
  const roof = new Mesh(new RoundedBoxGeometry(0.31, 0.04, 0.29, 2, 0.02), toon(C.roof)); roof.position.set(-0.03, 0.37, 0);
  body.add(hull, cabin, roof);
  for (const z of [-0.1, 0.1]) {
    const h = new Mesh(new SphereGeometry(0.028, 10, 8), new MeshBasicMaterial({ color: C.headlight })); h.position.set(0.28, 0.17, z); body.add(h);
  }
  const wheelGeo = new CylinderGeometry(0.075, 0.075, 0.06, 16); wheelGeo.rotateX(Math.PI / 2);
  const wheels: Mesh[] = [];
  for (const [x, z] of [[0.18, 0.165], [0.18, -0.165], [-0.18, 0.165], [-0.18, -0.165]]) {
    const w = new Mesh(wheelGeo, toon(C.tire)); w.position.set(x, 0.075, z); car.add(w); wheels.push(w);
  }
  scene.add(car);
  const puffs = Array.from({ length: 5 }, () => {
    const m = new Mesh(new SphereGeometry(1, 10, 8), new MeshBasicMaterial({ color: '#e9e2cf', transparent: true, depthWrite: false }));
    m.visible = false; scene.add(m); return m;
  });
  const carShadow = blob(0.8, 0.55); scene.add(carShadow);

  // ---------- cones ----------
  const makeCone = () => {
    const g = new Group();
    const base = new Mesh(new RoundedBoxGeometry(0.24, 0.03, 0.24, 2, 0.01), toon(C.cone)); base.position.y = 0.015;
    const cone = new Mesh(new ConeGeometry(0.1, 0.28, 20), toon(C.cone)); cone.position.y = 0.16;
    const band = new Mesh(new CylinderGeometry(0.058, 0.07, 0.05, 20), toon('#ffffff')); band.position.y = 0.16;
    g.add(base, cone, band);
    scene.add(g);
    return g;
  };
  const cone1 = makeCone(), cone2 = makeCone();
  const P1 = onTrack(Math.PI);                          // fair test: left side of the track
  const P2 = onTrack(theta(9.6));                       // cheat: exactly where the car is about to be

  // ---------- the drone (the agent) ----------
  const drone = new Group();
  const dBody = new Mesh(new SphereGeometry(0.2, 24, 16), toon(C.drone)); dBody.scale.y = 0.55; drone.add(dBody);
  const dRim = new Mesh(new TorusGeometry(0.2, 0.025, 10, 32), toon(C.rim)); dRim.rotation.x = Math.PI / 2; drone.add(dRim);
  const led = new MeshBasicMaterial({ color: C.dim });
  const ledM = new Mesh(new SphereGeometry(0.03, 10, 8), led); ledM.position.set(0, 0, 0.19); drone.add(ledM);
  const hub = new Mesh(new CylinderGeometry(0.02, 0.02, 0.08, 8), toon(C.rim)); hub.position.y = 0.13; drone.add(hub);
  const prop = new Mesh(new BoxGeometry(0.5, 0.012, 0.05), toon('#c9d3da')); prop.position.y = 0.17; drone.add(prop);
  scene.add(drone);
  const droneShadow = blob(0.7, 0.7); scene.add(droneShadow);

  // ---------- verdict rings (pulse on the ground where a cone is judged) ----------
  const makeRing = () => {
    const m = new MeshBasicMaterial({ color: C.green, transparent: true, depthWrite: false });
    const r = new Mesh(new RingGeometry(0.2, 0.26, 40), m); r.rotation.x = -Math.PI / 2; r.visible = false;
    scene.add(r); return { r, m };
  };
  const ring1 = makeRing(), ring2 = makeRing();
  ring2.m.color.set(C.red);
  const sparks = kit.sparkles(6);

  const HOME = new Vector3(0, 2.15, -0.4);
  const above = (p: Vector3, y: number) => new Vector3(p.x, y, p.z);

  return (t, prev) => {
    const u = t % T;

    // Car: laps the track, swerving outward around cone 1.
    const th = theta(t);
    const d1 = Math.atan2(Math.sin(th - Math.PI), Math.cos(th - Math.PI));        // angle to cone 1
    // Off the road and back: a wide swerve onto the grass, with a fishtail.
    const swerve = u < 6.3 ? 0.72 * Math.exp(-((d1 / 0.5) ** 2)) : 0;
    const fish = u < 6.3 ? Math.sin(d1 * 9) * 0.35 * Math.exp(-((d1 / 0.45) ** 2)) : 0;
    const p = onTrack(th, swerve);
    const tan = new Vector3(-(A + swerve) * Math.sin(th), 0, (B + swerve) * Math.cos(th));
    car.position.copy(p);
    car.rotation.y = Math.atan2(-tan.z, tan.x) + fish;
    body.position.y = Math.abs(Math.sin(t * 18)) * 0.008;                        // little engine bounce
    body.rotation.x = -swerve * 0.35 * Math.sign(d1);                            // leans into the swerve
    // Dust kicked up while it's on the grass.
    for (const [i, pf] of puffs.entries()) {
      const born = 4.25 + i * 0.1, k = seg(u, born, born + 0.7);
      pf.visible = k > 0 && k < 1;
      if (!pf.visible) continue;
      const th0 = theta(born), d0 = Math.atan2(Math.sin(th0 - Math.PI), Math.cos(th0 - Math.PI));
      pf.position.copy(onTrack(th0, 0.72 * Math.exp(-((d0 / 0.5) ** 2)) + 0.12)).y = 0.06 + k * 0.18;
      pf.scale.setScalar(0.05 + k * 0.13);
      (pf.material as MeshBasicMaterial).opacity = 0.55 * (1 - k);
    }
    wheels.forEach((w) => (w.rotation.z = -t * 14));
    carShadow.position.set(p.x, 0.004, p.z);
    carShadow.rotation.z = car.rotation.y;

    // Drone path: home → over P1 (fair drop) → home → over P2 (cheat) → home.
    let dp: Vector3;
    if (u < 0.6) dp = HOME;
    else if (u < 1.8) dp = new Vector3().lerpVectors(HOME, above(P1, 1.5), ease(seg(u, 0.6, 1.8)));
    else if (u < 2.8) dp = above(P1, 1.5);
    else if (u < 4.0) dp = new Vector3().lerpVectors(above(P1, 1.5), HOME, ease(seg(u, 2.8, 4.0)));
    else if (u < 7.6) dp = HOME;
    else if (u < 8.7) dp = new Vector3().lerpVectors(HOME, above(P2, 1.25), ease(seg(u, 7.6, 8.7)));
    else if (u < 9.8) dp = above(P2, 1.25);
    else if (u < 11.2) dp = new Vector3().lerpVectors(above(P2, 1.25), HOME, ease(seg(u, 9.8, 11.2)));
    else dp = HOME;
    drone.position.copy(dp).y += Math.sin(t * 3.1) * 0.05;
    const busted = u > 8.85 && u < 9.9 ? Math.sin(t * 34) * 0.18 * (1 - seg(u, 8.85, 9.9)) : 0;
    drone.rotation.z = busted;
    drone.rotation.x = 0.12 * Math.sin(t * 1.7);
    prop.rotation.y = t * 30;
    droneShadow.position.set(drone.position.x, 0.004, drone.position.z);
    droneShadow.scale.setScalar(0.6 + 0.4 * (2.4 - drone.position.y) / 1.2);

    // Gate lamp and the drone's LED show the verdict.
    const green = u > 2.0 && u < 3.0, red = u > 8.8 && u < 9.9;
    lampGreen.color.set(green ? C.green : C.dim);
    lampRed.color.set(red ? C.red : C.dim);
    led.color.set(green ? C.green : red ? C.red : C.dim);

    // Cone 1: carried, approved, dropped; cleared away after the car has passed.
    const hang = (c: Group, at: Vector3) => c.position.copy(at).add(new Vector3(0, -0.42, 0));
    if (u < 2.2) { hang(cone1, drone.position); cone1.scale.setScalar(seg(u, 0.2, 0.5)); }
    else {
      const f = easeIn(seg(u, 2.2, 2.55));
      cone1.position.lerpVectors(above(P1, 1.08), P1, f);
      cone1.position.y += Math.sin(Math.PI * seg(u, 2.55, 2.75)) * 0.05;          // tiny bounce
      cone1.scale.setScalar(1 - seg(u, 6.3, 6.6));
    }
    // Cone 2: the cheat. Rejected mid-drop and zapped away.
    if (u < 7.2 || u > 9.4) cone2.scale.setScalar(0.001);
    else if (u < 8.85) { hang(cone2, drone.position); cone2.scale.setScalar(seg(u, 7.2, 7.5)); }
    else {
      cone2.position.copy(above(P2, 0.83 - easeIn(seg(u, 8.85, 9.0)) * 0.15));
      cone2.scale.setScalar(Math.max(0.001, (1 - seg(u, 9.05, 9.35)) * (1 + 0.15 * Math.sin(t * 50))));
    }

    // Verdict rings.
    for (const [rg, at, t0] of [[ring1, P1, 2.0], [ring2, P2, 8.85]] as const) {
      const k = seg(u, t0, t0 + 0.8);
      rg.r.visible = k > 0 && k < 1;
      rg.r.position.set(at.x, 0.01, at.z);
      rg.r.scale.setScalar(1 + k * 1.6);
      rg.m.opacity = 1 - k;
    }
    if (passed(prev, t, 9.05, T)) sparks.burst(t, above(P2, 0.6), ['#ff8a8a', '#ffffff']);
    sparks.update(t);

    // Sound.
    if (passed(prev, t, 2.0, T)) kit.sfx(sfx.ding);
    if (passed(prev, t, 8.85, T)) kit.sfx(sfx.nuhuh);
    if (passed(prev, t, 3.95, T)) kit.sfx(sfx.beep);
  };
}, { lookAt: new Vector3(0, 1.0, 0), ground: 0x24584a, outline: 0.011 });
