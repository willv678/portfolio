// Shared pieces for the 3D banner scenes (one file per project in this folder).
//
// createStage(setup) handles everything that isn't the story: the renderer,
// camera framing at any aspect ratio, mouse parallax, play/pause (only while
// attached, on screen and the tab is visible), sound gating, and cleanup.
// `setup` gets a Kit of shared building blocks (toon materials, island,
// stars, sparkles, blob shadows) and returns an update(t, prev) function that
// poses the scene for time t (seconds since attach). Everything is built from
// primitives: no model files.

import {
  BackSide, BufferGeometry, CanvasTexture, Group, SphereGeometry, type Object3D, Clock, CylinderGeometry, DataTexture,
  DirectionalLight, Float32BufferAttribute, HemisphereLight, MathUtils, Mesh, MeshBasicMaterial,
  MeshToonMaterial, NearestFilter, PerspectiveCamera, PlaneGeometry, Points, RedFormat, Scene,
  ShaderMaterial, Sprite, SpriteMaterial, Texture, Vector3, WebGLRenderer,
  type MeshToonMaterialParameters,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface SceneHandle {
  /** Start playing inside el, from the top of the loop. `sfx: 'hover'` only
   *  plays sounds while the pointer is over el (project pages); 'always' plays
   *  them whenever it's running (the home panel, where you've selected it). */
  attach(el: HTMLElement, opts?: { sfx?: 'always' | 'hover' }): void;
  detach(): void;                  // pause and remove the canvas; cheap to re-attach
  dispose(): void;                 // free everything
}

// ---------- tiny math helpers for timelines ----------
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0 before a, 1 after b, linear between. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeIn = (x: number) => x * x;
/** A bump: 0 → 1 → 0 over [a, b]. */
export const bump = (t: number, a: number, b: number) => Math.sin(Math.PI * seg(t, a, b));
/** True on the frame where a loop of length `period` passes time `at`. */
export const passed = (prev: number, t: number, at: number, period: number) =>
  t > prev && Math.floor((t - at) / period) > Math.floor((prev - at) / period);

export interface Kit {
  scene: Scene;
  toon(color: string, extra?: MeshToonMaterialParameters): MeshToonMaterial;
  blob(w: number, d: number): Mesh;
  island(opts: { top: string; side: string; rx?: number; rz?: number }): Mesh;
  stars(opts?: { count?: number; color?: [number, number, number] }): void;
  sparkles(count?: number): { burst(t: number, at: Vector3, colors?: string[]): void; update(t: number): void };
  glow(color: string): Sprite;
  /** Register a texture so it's freed on dispose. */
  own<T extends Texture>(tex: T): T;
  /** Play a sound only if this scene is allowed to make noise right now. */
  sfx(play: () => void): void;
  /** The element the scene is currently playing in (for HTML overlays), if any. */
  host(): HTMLElement | null;
  /** Add cel outlines to something built after setup (setup's own meshes get them automatically). */
  outline(root: Object3D): void;
}

interface StageOpts {
  lookAt?: Vector3;           // what the camera aims at
  minSpan?: number;           // world units of width always visible
  minHeight?: number;         // world units of height always visible
  sky?: number; ground?: number;   // hemisphere light colors
  outline?: number;           // cel outline thickness in world units (0 = none)
}

export function createStage(
  setup: (kit: Kit) => (t: number, prev: number) => void,
  opts: StageOpts = {},
): SceneHandle | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;                                        // no WebGL: the SVG banner stays
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const canvas = renderer.domElement;
  canvas.className = 'scene-canvas';

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.1, 100);
  const lookAt = opts.lookAt ?? new Vector3(0, 1.3, 0);
  const camDir = new Vector3(0, 0.3, 1).normalize();
  const textures: Texture[] = [];
  const own = <T extends Texture>(t: T) => (textures.push(t), t);

  // Toon shading: three flat tones, like a 3DS menu render.
  const ramp = own(new DataTexture(new Uint8Array([100, 178, 255]), 3, 1, RedFormat));
  ramp.minFilter = ramp.magFilter = NearestFilter;
  ramp.needsUpdate = true;
  const toon = (color: string, extra: MeshToonMaterialParameters = {}) =>
    new MeshToonMaterial({ color, gradientMap: ramp, ...extra });

  scene.add(new HemisphereLight(0xffffff, opts.ground ?? 0x5b48c9, 1.6));
  const sun = new DirectionalLight(0xffffff, 2.4);
  sun.position.set(3, 6, 5);
  scene.add(sun);

  const radial = (stops: [number, string][]) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    stops.forEach(([o, col]) => r.addColorStop(o, col));
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return own(new CanvasTexture(c));
  };

  // Soft round "blob" shadows instead of shadow maps: cheap and toy-like.
  const blobTex = radial([[0, 'rgba(10,6,30,.55)'], [1, 'rgba(10,6,30,0)']]);
  const blob = (w: number, d: number) => {
    const m = new Mesh(new PlaneGeometry(w, d), new MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.004;
    return m;
  };

  const glow = (color: string) => new Sprite(new SpriteMaterial({
    map: radial([[0, 'rgba(255,255,255,.9)'], [0.4, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]),
    color, depthWrite: false, transparent: true, opacity: 0.55,
  }));

  // A floating island (a squashed, slightly tapered puck) to stage things on.
  const island = ({ top, side, rx = 3.55, rz = 0.5 }: { top: string; side: string; rx?: number; rz?: number }) => {
    const m = new Mesh(new CylinderGeometry(rx, rx - 0.3, 0.34, 72), [toon(side), toon(top), toon(side)]);
    m.scale.z = rz;
    m.position.y = -0.17;
    scene.add(m);
    return m;
  };

  // Twinkling stars on a far backdrop.
  const starMats: ShaderMaterial[] = [];
  function stars({ count = 70, color = [1, 0.97, 0.9] as [number, number, number] } = {}) {
    const geo = new BufferGeometry(), sp: number[] = [], ph: number[] = [];
    for (let i = 0; i < count; i++) {
      sp.push((Math.random() - 0.5) * 18, 0.4 + Math.random() * 5.5, -4.5 - Math.random() * 3);
      ph.push(Math.random() * 6.283);
    }
    geo.setAttribute('position', new Float32BufferAttribute(sp, 3));
    geo.setAttribute('phase', new Float32BufferAttribute(ph, 1));
    const mat = new ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uPR: { value: Math.min(devicePixelRatio, 2) } },
      vertexShader: `attribute float phase; uniform float uTime, uPR; varying float vA;
        void main(){ vA = .25 + .75 * (.5 + .5 * sin(uTime * 1.6 + phase * 3.));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
          gl_PointSize = (1.6 + 2.2 * fract(phase)) * uPR; }`,
      fragmentShader: `varying float vA;
        void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard;
          gl_FragColor = vec4(${color.map((x) => x.toFixed(3)).join(',')}, vA * smoothstep(.5, .1, d)); }`,
    });
    starMats.push(mat);
    scene.add(new Points(geo, mat));
  }

  // ✦ sparkle bursts.
  const sparkTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(32, 2);
    g.quadraticCurveTo(36, 28, 62, 32); g.quadraticCurveTo(36, 36, 32, 62);
    g.quadraticCurveTo(28, 36, 2, 32); g.quadraticCurveTo(28, 28, 32, 2); g.fill();
    return own(new CanvasTexture(c));
  })();
  function sparkles(count = 6) {
    const parts = Array.from({ length: count }, (_, i) => {
      const m = new SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false });
      const sp = new Sprite(m); sp.visible = false; scene.add(sp);
      return { sp, m, a: (i / count) * Math.PI * 2 + 0.3, r: 0.5 + (i % 2) * 0.15 };
    });
    let t0 = -99; const at = new Vector3();
    return {
      burst(t: number, where: Vector3, colors = ['#f5b70a', '#ffd34d', '#8f7dff']) {
        t0 = t; at.copy(where);
        parts.forEach((p, i) => p.m.color.set(colors[i % colors.length]));
      },
      update(t: number) {
        const k = (t - t0) / 0.9;
        for (const { sp, m, a, r } of parts) {
          sp.visible = k >= 0 && k < 1;
          if (!sp.visible) continue;
          const out = 1 - Math.pow(1 - k, 3);
          sp.position.set(at.x + Math.cos(a) * r * out, at.y + 0.15 + Math.sin(a) * r * 0.8 * out, at.z + 0.4);
          sp.scale.setScalar(0.2 * (1 - k) + 0.04);
          m.opacity = 1 - k;
          m.rotation = k * 3;
        }
      },
    };
  }

  // Sound gating: 'always' while attached (home panel), or only while hovered.
  let sfxMode: 'always' | 'hover' = 'hover', hovering = false;
  const sfx = (play: () => void) => { if (sfxMode === 'always' || hovering) play(); };

  let el: HTMLElement | null = null;
  // Cel outlines, the classic Nintendo trick: every toon-shaded mesh gets a
  // slightly inflated, back-face-only, dark copy of itself, which shows up as
  // a thin ink line around the silhouette. Lights, screens and other flat
  // (MeshBasic) bits are left alone.
  const width = opts.outline ?? 0.015;
  const ink = new MeshBasicMaterial({ color: '#2b2838', side: BackSide });
  ink.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${width.toFixed(4)};`);
  };
  ink.customProgramCacheKey = () => `outline-${width}`;
  const outline = (root: Object3D) => {
    if (width <= 0) return;
    const targets: Mesh[] = [];
    root.traverse((o: Object3D) => {
      const m = o as Mesh;
      if (m.isMesh && m.material instanceof MeshToonMaterial && !m.material.transparent && !m.userData.noOutline && !m.userData.outlined) targets.push(m);
    });
    for (const m of targets) { const o = new Mesh(m.geometry, ink); o.userData.noOutline = true; m.userData.outlined = true; m.add(o); }
  };
  const update = setup({ scene, toon, blob, island, stars, sparkles, glow, own, sfx, host: () => el, outline });
  outline(scene);


  // ---------- framing, parallax, loop ----------
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e: PointerEvent) => {
    const r = el!.getBoundingClientRect();
    parallax.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.8;
    parallax.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.4;
    hovering = true;
  };
  const onLeave = () => { parallax.tx = parallax.ty = 0; hovering = false; };

  function resize() {
    const w = el?.clientWidth ?? 0, h = el?.clientHeight ?? 0;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const span = Math.max(opts.minSpan ?? 7.8, (opts.minHeight ?? 4.5) * camera.aspect);
    camera.userData.dist = span / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    camera.updateProjectionMatrix();
  }

  let prev = 0;
  function draw(t: number) {
    update(t, prev);
    prev = t;
    starMats.forEach((m) => (m.uniforms.uTime.value = t));
    parallax.x += (parallax.tx - parallax.x) * 0.05;
    parallax.y += (parallax.ty - parallax.y) * 0.05;
    camera.position.copy(lookAt).addScaledVector(camDir, camera.userData.dist ?? 12);
    camera.position.x += parallax.x;
    camera.position.y -= parallax.y;
    camera.lookAt(lookAt);
    renderer.render(scene, camera);
  }

  // Compile every shader now (while idle), so the first real frame doesn't stutter.
  const muted = sfxMode; sfxMode = 'hover';
  renderer.setSize(2, 2, false);
  renderer.compile(scene, camera);
  draw(0); prev = 0;
  sfxMode = muted;

  const clock = new Clock(false);
  let raf = 0, visible = false;
  const frame = () => { raf = requestAnimationFrame(frame); draw(clock.getElapsedTime()); };
  const run = () => { if (!raf && el && visible && !document.hidden) { if (!clock.running) clock.start(); frame(); } };
  const pause = () => { cancelAnimationFrame(raf); raf = 0; };
  const ro = new ResizeObserver(resize);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? run() : pause(); });
  const onVis = () => (document.hidden ? pause() : run());
  document.addEventListener('visibilitychange', onVis);

  return {
    attach(target, o = {}) {
      if (el) this.detach();
      el = target;
      sfxMode = o.sfx ?? 'hover';
      hovering = el.matches(':hover');
      el.appendChild(canvas);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
      ro.observe(el); io.observe(el);
      resize();
      clock.start(); prev = 0;                          // restart from the top of the loop
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
      el = null; hovering = false;
    },
    dispose() {
      this.detach();
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      scene.traverse((o) => {
        const m = o as Mesh;   // sprites and points have geometry/material too
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose());
      });
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

/** The little toy car used across scenes (faces +x). */
export function toyCar(kit: Kit, color = '#ff8a3d') {
  const { toon } = kit;
  const car = new Group(), body = new Group(); car.add(body);
  const hull = new Mesh(new RoundedBoxGeometry(0.56, 0.16, 0.32, 3, 0.06), toon(color)); hull.position.y = 0.15;
  const cabin = new Mesh(new RoundedBoxGeometry(0.3, 0.15, 0.28, 3, 0.06), toon('#bfe6ff')); cabin.position.set(-0.03, 0.29, 0);
  const roof = new Mesh(new RoundedBoxGeometry(0.31, 0.04, 0.29, 2, 0.02), toon('#ffffff')); roof.position.set(-0.03, 0.37, 0);
  body.add(hull, cabin, roof);
  for (const z of [-0.1, 0.1]) {
    const h = new Mesh(new SphereGeometry(0.026, 10, 8), new MeshBasicMaterial({ color: '#fff1a8' })); h.position.set(0.28, 0.17, z); body.add(h);
  }
  const wheelGeo = new CylinderGeometry(0.075, 0.075, 0.06, 16); wheelGeo.rotateX(Math.PI / 2);
  const wheels = [[0.18, 0.165], [0.18, -0.165], [-0.18, 0.165], [-0.18, -0.165]].map(([x, z]) => {
    const w = new Mesh(wheelGeo, toon('#25252b')); w.position.set(x, 0.075, z); car.add(w); return w;
  });
  return { car, body, wheels };
}
