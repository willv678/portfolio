// 3D version of a visitor avatar (options in src/scripts/avatar.ts). An
// original cartoon toy figure: big head, small two-tone body, round hands.
//   makeHead(kit, a)   → just the head + hair + face, centered at its origin
//   makeAvatar(kit, a) → the whole figure, feet at the origin, facing +z
//   blink(head, t)     → call every frame so the eyes blink now and then
// Everything is primitives; each figure is a few dozen tiny meshes.

import {
  BoxGeometry, BufferGeometry, CapsuleGeometry, CircleGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh,
  MeshBasicMaterial, Shape, ShapeGeometry, SphereGeometry, TorusGeometry, Vector3, type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OPTIONS, heightScale, buildScale, type Avatar } from '../scripts/avatar';
import type { Kit } from './kit';

const R = 0.18;                                            // head radius
const D = Math.PI / 180, HALF = Math.PI / 2;
const Z = new Vector3(0, 0, 1);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
/** Triangle wave between 0 and 1 (for zigzag edges). */
const saw = (t: number) => 2 * Math.abs(t - Math.floor(t) - 0.5);
const smooth = (e0: number, e1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

export function makeHead(kit: Kit, a: Avatar) {
  const { toon } = kit;
  const skin = OPTIONS.skin[a.skin], hc = OPTIONS.hairColor[a.hairColor];
  const g = new Group();
  const shape = OPTIONS.head[a.head], square = shape === 'square';
  const skull = square
    ? new Mesh(new RoundedBoxGeometry(0.33, 0.33, 0.31, 4, 0.125), toon(skin))
    : new Mesh(new SphereGeometry(R, 32, 20), toon(skin));
  const ex = shape === 'oval' ? 0.9 : 1, ey = shape === 'oval' ? 1.12 : 1, ez = shape === 'oval' ? 0.94 : 1;
  skull.scale.set(ex, ey, ez);
  g.add(skull);
  // hair is sized to the head shape (a square head needs roomier hair, or its corners poke through)
  const tall = shape === 'oval' ? 1.12 : square ? 1.07 : 1, wide = square ? 1.11 : 1;

  // ears: small, low on the sides; most hair covers them
  for (const d of [-1, 1]) {
    const ear = new Mesh(new SphereGeometry(0.036, 12, 10), skull.material);
    ear.scale.set(0.5, 1, 0.75); ear.position.set(d * (square ? 0.158 : R * ex * 0.94), -0.015, -0.005); g.add(ear);
  }

  // ---------- face: flat ink, painted onto the surface of the head ----------
  const ink = new MeshBasicMaterial({ color: '#2b2838' }), white = new MeshBasicMaterial({ color: '#ffffff' });
  const n = new Vector3();
  /** Depth of the head's front surface at (x, y); leaves its normal in `n`. */
  const surf = (x: number, y: number) => {
    if (square) {
      const dx = Math.sign(x) * Math.max(0, Math.abs(x) - 0.04), dy = Math.sign(y) * Math.max(0, Math.abs(y) - 0.04);
      const dz = Math.sqrt(Math.max(1e-5, 0.125 * 0.125 - dx * dx - dy * dy));
      n.set(dx, dy, dz).normalize(); return 0.03 + dz;
    }
    const X = x / (R * ex), Y = y / (R * ey), z = R * ez * Math.sqrt(Math.max(0.02, 1 - X * X - Y * Y));
    n.set(X / ex, Y / ey, z / (R * ez * ez)).normalize(); return z;
  };
  /** Stick something onto the face at (x, y), lying flat against the head. */
  const put = <T extends Object3D>(o: T, x: number, y: number, lift = 0.003) => {
    const z = surf(x, y);
    o.position.set(x, y, z).addScaledVector(n, lift); o.quaternion.setFromUnitVectors(Z, n); g.add(o); return o;
  };
  const circle = new CircleGeometry(1, 28);
  const disc = (rx: number, ry: number, mat: MeshBasicMaterial, x = 0, y = 0, layer = 0) => {
    const m = new Mesh(circle, mat); m.scale.set(rx, ry, 1); m.position.set(x, y, layer * 0.0014); return m;
  };
  const arc = (r: number, up: boolean, tube = 0.0065) => { const m = new Mesh(new TorusGeometry(r, tube, 6, 16, Math.PI), ink); if (!up) m.rotation.z = Math.PI; return m; };
  const bar = (len: number, w: number, rz: number, x = 0, y = 0) => { const m = new Mesh(new CapsuleGeometry(w, len, 3, 6), ink); m.rotation.z = Math.PI / 2 + rz; m.position.set(x, y, 0); m.scale.z = 0.4; return m; };

  const lids: Group[] = [];                                // the open eyes, squashed shut by blink()
  const eye = (side: number, style: string) => {
    const e = new Group(), open = new Group(); e.add(open);
    let y = 0.015;
    if (style === 'happy') { e.add(arc(0.025, true)); y = 0.004; }
    else if (style === 'sleepy') { e.add(arc(0.025, false)); y = 0.03; }
    else {
      lids.push(open);
      if (style === 'dots') open.add(disc(0.0165, 0.0165, ink));
      else if (style === 'wide') {
        open.add(disc(0.029, 0.029, ink), disc(0.0235, 0.0235, white, 0, 0, 1), disc(0.0155, 0.0155, ink, 0.002, -0.002, 2), disc(0.005, 0.005, white, 0.007, 0.005, 3));
      } else if (style === 'chill') {
        // half-lidded: the lower half of an eye under a straight lid
        const half = new Mesh(new ShapeGeometry(new Shape().absarc(0, 0, 1, Math.PI, Math.PI * 2, false), 20), ink);
        half.scale.set(0.022, 0.03, 1); half.position.y = 0.008;
        open.add(half, disc(0.0055, 0.0055, white, 0.007, -0.004, 1));
        e.add(bar(0.05, 0.0055, 0, 0, 0.008));
      } else {                                             // big (also half of a wink, and under lashes)
        open.add(disc(0.02, 0.031, ink), disc(0.0078, 0.0078, white, 0.006, 0.012, 1));
        if (style === 'lashes') for (const [lx, ly, rz] of [[-0.021, 0.02, -0.7], [-0.011, 0.033, -1.15]] as const) e.add(bar(0.014, 0.0042, side * rz, side * -lx, ly));
      }
    }
    put(e, side * 0.058, y);
  };
  const es = OPTIONS.eyes[a.eyes];
  eye(-1, es === 'wink' ? 'big' : es);
  eye(1, es === 'wink' ? 'happy' : es);
  for (const d of [-1, 1]) { const b = new Group(); b.add(bar(0.03, 0.006, d * -0.2)); put(b, d * 0.058, es === 'wide' ? 0.08 : 0.073); }   // soft brows
  // a small button nose: no outline, so it only shows in profile and as a soft shade
  const nose = new Mesh(new SphereGeometry(0.016, 10, 8), skull.material); nose.userData.noOutline = true; nose.scale.z = 0.7;
  put(nose, 0, -0.014, -0.002);
  const mk = OPTIONS.makeup[a.makeup];
  const lips = mk === 'lipstick' || mk === 'both';
  const smile = new Mesh(new TorusGeometry(0.026, lips ? 0.0095 : 0.0065, 6, 16, Math.PI), lips ? new MeshBasicMaterial({ color: '#d6334d' }) : ink);
  const mouth = new Group(); smile.rotation.z = Math.PI; smile.scale.z = 0.5; mouth.add(smile); put(mouth, 0, -0.048, 0.002);
  if (mk === 'blush' || mk === 'both') {
    const pink = new MeshBasicMaterial({ color: '#ff8fa3', transparent: true, opacity: 0.55, depthWrite: false });
    for (const d of [-1, 1]) put(disc(0.027, 0.016, pink), d * 0.102, -0.03, 0.002);
  }
  const gl = OPTIONS.glasses[a.glasses];
  if (gl !== 'none') {
    const zf = surf(0.058, 0.015) + 0.016;
    for (const d of [-1, 1]) {
      let rim: Mesh;
      if (gl === 'round') rim = new Mesh(new TorusGeometry(0.041, 0.0058, 6, 24), ink);
      else {                                               // a rounded-square frame
        const w = 0.044, h = 0.036, c = 0.014, t = 0.01;
        const rr = (s: Shape | ReturnType<Shape['holes']['at']>, w: number, h: number, c: number) => {
          s!.moveTo(-w + c, -h); s!.lineTo(w - c, -h); s!.quadraticCurveTo(w, -h, w, -h + c); s!.lineTo(w, h - c); s!.quadraticCurveTo(w, h, w - c, h);
          s!.lineTo(-w + c, h); s!.quadraticCurveTo(-w, h, -w, h - c); s!.lineTo(-w, -h + c); s!.quadraticCurveTo(-w, -h, -w + c, -h);
        };
        const frame = new Shape(); rr(frame, w, h, c);
        const hole = new Shape(); rr(hole, w - t, h - t, c - t * 0.6); frame.holes.push(hole);
        rim = new Mesh(new ShapeGeometry(frame, 6), new MeshBasicMaterial({ color: '#2b2838', side: DoubleSide }));
      }
      rim.position.set(d * 0.058, 0.015, zf); g.add(rim);
    }
    const bridge = new Mesh(new BoxGeometry(0.034, 0.007, 0.006), ink); bridge.position.set(0, 0.022, zf); g.add(bridge);
  }
  g.userData.lids = lids;
  g.userData.blinkAt = (a.hair * 0.9 + a.eyes * 1.7 + a.skin * 0.4) % 3;   // so a crowd doesn't blink in unison

  // ---------- hair ----------
  // Every style is one shell wrapped over the head, like the hair on a toy
  // figure. It's described from the crown down: for each direction around the
  // head (phi: 0 = front, ±180° = back), `end` says how far down the hair
  // goes, as an angle from the top (90° = level with the middle of the head;
  // past that it hangs). The shell is meshed from the crown to exactly that
  // edge, so hairlines and hems are crisp, and the edge is given a thick lip
  // that turns in to the head. Lobes, spikes and a bun finish a style.
  const style = OPTIONS.hair[a.hair];
  const mat = toon(hc, { side: DoubleSide });
  interface Style {
    r: number;                                             // size, in head radii
    end(deg: number, ap: number): number;                  // where the hair ends, in degrees from the top (ap = |deg|)
    top?: number;                                          // extra height on the crown
    lift?: number;                                         // raise the whole shell
    bulge?(phi: number, a: number): number;                // lobes: extra radius at (phi, a), in radians
    hug?: number;                                          // 1: below the middle it follows the head in; 0: it hangs straight
    flare?: number; tuck?: number;                         // hanging hair spreads out / curls in at the ends
    spikes?: readonly (readonly [number, number, number, number, number])[];   // direction x, y, z, height, half-width (radians)
  }
  /** 0 across the face opening (|phi| < half), 1 round the sides and back. */
  const sides = (ap: number, half: number, w = 6) => smooth(half - w, half + w, ap);
  const shell = (st: Style) => {
    const C = 160, N = 46, pos: number[] = [], idx: number[] = [], p = new Vector3(), q = new Vector3();
    const spikes = (st.spikes ?? []).map(([x, y, z, h, w]) => ({ dir: new Vector3(x, y, z).normalize(), h, w }));
    const hug = st.hug ?? 0, flare = st.flare ?? 0, tuck = st.tuck ?? 0;
    const point = (phi: number, ang: number) => {
      const rad = st.r + (st.top ?? 0) * Math.pow(Math.max(0, Math.cos(ang)), 2) + (st.bulge?.(phi, ang) ?? 0);
      const h = Math.max(0, ang - HALF);
      const rho = ang <= HALF ? Math.sin(ang) : mix(1 + flare * h - tuck * h * h, Math.cos(h), hug);
      const y = ang <= HALF ? Math.cos(ang) : -mix(h, Math.sin(h), hug);
      p.set(Math.sin(phi) * rho * rad, y * rad + (st.lift ?? 0), Math.cos(phi) * rho * rad);
      for (const s of spikes) {
        const d = q.copy(p).normalize().angleTo(s.dir);
        if (d < s.w) p.addScaledVector(s.dir, s.h * Math.pow(1 - d / s.w, 1.25));
      }
    };
    const push = () => pos.push(p.x * R * wide, p.y * R * tall, p.z * R * wide);
    point(0, 0); push();
    for (let j = 1; j <= N + 1; j++) for (let i = 0; i < C; i++) {
      const phi = -Math.PI + (i / C) * Math.PI * 2, deg = phi / D;
      const end = st.end(deg, Math.abs(deg)) * D;
      point(phi, end * Math.min(1, j / N));
      if (j > N) {                                         // the lip: in to the head (or, for hanging hair, in under itself)
        if (end <= HALF + 0.05 || hug > 0.5) p.multiplyScalar(0.9 / p.length()); else { p.x *= 0.7; p.z *= 0.7; }
      }
      push();
    }
    for (let i = 0; i < C; i++) idx.push(0, 1 + i, 1 + (i + 1) % C);
    for (let j = 0; j < N; j++) for (let i = 0; i < C; i++) {
      const v00 = 1 + j * C + i, v01 = 1 + j * C + (i + 1) % C, v10 = v00 + C, v11 = v01 + C;
      idx.push(v00, v10, v11, v00, v11, v01);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new Mesh(geo, mat); g.add(m); return m;
  };
  /** Soft lobes in staggered rows, with creases between them: waves and curls. */
  const lobes = (amp: number, around: number, down: number, twist = 1.3) => (phi: number, ang: number) =>
    amp * smooth(0.25, 0.8, ang) * puff(around * phi + twist * Math.sin(down * ang)) * (0.45 + 0.55 * puff(down * 0.9 * ang + 0.4));
  /** |sin| with the crease rounded off a little, so it meshes cleanly. */
  const puff = (x: number) => Math.sqrt(Math.sin(x) ** 2 + 0.03) - 0.17;

  switch (style) {
    case 'wavy':
      // a short, full mop in loose waves: a scalloped fringe, down to the ears
      shell({ r: 1.08, top: 0.1, hug: 0.6, bulge: lobes(0.17, 2.5, 3.6, 0.8),
        end: (deg, ap) => mix(54 + 11 * Math.abs(Math.sin(deg * D * 2.5 + 0.5)), mix(92, 106, smooth(70, 130, ap)) + 7 * Math.abs(Math.sin(deg * D * 2.5)), sides(ap, 62)) });
      break;
    case 'shaggy':
      // full on top, a fringe swept to one side with a notch, notched sides down over the ears
      shell({ r: 1.1, top: 0.05,
        end: (deg, ap) => mix(66 - 13 * smooth(-45, 55, deg) + 6 * saw((deg + 12) / 36), 111 - 10 * saw(ap / 23), sides(ap, 60)) });
      break;
    case 'spiky':
      // short, with a zigzag fringe and a crown of points
      shell({ r: 1.06, hug: 1,
        end: (deg, ap) => mix(49 + 11 * saw(deg / 17 + 0.5), mix(84, 106, smooth(80, 140, ap)), sides(ap, 64)),
        spikes: [[0, 1, 0.3, 0.6, 0.42], [-0.55, 0.85, 0.3, 0.5, 0.4], [0.55, 0.85, 0.25, 0.5, 0.4], [-0.9, 0.55, -0.1, 0.42, 0.38], [0.9, 0.55, -0.15, 0.42, 0.38],
          [-0.4, 0.8, -0.55, 0.5, 0.4], [0.4, 0.8, -0.55, 0.5, 0.4], [0, 0.55, -0.85, 0.42, 0.4]] });
      break;
    case 'long':
      // side-swept bangs; to the jaw in front (so it frames the face without covering the chest), long down the back
      shell({ r: 1.09, top: 0.04, tuck: 0.04,
        end: (deg, ap) => mix(71 - 23 * smooth(-25, 55, deg), 90 + mix(0.78, 1.5, smooth(92, 128, ap)) / D, sides(ap, 57, 5)) });
      break;
    case 'curly':
      // long, full curls as one mass with a zigzag outline, spreading out as they fall
      shell({ r: 1.12, top: 0.05, flare: 0.2, bulge: lobes(0.15, 3, 3.8, 0.9),
        end: (deg, ap) => mix(65 - 18 * smooth(-50, 50, deg) + 6 * saw(deg / 16), 90 + (mix(0.78, 1.45, smooth(85, 125, ap)) + 0.17 * saw(deg / 18)) / D, sides(ap, 54, 5)) });
      break;
    case 'parted':
      // a center part: the hairline rises to a point over the middle of the
      // forehead, and the hair falls down both sides and behind, past the jaw,
      // ending in jagged points; a few points on the crown
      shell({ r: 1.08, top: 0.03,
        end: (deg, ap) => mix(28 + 0.8 * ap, 90 + (mix(1.0, 1.3, smooth(95, 130, ap)) - 0.3 * saw(deg / 26 + 0.5)) / D, sides(ap, 50, 5)),
        spikes: [[0, 1, 0.05, 0.42, 0.3], [-0.32, 0.95, 0.08, 0.3, 0.26], [0.32, 0.95, 0.08, 0.3, 0.26]] });
      break;
    case 'bob':
      // one blunt length to the jaw, turning in at the ends
      shell({ r: 1.12, top: 0.04, tuck: 0.24, end: (deg, ap) => mix(63, 90 + 0.8 / D, sides(ap, 58, 5)) });
      break;
    case 'bun': {
      // pulled back tight, with a top knot
      shell({ r: 1.05, hug: 1, end: (deg, ap) => mix(43, mix(86, 108, smooth(80, 140, ap)), sides(ap, 66, 10)) });
      const bun = new Mesh(new SphereGeometry(R * 0.46, 20, 14), mat); bun.scale.y = 0.9;
      bun.position.set(0, R * 1.02 * tall, -R * 0.62 * wide); g.add(bun);
      break;
    }
    case 'buzz':
      // a close crop with square temples
      shell({ r: 1.03, hug: 1, end: (deg, ap) => mix(47, mix(82, 104, smooth(80, 140, ap)), sides(ap, 66, 4)) });
      break;
    case 'afro':
      shell({ r: 1.36, lift: 0.16, hug: 1, bulge: lobes(0.09, 4, 5, 0.8), end: (deg, ap) => mix(66 + 4 * Math.abs(Math.sin(deg * D * 4.5)), 122, sides(ap, 40, 7)) });
      break;
  }
  return g;
}

/** Blink now and then. Call every frame with the scene time. */
export function blink(head: Object3D, t: number) {
  const u = (t + (head.userData.blinkAt ?? 0)) % 3.9;
  const k = u < 0.13 ? 1 - Math.sin((Math.PI * u) / 0.13) * 0.9 : 1;
  for (const l of (head.userData.lids ?? []) as Group[]) l.scale.y = k;
}

export function makeAvatar(kit: Kit, a: Avatar) {
  const { toon } = kit;
  const skin = OPTIONS.skin[a.skin], shirt = OPTIONS.shirt[a.shirt];
  const g = new Group();
  const body = new Group(); g.add(body);
  const pants = toon('#2b2a30');
  if (OPTIONS.body[a.body] === 'f') {
    const torso = new Mesh(new CapsuleGeometry(0.12, 0.1, 4, 12), toon(shirt)); torso.position.y = 0.49;
    const skirt = new Mesh(new CylinderGeometry(0.1, 0.18, 0.3, 20), pants); skirt.position.y = 0.2;
    const legs = new Mesh(new CapsuleGeometry(0.04, 0.06, 3, 8), pants); legs.position.y = 0.07; legs.scale.x = 2;
    body.add(torso, skirt, legs);
  } else {
    const torso = new Mesh(new CapsuleGeometry(0.15, 0.12, 4, 12), toon(shirt)); torso.position.y = 0.45;
    body.add(torso);
    for (const d of [-1, 1]) {
      const leg = new Mesh(new CapsuleGeometry(0.055, 0.14, 4, 8), pants); leg.position.set(d * 0.065, 0.13, 0); body.add(leg);
    }
  }
  // sneakers, toes forward, so you can tell which way it's facing
  const shoe = toon('#f1eee6');
  for (const d of [-1, 1]) {
    const s = new Mesh(new SphereGeometry(0.06, 12, 9), shoe); s.scale.set(1, 0.62, 1.4);
    s.position.set(d * (a.body === 1 ? 0.05 : 0.066), 0.036, 0.028); body.add(s);
  }
  // arms with round hands; both are shoulder pivots so scenes can pose them
  const arm = (side: number) => {
    const p = new Group(); p.position.set(side * (a.body === 1 ? 0.15 : 0.18), 0.56, 0);
    p.rotation.z = side * 0.18;
    const sleeve = new Mesh(new CapsuleGeometry(0.045, 0.17, 4, 8), toon(shirt)); sleeve.position.y = -0.11;
    const hand = new Mesh(new SphereGeometry(0.05, 12, 9), toon(skin)); hand.position.y = -0.25;
    p.add(sleeve, hand); body.add(p);
    return p;
  };
  const left = arm(-1), right = arm(1);
  // height stretches the body; build widens it; the head rides on top
  const h = heightScale(a), b = buildScale(a);
  body.scale.set(b, h, b);
  const head = makeHead(kit, a); head.position.y = 0.8 + (h - 1) * 0.62;
  g.add(head);
  kit.outline(g);
  return { g, arm: right, left, right, head, /** call every frame: blinks now and then */ blink: (t: number) => blink(head, t) };
}
