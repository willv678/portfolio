// WarpPoint banner scene: a toy Switch and a laptop, and the UFO carrying a
// glowing save file from one to the other, then back. It's the product in one
// loop: your save is already on the other device.
//
// create() builds the scene once (no drawing yet); attach(el) plays it inside
// `el`, detach() pauses it and takes the canvas out. Building once and reusing
// is what makes the home panel instant. Everything is built from primitives
// (no model files), flat "toon" shading, ~10s loop.

import {
  AdditiveBlending, BufferGeometry, Float32BufferAttribute, Points, SRGBColorSpace, CanvasTexture, Sprite, SpriteMaterial, Clock, Color, CylinderGeometry, DataTexture, DirectionalLight, DoubleSide, Group, HemisphereLight, MathUtils, Mesh, MeshBasicMaterial, MeshToonMaterial, NearestFilter, PerspectiveCamera, PlaneGeometry, RedFormat, Scene, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3, WebGLRenderer,
  type MeshToonMaterialParameters,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const C = {
  ink: '#2a2733', switchBody: '#34323b', joyL: '#2fc2ee', joyR: '#ff5d5d',
  laptop: '#dcdde3', keys: '#3a3a42', screen: '#9fdcff', screenOff: '#1d1b26',
  saucer: '#efeaff', rim: '#7b6cf6', dome: '#c9f0ff', light: '#ffd66b', save: '#ffe68a', beam: '#cfc6ff', floppy: '#6a5cf0',
  face: '#1d1b33', alien: '#8ee89a', islandTop: '#b9afff', islandSide: '#6d5fe6',
};

// ---------- small helpers ----------
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface SceneHandle {
  attach(el: HTMLElement): void;   // start playing inside el (from the top of the loop)
  detach(): void;                  // pause and remove the canvas; cheap to re-attach
  dispose(): void;                 // free everything
}

export function create(): SceneHandle | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;                                        // no WebGL: the SVG banner stays
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const canvas = renderer.domElement;
  canvas.className = 'scene-canvas';
  let el: HTMLElement | null = null;

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.1, 100);
  const lookAt = new Vector3(0, 1.3, 0);
  const camDir = new Vector3(0, 0.3, 1).normalize();

  // Toon shading: three flat tones, like a 3DS menu render.
  const ramp = new DataTexture(new Uint8Array([110, 185, 255]), 3, 1, RedFormat);
  ramp.minFilter = ramp.magFilter = NearestFilter;
  ramp.needsUpdate = true;
  const toon = (color: string, extra: MeshToonMaterialParameters = {}) =>
    new MeshToonMaterial({ color, gradientMap: ramp, ...extra });

  scene.add(new HemisphereLight(0xffffff, 0x5b48c9, 1.6));
  const sun = new DirectionalLight(0xffffff, 2.4);
  sun.position.set(3, 6, 5);
  scene.add(sun);

  // Soft round "blob" shadows instead of real shadow maps: cheap and toy-like.
  const blobTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(10,6,30,.55)'); r.addColorStop(1, 'rgba(10,6,30,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return new CanvasTexture(c);
  })();
  const blob = (w: number, d: number) => {
    const m = new Mesh(new PlaneGeometry(w, d), new MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.002;
    return m;
  };

  // ---------- faces on the screens ----------
  // Each screen is a little canvas face. It's only redrawn when the expression
  // or where the eyes point actually changes.
  type Mood = 'idle' | 'blink' | 'wow' | 'happy';
  const faceTextures: CanvasTexture[] = [];
  function makeFace() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 150;
    const g = c.getContext('2d')!;
    const tex = new CanvasTexture(c); tex.colorSpace = SRGBColorSpace; faceTextures.push(tex);
    let key = '';
    function set(mood: Mood, lookX: number, lookY: number) {
      const k = `${mood}${Math.round(lookX * 6)}${Math.round(lookY * 6)}`;
      if (k === key) return;
      key = k;
      const ex = 46, ey = 62, px = lookX * 9, py = lookY * 7;
      g.fillStyle = C.screen; g.fillRect(0, 0, 256, 150);
      g.fillStyle = g.strokeStyle = C.face; g.lineCap = 'round'; g.lineWidth = 7;
      const smile = () => { g.beginPath(); g.arc(128, 90, 13, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); };
      if (mood === 'happy') {
        for (const d of [-1, 1]) { g.beginPath(); g.arc(128 + d * ex, ey + 8, 14, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
        g.fillStyle = 'rgba(255,120,150,.55)';
        for (const d of [-1, 1]) { g.beginPath(); g.ellipse(128 + d * 80, 94, 16, 9, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = C.face; g.beginPath(); g.arc(128, 88, 19, 0, Math.PI); g.closePath(); g.fill();
        g.fillStyle = '#ff7a8a'; g.beginPath(); g.arc(128, 98, 8, 0, Math.PI); g.fill();
      } else if (mood === 'blink') {
        for (const d of [-1, 1]) { g.beginPath(); g.moveTo(128 + d * ex - 12 + px, ey + py); g.lineTo(128 + d * ex + 12 + px, ey + py); g.stroke(); }
        smile();
      } else {
        const big = mood === 'wow' ? 1.22 : 1;
        for (const d of [-1, 1]) {
          g.fillStyle = C.face; g.beginPath(); g.ellipse(128 + d * ex + px, ey + py, 12 * big, 17 * big, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(128 + d * ex + px - 4, ey + py - 7, 4.5, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = C.face;
        if (mood === 'wow') { g.beginPath(); g.ellipse(128, 104, 9, 11, 0, 0, Math.PI * 2); g.fill(); } else smile();
      }
      tex.needsUpdate = true;
    }
    set('idle', 0, 0);
    return { tex, set };
  }
  const swFace = makeFace(), lapFace = makeFace();

  // ---------- the floating island they sit on ----------
  const island = new Mesh(new CylinderGeometry(3.55, 3.25, 0.34, 72),
    [toon(C.islandSide), toon(C.islandTop), toon(C.islandSide)]);
  island.scale.z = 0.5;
  island.position.y = -0.17;
  scene.add(island);

  // ---------- twinkling stars behind everything ----------
  const starGeo = new BufferGeometry(), N = 70, sp: number[] = [], ph: number[] = [];
  for (let i = 0; i < N; i++) {
    sp.push((Math.random() - 0.5) * 18, 0.4 + Math.random() * 5.5, -4.5 - Math.random() * 3);
    ph.push(Math.random() * 6.283);
  }
  starGeo.setAttribute('position', new Float32BufferAttribute(sp, 3));
  starGeo.setAttribute('phase', new Float32BufferAttribute(ph, 1));
  const starMat = new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPR: { value: Math.min(devicePixelRatio, 2) } },
    vertexShader: `attribute float phase; uniform float uTime, uPR; varying float vA;
      void main(){ vA = .25 + .75 * (.5 + .5 * sin(uTime * 1.6 + phase * 3.));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        gl_PointSize = (1.6 + 2.2 * fract(phase)) * uPR; }`,
    fragmentShader: `varying float vA;
      void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard;
        gl_FragColor = vec4(1., .97, .9, vA * smoothstep(.5, .1, d)); }`,
  });
  scene.add(new Points(starGeo, starMat));

  // ---------- the Switch (left) ----------
  const sw = new Group();
  const swTilt = new Group();                     // leaning back on its kickstand
  swTilt.rotation.x = -0.28;
  swTilt.position.y = 0.5;
  sw.add(swTilt);
  swTilt.add(new Mesh(new RoundedBoxGeometry(1.5, 0.88, 0.12, 4, 0.04), toon(C.switchBody)));
  const swScreenMat = new MeshBasicMaterial({ map: swFace.tex });
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
  const swBlob = blob(2.6, 1.2); swBlob.position.x = -2.1; scene.add(swBlob);
  sw.position.set(-2.1, 0, 0);
  sw.rotation.y = 0.32;
  scene.add(sw);

  // ---------- the laptop (right) ----------
  const lap = new Group();
  const base = new Mesh(new RoundedBoxGeometry(1.9, 0.07, 1.25, 3, 0.03), toon(C.laptop));
  base.position.y = 0.035;
  lap.add(base);
  const keys = new Mesh(new PlaneGeometry(1.55, 0.6), toon(C.keys));
  keys.rotation.x = -Math.PI / 2; keys.position.set(0, 0.072, -0.12);
  lap.add(keys);
  const hinge = new Group();                      // lid pivots on the back edge
  hinge.position.set(0, 0.07, -0.6);
  hinge.rotation.x = -0.22;
  lap.add(hinge);
  const lid = new Mesh(new RoundedBoxGeometry(1.9, 1.22, 0.05, 3, 0.03), toon(C.laptop));
  lid.position.y = 0.61;
  hinge.add(lid);
  const lapScreenMat = new MeshBasicMaterial({ map: lapFace.tex });
  const lapScreen = new Mesh(new PlaneGeometry(1.7, 1.02), lapScreenMat);
  lapScreen.position.set(0, 0.62, 0.027);
  hinge.add(lapScreen);
  const lapBlob = blob(2.8, 2); lapBlob.position.x = 2.1; scene.add(lapBlob);
  lap.position.set(2.1, 0, 0);
  lap.rotation.y = -0.32;
  scene.add(lap);

  // Where the save file enters each device (top edge, a little inside).
  const swPort = new Vector3(-2.1, 0.86, -0.05);
  const lapPort = new Vector3(2.1, 1.2, -0.7);

  // ---------- the UFO ----------
  const ufo = new Group();
  const hull = new Group();                       // tilts while flying
  ufo.add(hull);
  const saucer = new Mesh(new SphereGeometry(0.7, 40, 20), toon(C.saucer));
  saucer.scale.y = 0.26;
  hull.add(saucer);
  const rim = new Mesh(new TorusGeometry(0.68, 0.05, 12, 48), toon(C.rim));
  rim.rotation.x = Math.PI / 2;
  hull.add(rim);
  const dome = new Mesh(
    new SphereGeometry(0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    toon(C.dome, { transparent: true, opacity: 0.42, depthWrite: false }),
  );
  dome.position.y = 0.1;
  hull.add(dome);
  const lights: MeshBasicMaterial[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, m = new MeshBasicMaterial({ color: C.light });
    const s = new Mesh(new SphereGeometry(0.045, 10, 8), m);
    s.position.set(Math.cos(a) * 0.55, -0.03, Math.sin(a) * 0.55);
    hull.add(s); lights.push(m);
  }
  // The pilot: sits in the dome but doesn't spin with the hull.
  const pilot = new Group();
  pilot.position.y = 0.2;
  ufo.add(pilot);
  const head = new Mesh(new SphereGeometry(0.15, 24, 16), toon(C.alien));
  head.scale.set(1, 0.92, 1);
  pilot.add(head);
  for (const d of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.036, 12, 8), new MeshBasicMaterial({ color: C.face }));
    eye.position.set(d * 0.058, 0.02, 0.128); eye.scale.set(1, 1.45, 0.6);
    pilot.add(eye);
  }
  const stalk = new Mesh(new CylinderGeometry(0.009, 0.009, 0.08, 6), toon(C.alien));
  stalk.position.y = 0.16;
  const bulb = new Mesh(new SphereGeometry(0.026, 12, 8), new MeshBasicMaterial({ color: C.light }));
  bulb.position.y = 0.205;
  pilot.add(stalk, bulb);
  scene.add(ufo);
  const ufoBlob = blob(1.6, 1.6);
  scene.add(ufoBlob);

  // The beam: an open cone hanging from the UFO, faded toward the ground with
  // soft rings sliding down it.
  const beamMat = new ShaderMaterial({
    transparent: true, depthWrite: false, side: DoubleSide,
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uColor: { value: new Color(C.beam) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      uniform float uTime, uOn; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float fade = smoothstep(0., .85, vUv.y);                     // brighter near the UFO
        float rings = .65 + .35 * sin(vUv.y * 22. + uTime * 6.);
        gl_FragColor = vec4(uColor, fade * rings * .55 * uOn);
      }`,
  });
  const beamGeo = new CylinderGeometry(0.22, 0.62, 1, 32, 1, true);
  beamGeo.translate(0, -0.5, 0);                        // top of the cone at the origin
  const beam = new Mesh(beamGeo, beamMat);
  scene.add(beam);

  // ---------- the save file: a tiny floppy disk, the universal "save" icon ----------
  const save = new Group();
  const disk = new Mesh(new RoundedBoxGeometry(0.34, 0.34, 0.05, 3, 0.03), toon(C.floppy));
  save.add(disk);
  for (const z of [0.026, -0.026]) {                    // both faces, so it reads while spinning
    const f = z > 0 ? 1 : -1;
    const label = new Mesh(new PlaneGeometry(0.24, 0.15), new MeshBasicMaterial({ color: '#ffffff' }));
    label.position.set(0, -0.07, z + f * 0.001); label.rotation.y = f > 0 ? 0 : Math.PI;
    const shutter = new Mesh(new PlaneGeometry(0.16, 0.1), toon('#cfd3dc'));
    shutter.position.set(0.02, 0.1, z + f * 0.001); shutter.rotation.y = f > 0 ? 0 : Math.PI;
    save.add(label, shutter);
  }
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,230,140,.9)'); r.addColorStop(.4, 'rgba(255,220,120,.35)'); r.addColorStop(1, 'rgba(255,220,120,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return new CanvasTexture(c);
  })();
  const glow = new Sprite(new SpriteMaterial({ map: glowTex, blending: AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.setScalar(0.85);
  scene.add(glow);                                      // follows the floppy, but doesn't spin with it
  scene.add(save);

  // ---------- sparkles when the save lands ----------
  const sparkTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff';
    g.beginPath();
    // 4-point star: curve in toward the middle between each tip
    g.moveTo(32, 2); g.quadraticCurveTo(36, 28, 62, 32); g.quadraticCurveTo(36, 36, 32, 62);
    g.quadraticCurveTo(28, 36, 2, 32); g.quadraticCurveTo(28, 28, 32, 2); g.fill();
    return new CanvasTexture(c);
  })();
  const sparks = Array.from({ length: 9 }, (_, i) => {
    const m = new SpriteMaterial({ map: sparkTex, color: i % 3 ? C.save : '#ffffff', transparent: true, depthWrite: false, blending: AdditiveBlending });
    const sp = new Sprite(m); sp.visible = false; scene.add(sp);
    return { sp, m, a: (i / 9) * Math.PI * 2 + 0.3, r: 0.75 + (i % 3) * 0.2 };
  });

  // ---------- the loop ----------
  // One leg = pick up at A, fly, drop at B. Two legs = A→B→A.
  const LEG = 5.4, CRUISE = 2.35;
  const hoverOver = (p: Vector3) => new Vector3(p.x * 0.97, CRUISE, p.z + 0.25);

  function pose(t: number) {
    const k = Math.floor(t / LEG) % 2, u = t % LEG;
    const [fromPort, toPort] = k === 0 ? [swPort, lapPort] : [lapPort, swPort];
    const A = hoverOver(fromPort), B = hoverOver(toPort);

    const fly = ease(seg(u, 1.5, 3.2));
    const pos = new Vector3().lerpVectors(A, B, fly);
    const speed = Math.sin(Math.PI * seg(u, 1.5, 3.2));          // 0 → 1 → 0 across the flight
    const dir = Math.sign(B.x - A.x);

    // beam: on while picking up (0.1–1.3) and dropping off (3.3–4.6)
    const on = Math.max(
      Math.min(seg(u, 0.1, 0.35), 1 - seg(u, 1.15, 1.4)),
      Math.min(seg(u, 3.3, 3.55), 1 - seg(u, 4.4, 4.65)),
    );

    // save file: rises A→UFO, rides along, sinks UFO→B
    const under = new Vector3(0, -0.32, 0);
    let s: Vector3, scale: number;
    if (u < 1.4) {
      const r = ease(seg(u, 0.35, 1.2));
      s = new Vector3().lerpVectors(fromPort, pos.clone().add(under), r);
      scale = seg(u, 0.35, 0.55);
    } else if (u < 3.55) {
      s = pos.clone().add(under); scale = 1;
    } else {
      const r = ease(seg(u, 3.55, 4.35));
      s = new Vector3().lerpVectors(pos.clone().add(under), toPort, r);
      scale = 1 - seg(u, 4.15, 4.35);
    }
    return { pos, tilt: -dir * speed * 0.28, dir, flying: speed, on, s, scale, k, u, toPort };
  }

  const SW = { group: sw, face: swFace, x: -2.1, blink: 0.0 };
  const LAP = { group: lap, face: lapFace, x: 2.1, blink: 1.7 };
  const LAND = 4.35;                                    // when the save reaches the device
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e: PointerEvent) => {
    const r = el!.getBoundingClientRect();
    parallax.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.8;
    parallax.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.4;
  };
  const onLeave = () => { parallax.tx = parallax.ty = 0; };

  function resize() {
    const w = el?.clientWidth ?? 0, h = el?.clientHeight ?? 0;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit ~7.8 units of width, and enough height for the UFO, at any aspect.
    const span = Math.max(7.8, 4.5 * camera.aspect);
    camera.userData.dist = span / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    camera.updateProjectionMatrix();
  }

  function draw(t: number) {
    const p = pose(t);
    const bob = Math.sin(t * 2.4) * 0.06;

    ufo.position.copy(p.pos).y += bob;
    hull.rotation.z = p.tilt;
    hull.rotation.y = t * 0.6;
    lights.forEach((m, i) => m.color.set(Math.floor(t * 8) % 8 === i ? '#ffffff' : C.light));
    ufoBlob.position.set(ufo.position.x, 0.003, ufo.position.z);
    ufoBlob.scale.setScalar(0.8 + 0.08 * Math.sin(t * 2.4));

    // Beam reaches from the UFO's belly down to the target device, stretching with the bob.
    const target = p.pos.x < 0 ? swPort : lapPort;
    beam.position.set(ufo.position.x, ufo.position.y - 0.08, ufo.position.z);
    beam.scale.set(1, Math.max(0.01, ufo.position.y - 0.08 - target.y + 0.1), 1);
    beamMat.uniforms.uTime.value = t;
    beamMat.uniforms.uOn.value = p.on;

    save.position.copy(p.s);
    save.scale.setScalar(Math.max(0.001, p.scale));
    save.rotation.set(Math.sin(t * 2) * 0.15, t * 2.2, Math.sin(t * 1.3) * 0.1);   // spin + wobble
    glow.position.copy(p.s);
    glow.scale.setScalar(Math.max(0.001, p.scale) * (0.85 + 0.12 * Math.sin(t * 6)));

    // The devices: eyes follow the UFO; the sender looks surprised as its save
    // is beamed up (and shivers a bit); the receiver watches it come, then
    // hops with a happy face when it lands.
    const from = p.k === 0 ? SW : LAP, to = p.k === 0 ? LAP : SW, u = p.u;
    for (const d of [SW, LAP]) {
      const look = Math.max(-1, Math.min(1, (ufo.position.x - d.x) / 2.2));
      let mood: Mood = (t + d.blink) % 3.4 < 0.13 ? 'blink' : 'idle';
      if (d === from && u > 0.1 && u < 1.35) mood = 'wow';
      if (d === to && u > 3.3 && u < LAND) mood = 'wow';
      if (d === to && u >= LAND) mood = 'happy';
      d.face.set(mood, look, -0.7);
      const h = d === to ? u - LAND : -1;
      const hop = h >= 0 && h < 0.45 ? Math.sin((Math.PI * h) / 0.45) : 0;
      const sq = h >= 0 && h < 0.7 ? Math.sin((2 * Math.PI * h) / 0.7) * 0.08 * (1 - h / 0.7) : 0;
      d.group.position.y = hop * 0.24;
      d.group.scale.set(1 - sq, 1 + sq, 1 - sq);
      d.group.rotation.z = d === from && u > 0.35 && u < 1.2 ? Math.sin(t * 40) * 0.02 : 0;
    }
    // the laptop flaps its lid when it's happy
    const lh = to === LAP ? u - LAND : -1;
    hinge.rotation.x = -0.22 - (lh >= 0 && lh < 0.6 ? Math.sin((Math.PI * lh) / 0.6) * 0.28 : 0);

    // sparkles burst out of the receiver
    const sk = (u - LAND) / 0.9;
    for (const { sp, m, a, r: rr } of sparks) {
      sp.visible = sk >= 0 && sk < 1;
      if (!sp.visible) continue;
      const out = 1 - Math.pow(1 - sk, 3);
      sp.position.set(p.toPort.x + Math.cos(a) * rr * out, p.toPort.y + 0.15 + Math.sin(a) * rr * 0.8 * out, p.toPort.z + 0.4);
      sp.scale.setScalar(0.3 * (1 - sk) + 0.05);
      m.opacity = 1 - sk;
      m.rotation = sk * 3;
    }

    // the pilot looks where it's going, and down while the beam is on
    pilot.rotation.z = p.tilt;
    pilot.rotation.y = p.dir * 0.7 * p.flying;
    pilot.rotation.x = p.on * 0.35;
    pilot.position.y = 0.2 + Math.sin(t * 5) * 0.008;
    starMat.uniforms.uTime.value = t;

    parallax.x += (parallax.tx - parallax.x) * 0.05;
    parallax.y += (parallax.ty - parallax.y) * 0.05;
    camera.position.copy(lookAt).addScaledVector(camDir, camera.userData.dist ?? 12);
    camera.position.x += parallax.x;
    camera.position.y -= parallax.y;
    camera.lookAt(lookAt);

    renderer.render(scene, camera);
  }

  // Compile every shader now (while idle), so the first real frame doesn't stutter.
  renderer.setSize(2, 2, false);
  renderer.compile(scene, camera);
  draw(0);

  const clock = new Clock(false);
  let raf = 0, visible = false;
  const frame = () => { raf = requestAnimationFrame(frame); draw(clock.getElapsedTime()); };

  // Only animate while attached, on screen, and the tab is visible.
  const run = () => { if (!raf && el && visible && !document.hidden) { if (!clock.running) clock.start(); frame(); } };
  const pause = () => { cancelAnimationFrame(raf); raf = 0; };
  const ro = new ResizeObserver(resize);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? run() : pause(); });
  const onVis = () => (document.hidden ? pause() : run());
  document.addEventListener('visibilitychange', onVis);

  return {
    attach(target) {
      if (el) this.detach();
      el = target;
      el.appendChild(canvas);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
      ro.observe(el); io.observe(el);
      resize();
      clock.start();                                    // restart from the pickup
      visible = true;
      frame();
      el.classList.add('scene-on');
    },
    detach() {
      pause();
      if (!el) return;
      ro.unobserve(el); io.unobserve(el);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.classList.remove('scene-on');
      canvas.remove();
      el = null;
    },
    dispose() {
      this.detach();
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      scene.traverse((o) => {
        const m = o as Mesh;   // (sprites have geometry/material too)
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose());
      });
      ramp.dispose(); blobTex.dispose(); glowTex.dispose(); sparkTex.dispose();
      faceTextures.forEach((x) => x.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
