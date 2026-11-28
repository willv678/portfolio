// WarpPoint: a toy Switch and a laptop on a little floating island, and a UFO
// carrying a glowing floppy (the save) from one to the other, then back.
// The product in one loop: your save is already on the other device. Both
// screens show the same little game: wherever the save lands, the hero jumps
// to where the other device left it, plays on a stop, and the save goes back.
//
// Personality comes from motion, not faces: the sender shivers as its save is
// beamed up, the receiver hops (the laptop flaps its lid) when it lands.

import {
  CanvasTexture, Color, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry,
  ShaderMaterial, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3, type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createStage, seg, ease, passed } from './kit';
import { sfx } from '../scripts/sound';
import { makeHead, blink } from './avatar';
import { load, DEFAULT, type Avatar } from '../scripts/avatar';

const C = {
  ink: '#2a2733', switchBody: '#34323b', joyL: '#2fc2ee', joyR: '#ff5d5d',
  laptop: '#d3d5de', keys: '#3a3a42', screen: '#9fdcff',
  saucer: '#efeaff', rim: '#7b6cf6', dome: '#c9f0ff', light: '#ffd66b', save: '#ffe68a', beam: '#8f7dff',
  floppy: '#6a5cf0', alien: '#7fdc8c',
};

export const create = () => createStage((kit) => {
  const { scene, toon, blob } = kit;

  // ---------- the game on both screens ----------
  // A hero on a path of four stops. `v` is how far along it is (whole numbers
  // are stops; in between, it's hopping to the next one).
  const mkScreen = () => {
    const c = document.createElement('canvas'); c.width = 160; c.height = 96;
    const tex = kit.own(new CanvasTexture(c)); tex.colorSpace = SRGBColorSpace;
    return { g: c.getContext('2d')!, tex, last: '', mat: new MeshBasicMaterial({ map: tex }) };
  };
  const drawGame = (s: ReturnType<typeof mkScreen>, v: number, flash: number) => {
    const key = v.toFixed(3) + flash.toFixed(2);
    if (key === s.last) return; s.last = key;
    const g = s.g, W = 160, w = v % 4, TAU = Math.PI * 2;
    g.fillStyle = C.screen; g.fillRect(0, 0, W, 96);
    g.fillStyle = '#fff6c9'; g.beginPath(); g.arc(130, 22, 10, 0, TAU); g.fill();
    g.fillStyle = '#9ad9ae';
    g.beginPath(); g.ellipse(38, 80, 62, 30, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(128, 84, 58, 26, 0, 0, TAU); g.fill();
    g.fillStyle = '#6cc07a'; g.fillRect(0, 72, W, 24);
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 3; i++) g.fillRect(29 + i * 40, 80, 22, 2);
    // a stop lights up as the hero touches down on it
    for (let i = 0; i < 4; i++) { g.fillStyle = i <= w + 0.04 ? C.light : '#ffffff'; g.beginPath(); g.arc(20 + i * 40, 81, 5.5, 0, TAU); g.fill(); }
    const hop = Math.sin(Math.PI * (w - Math.floor(w)));
    for (const x of [20 + w * 40, 20 + w * 40 - W]) {         // past the last stop it walks off one edge and in at the other
      const y = 66 - hop * 13;
      g.fillStyle = C.floppy; g.beginPath(); g.arc(x, y, 8.5, 0, TAU); g.fill(); g.fillRect(x - 8.5, y, 17, 8);
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - 3, y - 1, 2, 0, TAU); g.arc(x + 3.5, y - 1, 2, 0, TAU); g.fill();
    }
    if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash.toFixed(2)})`; g.fillRect(0, 0, W, 96); }
    s.tex.needsUpdate = true;
  };
  const swGame = mkScreen(), lapGame = mkScreen();

  // ---------- the Switch (left) ----------
  const sw = new Group();
  const swTilt = new Group();                           // leaning back on its kickstand
  swTilt.rotation.x = -0.28;
  swTilt.position.y = 0.5;
  sw.add(swTilt);
  swTilt.add(new Mesh(new RoundedBoxGeometry(1.5, 0.88, 0.12, 4, 0.04), toon(C.switchBody)));
  const swScreenMat = swGame.mat;
  const swScreen = new Mesh(new PlaneGeometry(1.2, 0.68), swScreenMat);
  swScreen.position.z = 0.061;
  swTilt.add(swScreen);
  for (const [side, color] of [[-1, C.joyL], [1, C.joyR]] as const) {
    const joy = new Mesh(new RoundedBoxGeometry(0.34, 0.88, 0.15, 4, 0.13), toon(color));
    joy.position.x = side * 0.92;
    swTilt.add(joy);
    const stick = new Mesh(new CylinderGeometry(0.06, 0.06, 0.06, 16), toon(C.ink));
    stick.rotation.x = Math.PI / 2;
    stick.position.set(side * 0.92, side < 0 ? 0.2 : -0.08, 0.09);
    swTilt.add(stick);
  }
  sw.position.set(-2.1, 0, 0);
  sw.rotation.y = 0.32;
  scene.add(sw);
  const swShadow = blob(2.6, 1.2); swShadow.position.x = -2.1; scene.add(swShadow);

  // ---------- the laptop (right) ----------
  const lap = new Group();
  const base = new Mesh(new RoundedBoxGeometry(1.9, 0.07, 1.25, 3, 0.03), toon(C.laptop));
  base.position.y = 0.035;
  lap.add(base);
  const keys = new Mesh(new PlaneGeometry(1.55, 0.6), toon(C.keys));
  keys.rotation.x = -Math.PI / 2; keys.position.set(0, 0.072, -0.12);
  lap.add(keys);
  const hinge = new Group();                            // lid pivots on the back edge
  hinge.position.set(0, 0.07, -0.6);
  hinge.rotation.x = -0.22;
  lap.add(hinge);
  const lid = new Mesh(new RoundedBoxGeometry(1.9, 1.22, 0.05, 3, 0.03), toon(C.laptop));
  lid.position.y = 0.61;
  hinge.add(lid);
  const lapScreenMat = lapGame.mat;
  const lapScreen = new Mesh(new PlaneGeometry(1.7, 1.02), lapScreenMat);
  lapScreen.position.set(0, 0.62, 0.027);
  hinge.add(lapScreen);
  lap.position.set(2.1, 0, 0);
  lap.rotation.y = -0.32;
  scene.add(lap);
  const lapShadow = blob(2.8, 2); lapShadow.position.x = 2.1; scene.add(lapShadow);

  // Where the save enters each device (top edge, a little inside).
  const swPort = new Vector3(-2.1, 0.86, -0.05);
  const lapPort = new Vector3(2.1, 1.2, -0.7);

  // ---------- the UFO ----------
  const ufo = new Group();
  const hull = new Group();                             // spins, and tilts while flying
  ufo.add(hull);
  const saucer = new Mesh(new SphereGeometry(0.7, 40, 20), toon(C.saucer));
  saucer.scale.y = 0.26;
  hull.add(saucer);
  const rim = new Mesh(new TorusGeometry(0.68, 0.05, 12, 48), toon(C.rim));
  rim.rotation.x = Math.PI / 2;
  hull.add(rim);
  const dome = new Mesh(new SphereGeometry(0.44, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    toon(C.dome, { transparent: true, opacity: 0.32, depthWrite: false }));
  dome.position.y = 0.1;
  hull.add(dome);
  const lights: MeshBasicMaterial[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, m = new MeshBasicMaterial({ color: C.light });
    const s = new Mesh(new SphereGeometry(0.045, 10, 8), m);
    s.position.set(Math.cos(a) * 0.55, -0.03, Math.sin(a) * 0.55);
    hull.add(s); lights.push(m);
  }
  // The pilot: the visitor's avatar head (or Will's), in the dome. Doesn't spin with the hull.
  const pilot = new Group();
  pilot.position.y = 0.3;
  ufo.add(pilot);
  let pilotHead: Object3D | null = null;
  const seat = (cfg: Avatar) => {
    pilot.clear();
    const h = pilotHead = makeHead(kit, cfg); h.scale.setScalar(0.68); h.position.y = 0.02;
    kit.outline(h); pilot.add(h);
  };
  seat(load() ?? DEFAULT);
  addEventListener('avatar-change', (e) => seat((e as CustomEvent<Avatar | null>).detail ?? DEFAULT));
  scene.add(ufo);
  const ufoShadow = blob(1.6, 1.6);
  scene.add(ufoShadow);

  // The beam: an open cone hanging from the UFO, faded toward the ground,
  // with soft rings sliding down it.
  const beamMat = new ShaderMaterial({
    transparent: true, depthWrite: false, side: DoubleSide,
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uColor: { value: new Color(C.beam) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      uniform float uTime, uOn; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float fade = smoothstep(0., .85, vUv.y);
        float rings = .65 + .35 * sin(vUv.y * 22. + uTime * 6.);
        gl_FragColor = vec4(uColor, fade * rings * .5 * uOn);
      }`,
  });
  const beamGeo = new CylinderGeometry(0.22, 0.62, 1, 32, 1, true);
  beamGeo.translate(0, -0.5, 0);                        // top of the cone at the origin
  const beam = new Mesh(beamGeo, beamMat);
  scene.add(beam);

  // ---------- the save: a tiny floppy disk ----------
  const save = new Group();
  save.add(new Mesh(new RoundedBoxGeometry(0.34, 0.34, 0.05, 3, 0.03), toon(C.floppy)));
  for (const f of [1, -1]) {                            // both faces, so it reads while spinning
    const label = new Mesh(new PlaneGeometry(0.24, 0.15), new MeshBasicMaterial({ color: '#ffffff' }));
    label.position.set(0, -0.07, f * 0.027); label.rotation.y = f > 0 ? 0 : Math.PI;
    const shutter = new Mesh(new PlaneGeometry(0.16, 0.1), toon('#cfd3dc'));
    shutter.position.set(0.02, 0.1, f * 0.027); shutter.rotation.y = f > 0 ? 0 : Math.PI;
    save.add(label, shutter);
    // The details that make it read as a floppy: the slot in the metal shutter, lines
    // on the label, and the write-protect notch in the corner.
    const detail = (w: number, h: number, color: string, x: number, y: number) => {
      const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color }));
      m.position.set(x, y, f * 0.0285); m.rotation.y = f > 0 ? 0 : Math.PI;
      save.add(m);
    };
    detail(0.045, 0.075, '#2f2a4a', f > 0 ? 0.055 : -0.015, 0.1);   // shutter slot (inside the shutter on both faces)
    detail(0.17, 0.014, '#cbc5f3', 0, -0.045);                       // label lines
    detail(0.17, 0.014, '#cbc5f3', 0, -0.085);
    detail(0.022, 0.03, '#2f2a4a', f * -0.135, -0.14);               // write-protect notch
  }
  scene.add(save);
  const glow = kit.glow('#ffcf3d');
  scene.add(glow);
  const sparks = kit.sparkles();

  // ---------- the loop ----------
  // One leg = pick up at A, fly, drop at B. Two legs = A→B→A.
  const LEG = 5.4, CRUISE = 2.35, LAND = 4.35;
  const hoverOver = (p: Vector3) => new Vector3(p.x * 0.97, CRUISE, p.z + 0.25);
  const SW = { group: sw, game: swGame }, LAP = { group: lap, game: lapGame };

  return (t, prev) => {
    const n = Math.floor(t / LEG), k = n % 2, u = t % LEG;
    if (pilotHead) blink(pilotHead, t);
    const [fromPort, toPort, from, to] = k === 0 ? [swPort, lapPort, SW, LAP] : [lapPort, swPort, LAP, SW];
    const A = hoverOver(fromPort), B = hoverOver(toPort);

    // UFO: hover over A, fly to B (tilting into the turn), bob the whole time.
    const speed = Math.sin(Math.PI * seg(u, 1.5, 3.2));
    const dir = Math.sign(B.x - A.x);
    const pos = new Vector3().lerpVectors(A, B, ease(seg(u, 1.5, 3.2)));
    ufo.position.copy(pos).y += Math.sin(t * 2.4) * 0.06;
    hull.rotation.z = -dir * speed * 0.28;
    hull.rotation.y = t * 0.6;
    lights.forEach((m, i) => m.color.set(Math.floor(t * 8) % 8 === i ? '#ffffff' : C.light));
    ufoShadow.position.set(ufo.position.x, 0.004, ufo.position.z);
    ufoShadow.scale.setScalar(0.8 + 0.08 * Math.sin(t * 2.4));

    // Beam: on while picking up and while dropping off.
    const on = Math.max(Math.min(seg(u, 0.1, 0.35), 1 - seg(u, 1.15, 1.4)), Math.min(seg(u, 3.3, 3.55), 1 - seg(u, 4.4, 4.65)));
    const target = ufo.position.x < 0 ? swPort : lapPort;
    beam.position.set(ufo.position.x, ufo.position.y - 0.08, ufo.position.z);
    beam.scale.set(1, Math.max(0.01, ufo.position.y - 0.08 - target.y + 0.1), 1);
    beamMat.uniforms.uTime.value = t;
    beamMat.uniforms.uOn.value = on;

    // Pilot looks where it's going, and down while the beam is on.
    pilot.rotation.set(on * 0.35, dir * 0.7 * speed, hull.rotation.z);
    pilot.position.y = 0.3 + Math.sin(t * 5) * 0.008;     // sits up high enough that the whole face clears the rim

    // Save: rises A→UFO, rides along, sinks UFO→B.
    const under = pos.clone().add(new Vector3(0, -0.32, 0));
    let s: Vector3, scale: number;
    if (u < 1.4) { s = new Vector3().lerpVectors(fromPort, under, ease(seg(u, 0.35, 1.2))); scale = seg(u, 0.35, 0.55); }
    else if (u < 3.55) { s = under; scale = 1; }
    else { s = new Vector3().lerpVectors(under, toPort, ease(seg(u, 3.55, LAND))); scale = 1 - seg(u, 4.15, LAND); }
    save.position.copy(s);
    save.scale.setScalar(Math.max(0.001, scale));
    save.rotation.set(Math.sin(t * 2) * 0.15, t * 2.2, Math.sin(t * 1.3) * 0.1);
    glow.position.copy(s);
    glow.scale.setScalar(Math.max(0.001, scale) * (0.8 + 0.1 * Math.sin(t * 6)));

    // Devices: the sender shivers while its save leaves; the receiver hops,
    // its screen brightens, and the laptop flaps its lid.
    for (const d of [SW, LAP]) {
      const h = d === to ? u - LAND : -1;
      const hop = h >= 0 && h < 0.45 ? Math.sin((Math.PI * h) / 0.45) : 0;
      const sq = h >= 0 && h < 0.7 ? Math.sin((2 * Math.PI * h) / 0.7) * 0.07 * (1 - h / 0.7) : 0;
      d.group.position.y = hop * 0.2;
      d.group.scale.set(1 - sq, 1 + sq, 1 - sq);
      d.group.rotation.z = d === from && u > 0.35 && u < 1.2 ? Math.sin(t * 40) * 0.018 : 0;
      // the game: the receiver is one stop behind until the save lands, then
      // catches up in a flash and plays on to the next stop; the sender is
      // just finishing that stop as its save is picked up
      if (d === to) drawGame(d.game, u < LAND ? n : n + 1 + ease(seg(u, LAND + 0.3, LEG + 0.3)), h >= 0 ? Math.max(0, 1 - h / 0.5) * 0.85 : 0);
      else drawGame(d.game, n === 0 ? 1 : n + ease(seg(u + LEG, LAND + 0.3, LEG + 0.3)), 0);
    }
    const lh = to === LAP ? u - LAND : -1;
    hinge.rotation.x = -0.22 - (lh >= 0 && lh < 0.6 ? Math.sin((Math.PI * lh) / 0.6) * 0.22 : 0);

    if (passed(prev, t, LAND, LEG)) sparks.burst(t, toPort);
    sparks.update(t);

    // Sound.
    if (passed(prev, t, 0.3, LEG)) kit.sfx(() => sfx.pull(0.9));     // being sucked up…
    if (passed(prev, t, 1.2, LEG)) kit.sfx(sfx.pop);                 // …caught
    if (passed(prev, t, 3.45, LEG)) kit.sfx(() => sfx.lower(0.9));   // lowered down…
    if (passed(prev, t, LAND, LEG)) kit.sfx(sfx.plink);              // …landed
  };
});
