// WarpPoint banner scene: a toy Switch and a laptop, and the UFO carrying a
// glowing save file from one to the other, then back. It's the product in one
// loop: your save is already on the other device.
//
// create() builds the scene once (no drawing yet); attach(el) plays it inside
// `el`, detach() pauses it and takes the canvas out. Building once and reusing
// is what makes the home panel instant. Everything is built from primitives
// (no model files), flat "toon" shading, ~10s loop.

import {
  AdditiveBlending, CanvasTexture, Sprite, SpriteMaterial, Clock, Color, CylinderGeometry, DataTexture, DirectionalLight, DoubleSide, Group, HemisphereLight, MathUtils, Mesh, MeshBasicMaterial, MeshToonMaterial, NearestFilter, PerspectiveCamera, PlaneGeometry, RedFormat, Scene, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3, WebGLRenderer,
  type MeshToonMaterialParameters,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const C = {
  ink: '#2a2733', switchBody: '#34323b', joyL: '#2fc2ee', joyR: '#ff5d5d',
  laptop: '#dcdde3', keys: '#3a3a42', screen: '#9fdcff', screenOff: '#1d1b26',
  saucer: '#efeaff', rim: '#7b6cf6', dome: '#c9f0ff', light: '#ffd66b', save: '#ffe68a', beam: '#cfc6ff', floppy: '#6a5cf0',
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

  // ---------- the Switch (left) ----------
  const sw = new Group();
  const swTilt = new Group();                     // leaning back on its kickstand
  swTilt.rotation.x = -0.28;
  swTilt.position.y = 0.5;
  sw.add(swTilt);
  swTilt.add(new Mesh(new RoundedBoxGeometry(1.5, 0.88, 0.12, 4, 0.04), toon(C.switchBody)));
  const swScreenMat = new MeshBasicMaterial({ color: C.screen });
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
  sw.add(blob(2.6, 1.2));
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
  const lapScreenMat = new MeshBasicMaterial({ color: C.screen });
  const lapScreen = new Mesh(new PlaneGeometry(1.7, 1.02), lapScreenMat);
  lapScreen.position.set(0, 0.62, 0.027);
  hinge.add(lapScreen);
  lap.add(blob(2.8, 2));
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
    new SphereGeometry(0.33, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    toon(C.dome, { transparent: true, opacity: 0.92 }),
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

  // ---------- the loop ----------
  // One leg = pick up at A, fly, drop at B. Two legs = A→B→A.
  const LEG = 5.4, CRUISE = 2.35;
  const hoverOver = (p: Vector3) => new Vector3(p.x * 0.97, CRUISE, p.z + 0.25);

  function pose(t: number) {
    const k = Math.floor(t / LEG) % 2, u = t % LEG;
    const [fromPort, toPort, toScreen] = k === 0 ? [swPort, lapPort, lapScreenMat] : [lapPort, swPort, swScreenMat];
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
    const flash = Math.max(0, 1 - Math.abs(u - 4.45) / 0.35);   // target screen blinks on arrival
    return { pos, tilt: -dir * speed * 0.28, on, s, scale, toScreen, flash };
  }

  const screenBase = new Color(C.screen), white = new Color('#ffffff');
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

    swScreenMat.color.copy(screenBase);
    lapScreenMat.color.copy(screenBase);
    p.toScreen.color.copy(screenBase).lerp(white, p.flash);

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
      ramp.dispose(); blobTex.dispose(); glowTex.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
