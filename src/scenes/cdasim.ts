// CDASim: co-simulation, made visible. Below, a toy city where the simulated
// car (CARLA) drives a planned route through an intersection. Above, a tilted
// dark map (CARMA's view: lanes and the route) with a dot that mirrors the
// car. Little packets shuttle between the two, both ways: that's the bridge.
// The car waits at a red light and goes on green, and the map shows the same
// light: cooperative driving, where cars and signals talk.

import {
  type Object3D, BoxGeometry, CatmullRomCurve3, CylinderGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, TubeGeometry, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createStage, seg, passed, toyCar } from './kit';
import { blink } from './avatar';
import { sfx } from '../scripts/sound';
import { makeHead } from './avatar';
import { load, DEFAULT, type Avatar } from '../scripts/avatar';

const C = {
  off: '#4a4f5a', red: '#ff5d5d', green: '#5be38a',
  ground: '#e4e2dc', road: '#4a505c', paint: '#f4f1e8', route: '#d63aff',
  mapBg: '#123638', lane: '#2fd0c0', car: '#3d8bfd',
  buildings: ['#bfe3e0', '#d9d4ea', '#f0d9c4', '#cfe0f5'],
};

export const create = () => createStage((kit) => {
  const { scene, toon, blob } = kit;

  // ---------- the city (CARLA) ----------
  const ground = new Mesh(new RoundedBoxGeometry(4.6, 0.08, 2.5, 2, 0.04), toon(C.ground)); ground.position.y = -0.04;
  scene.add(ground);
  const roadMat = new MeshBasicMaterial({ color: C.road }), paint = new MeshBasicMaterial({ color: C.paint });
  const ROAD_Z = 0.35, ROAD_X = -0.45;
  const rx = new Mesh(new BoxGeometry(4.6, 0.01, 0.62), roadMat); rx.position.set(0, 0.006, ROAD_Z); scene.add(rx);
  const rz = new Mesh(new BoxGeometry(0.62, 0.01, 2.5), roadMat); rz.position.set(ROAD_X, 0.007, 0); scene.add(rz);
  for (let i = 0; i < 5; i++) {                         // crosswalk
    const s = new Mesh(new BoxGeometry(0.06, 0.012, 0.5), paint); s.position.set(ROAD_X + 0.42 + i * 0.1, 0.008, ROAD_Z); scene.add(s);
  }
  // buildings only along the back, so the intersection stays in view; a few trees up front
  for (const [x, z, w, h, d, c] of [
    [-1.65, -0.8, 0.85, 0.7, 0.5, 0], [0.45, -0.85, 0.6, 1.0, 0.4, 1], [1.2, -0.82, 0.6, 0.55, 0.45, 3], [1.85, -0.8, 0.5, 0.8, 0.5, 2],
  ] as const) {
    const b = new Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.04), toon(C.buildings[c])); b.position.set(x, h / 2, z); scene.add(b);
  }
  for (const [x, z] of [[-1.7, 0.95], [-1.15, 0.98], [0.6, 0.98], [1.4, 0.95], [1.95, 0.98]]) {
    const trunk = new Mesh(new CylinderGeometry(0.025, 0.03, 0.18, 6), toon('#8a5a3c')); trunk.position.set(x, 0.09, z);
    const crown = new Mesh(new SphereGeometry(0.13, 14, 10), toon('#6cc07a')); crown.position.set(x, 0.25, z);
    scene.add(trunk, crown);
  }
  // a traffic light on the corner the car turns at
  const LIGHT = new Vector3(ROAD_X - 0.42, 0, ROAD_Z - 0.44);
  const pole = new Mesh(new CylinderGeometry(0.02, 0.02, 0.5, 8), toon('#8b909c')); pole.position.set(LIGHT.x, 0.25, LIGHT.z);
  const lampBox = new Mesh(new RoundedBoxGeometry(0.13, 0.26, 0.1, 2, 0.035), toon('#2a2d35')); lampBox.position.set(LIGHT.x, 0.6, LIGHT.z);
  const lampRed = new MeshBasicMaterial({ color: C.off }), lampGreen = new MeshBasicMaterial({ color: C.off });
  for (const [y, m] of [[0.66, lampRed], [0.54, lampGreen]] as const) {
    const l = new Mesh(new SphereGeometry(0.04, 12, 9), m); l.position.set(LIGHT.x, y, LIGHT.z + 0.05); scene.add(l);
  }
  scene.add(pole, lampBox);
  // the route the car is told to follow: along the main road, then a left turn
  const route = new CatmullRomCurve3([
    new Vector3(-2.15, 0, ROAD_Z + 0.12), new Vector3(-1.2, 0, ROAD_Z + 0.12), new Vector3(-0.62, 0, ROAD_Z + 0.02),
    new Vector3(-0.32, 0, ROAD_Z - 0.35), new Vector3(-0.3, 0, -0.6), new Vector3(-0.3, 0, -1.15),
  ]);
  const routeMat = new MeshBasicMaterial({ color: C.route, transparent: true, opacity: 0.55, depthWrite: false });
  const routeLine = new Mesh(new TubeGeometry(route, 80, 0.022, 6), routeMat); routeLine.position.y = 0.02; scene.add(routeLine);
  const { car, wheels } = toyCar(kit, C.car);
  car.scale.setScalar(1.15);
  scene.add(car);
  const carShadow = blob(0.75, 0.5); scene.add(carShadow);
  // the driver: the visitor's head (or Will's), leaning out of the window
  const driver = new Group(); driver.position.set(-0.04, 0.34, 0.16); car.add(driver);
  let driverHead: Object3D | null = null;
  const seatDriver = (cfg: Avatar) => {
    driver.clear();
    const h = driverHead = makeHead(kit, cfg); h.scale.setScalar(0.42); h.rotation.set(0.15, 0.5, -0.25);
    kit.outline(h); driver.add(h);
  };
  seatDriver(load() ?? DEFAULT);
  addEventListener('avatar-change', (e) => seatDriver((e as CustomEvent<Avatar | null>).detail ?? DEFAULT));

  // ---------- the map (CARMA's view), floating and tilted toward you ----------
  const map = new Group();
  map.position.set(0.05, 2.05, -0.35); map.rotation.x = 0.85; map.scale.setScalar(0.42);
  scene.add(map);
  const plate = new Mesh(new RoundedBoxGeometry(4.9, 0.05, 2.8, 2, 0.05), new MeshBasicMaterial({ color: C.mapBg, transparent: true, opacity: 0.92 }));
  plate.position.y = -0.03; map.add(plate);
  const laneMat = new MeshBasicMaterial({ color: C.lane });
  for (const dz of [-0.28, 0.28]) { const l = new Mesh(new BoxGeometry(4.5, 0.02, 0.035), laneMat); l.position.set(0, 0.01, ROAD_Z + dz); map.add(l); }
  for (const dx of [-0.28, 0.28]) { const l = new Mesh(new BoxGeometry(0.035, 0.02, 2.5), laneMat); l.position.set(ROAD_X + dx, 0.01, 0); map.add(l); }
  const mapRoute = new Mesh(new TubeGeometry(route, 80, 0.045, 6), new MeshBasicMaterial({ color: C.route })); mapRoute.position.y = 0.02; map.add(mapRoute);
  const dot = new Mesh(new SphereGeometry(0.12, 16, 12), new MeshBasicMaterial({ color: '#ffffff' })); map.add(dot);
  const ring = new Mesh(new SphereGeometry(0.2, 16, 12), new MeshBasicMaterial({ color: C.route, transparent: true, opacity: 0.35, depthWrite: false })); map.add(ring);

  // the same light, as the map sees it
  const mapLight = new MeshBasicMaterial({ color: C.red });
  const ml = new Mesh(new SphereGeometry(0.11, 14, 10), mapLight); ml.position.set(LIGHT.x, 0.06, LIGHT.z); map.add(ml);

  // ---------- packets crossing the bridge, both ways ----------
  const packets = Array.from({ length: 6 }, (_, i) => {
    const up = i % 2 === 0;
    const m = new Mesh(new BoxGeometry(0.06, 0.06, 0.06), new MeshBasicMaterial({ color: up ? C.lane : C.route }));
    scene.add(m); return { m, up, phase: i / 6 };
  });

  const L = 6.6, DRIVE = 5.6, STOP = 0.36, GREEN = 2.3;        // STOP: how far along the route the stop line is
  const pos = new Vector3(), tan = new Vector3(), dotWorld = new Vector3();
  return (t, prev) => {
    const u = t % L;
    // roll up to the light, wait for green, then through the turn
    const a = seg(u, 0, 1.8), b = seg(u, GREEN + 0.15, DRIVE);
    const k = STOP * (1 - (1 - a) * (1 - a)) + (1 - STOP) * b * b * (3 - 2 * b);
    const go = u >= GREEN && u < DRIVE + 0.6;
    lampRed.color.set(go ? C.off : C.red); lampGreen.color.set(go ? C.green : C.off); mapLight.color.set(go ? C.green : C.red);
    ml.scale.setScalar(1 + 0.5 * Math.sin(Math.PI * seg(u, GREEN, GREEN + 0.35)));
    if (driverHead) blink(driverHead, t);
    route.getPointAt(k, pos); route.getTangentAt(k, tan);
    const fade = Math.min(seg(u, 0, 0.25), 1 - seg(u, DRIVE, DRIVE + 0.3));
    car.position.copy(pos);
    car.rotation.y = Math.atan2(-tan.z, tan.x);
    car.scale.setScalar(1.15 * Math.max(0.001, fade));
    wheels.forEach((w) => (w.rotation.z = -k * 60));
    driver.rotation.z = Math.sin(t * 9) * 0.04;                 // bobbing in the breeze
    carShadow.position.set(pos.x, 0.004, pos.z); carShadow.scale.setScalar(Math.max(0.001, fade));
    // the map's dot mirrors the car
    dot.position.set(pos.x, 0.08, pos.z); ring.position.copy(dot.position);
    ring.scale.setScalar(1 + 0.25 * Math.sin(t * 6));
    dot.visible = ring.visible = fade > 0.05;
    map.updateMatrixWorld(); dotWorld.copy(dot.position); map.localToWorld(dotWorld);
    // packets: car → map (teal) and map → car (magenta)
    const from = new Vector3(pos.x, 0.5, pos.z);
    for (const p of packets) {
      const f = (t * 0.9 + p.phase) % 1;
      p.m.position.lerpVectors(p.up ? from : dotWorld, p.up ? dotWorld : from, f);
      p.m.scale.setScalar(Math.max(0.001, Math.sin(Math.PI * f) * fade));
      p.m.rotation.set(t * 3, t * 2, 0);
    }
    map.position.y = 2.05 + Math.sin(t * 1.4) * 0.04;
    // a soft bip when the light turns green
    if (passed(prev, t, GREEN, L)) kit.sfx(sfx.bip);
  };
}, { lookAt: new Vector3(0, 1.05, 0), minSpan: 6.0, minHeight: 3.8, outline: 0.012 });
