// 3D version of a visitor avatar (options in src/scripts/avatar.ts). An
// original cartoon toy figure: big head, small two-tone body, round hands.
//   makeHead(kit, a)   → just the head + hair + face, centered at its origin
//   makeAvatar(kit, a) → the whole figure, feet at the origin, facing +z
// Everything is primitives; each figure is a few dozen tiny meshes.

import {
  BoxGeometry, BufferGeometry, CapsuleGeometry, CircleGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial,
  SphereGeometry, TorusGeometry, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OPTIONS, heightScale, buildScale, type Avatar } from '../scripts/avatar';
import type { Kit } from './kit';

const R = 0.18;                                            // head radius

export function makeHead(kit: Kit, a: Avatar) {
  const { toon } = kit;
  const skin = OPTIONS.skin[a.skin], hc = OPTIONS.hairColor[a.hairColor];
  const g = new Group();
  const shape = OPTIONS.head[a.head];
  const skull = shape === 'square'
    ? new Mesh(new RoundedBoxGeometry(0.33, 0.33, 0.31, 4, 0.125), toon(skin))
    : new Mesh(new SphereGeometry(R, 24, 16), toon(skin));
  if (shape === 'oval') skull.scale.set(0.9, 1.12, 0.94);
  g.add(skull);
  const front = shape === 'square' ? 0.158 : R * (shape === 'oval' ? 0.88 : 0.94);
  // hair is sized to the head shape (a square head needs a roomier hair ball, or its corners poke through)
  const tall = shape === 'oval' ? 1.12 : shape === 'square' ? 1.07 : 1, wide = shape === 'square' ? 1.11 : 1;

  // ---------- face (flat ink, no outline) ----------
  const ink = new MeshBasicMaterial({ color: '#2b2838' }), white = new MeshBasicMaterial({ color: '#ffffff' });
  const at = (m: Mesh, x: number, y: number, z = front) => (m.position.set(x, y, z), g.add(m), m);
  const arc = (r: number, up: boolean) => { const m = new Mesh(new TorusGeometry(r, 0.0065, 6, 14, Math.PI), ink); if (!up) m.rotation.z = Math.PI; return m; };
  const eye = (x: number, style: string) => {
    if (style === 'happy') at(arc(0.024, true), x, 0.005);
    else if (style === 'sleepy') at(arc(0.024, false), x, 0.03);
    else if (style === 'dots') { const e = new Mesh(new SphereGeometry(0.017, 10, 8), ink); e.scale.z = 0.5; at(e, x, 0.015); }
    else {
      const e = new Mesh(new SphereGeometry(0.022, 12, 10), ink); e.scale.set(0.8, 1.3, 0.45); at(e, x, 0.015);
      at(new Mesh(new SphereGeometry(0.007, 8, 6), white), x + 0.006, 0.027, front + 0.01);
    }
  };
  const es = OPTIONS.eyes[a.eyes];
  eye(-0.058, es === 'wink' ? 'big' : es);
  eye(0.058, es === 'wink' ? 'happy' : es);
  for (const d of [-1, 1]) {                               // soft brows
    const b = new Mesh(new CapsuleGeometry(0.006, 0.032, 3, 6), ink);
    b.rotation.z = Math.PI / 2 + d * 0.18; at(b, d * 0.058, 0.07, front - 0.004);
  }
  const mk = OPTIONS.makeup[a.makeup];
  const lips = mk === 'lipstick' || mk === 'both';
  const smile = new Mesh(new TorusGeometry(0.026, lips ? 0.0095 : 0.0065, 6, 14, Math.PI), lips ? new MeshBasicMaterial({ color: '#d6334d' }) : ink);
  smile.rotation.z = Math.PI; at(smile, 0, -0.05, front - 0.003);
  if (mk === 'blush' || mk === 'both') {
    const pink = new MeshBasicMaterial({ color: '#ff8fa3', transparent: true, opacity: 0.6, depthWrite: false });
    for (const d of [-1, 1]) { const c = new Mesh(new CircleGeometry(0.026, 16), pink); c.scale.y = 0.55; c.rotation.y = d * 0.45; at(c, d * 0.1, -0.03, front - 0.02); }
  }
  const gl = OPTIONS.glasses[a.glasses];
  if (gl !== 'none') {
    for (const d of [-1, 1]) {
      const rim = new Mesh(new TorusGeometry(0.04, 0.006, 6, gl === 'round' ? 20 : 4), ink);
      if (gl === 'square') rim.rotation.z = Math.PI / 4;
      at(rim, d * 0.058, 0.015, front + 0.012);
    }
    const bridge = new Mesh(new BoxGeometry(0.03, 0.006, 0.006), ink); at(bridge, 0, 0.02, front + 0.012);
  }

  // ---------- hair ----------
  // Every style starts as one smooth ball of hair around the head; the face is
  // carved out of it along a hairline curve, and the bottom is trimmed to the
  // style's length. That gives clean, organic outlines (a scalloped fringe, a
  // side part, a blunt bob) instead of caps with seams. A gentle ripple adds
  // texture; a few extra pieces (volume, locks, a tail) finish each style.
  const style = OPTIONS.hair[a.hair];
  const mat = toon(hc, { side: DoubleSide });
  const add = (geo: BufferGeometry, x = 0, y = 0, z = 0) => {
    const m = new Mesh(geo, mat); m.position.set(x * wide, y * tall, z * wide); m.scale.set(wide, tall, wide); g.add(m); return m;
  };
  /** Hair ball of radius r, with the face carved out below `line(x)` and everything below `bottom(x, z)` trimmed (unit-sphere coords). */
  const hair = (r: number, line: (x: number) => number, bottom: (x: number, z: number) => number, opts: { faceW?: number; rip?: number; freq?: number; flare?: number; lift?: number } = {}) => {
    const { faceW = 0.74, rip = 0.03, freq = 24, flare = 0, lift = 0 } = opts;
    const geo = new SphereGeometry(r, 96, 72), pos = geo.attributes.position, v = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).divideScalar(r);
      // how far inside the face opening / below the trim line this vertex is (smooth, so edges don't stair-step)
      const inFace = Math.min(line(v.x) - v.y, faceW - Math.abs(v.x), (v.z - 0.1) * 1.5);
      const below = bottom(v.x, v.z) - v.y;
      const k = Math.max(smooth(-0.025, 0.06, inFace), smooth(-0.025, 0.06, below));
      v.multiplyScalar(1 - 0.4 * k);                             // tuck it well inside the head, out of sight
      if (flare && v.y < 0 && k < 0.5) { const f = 1 + flare * -v.y; v.x *= f; v.z *= 1 + (f - 1) * 0.6; }
      pos.setXYZ(i, v.x * r, v.y * r + lift, v.z * r);
    }
    pos.needsUpdate = true;
    ripple(geo, rip, freq);
    return add(geo);
  };
  /** A soft lump of hair (fringe curls, volume, tufts), squashed and turned. */
  const lump = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rz = 0, rx = 0) => {
    const geo = new SphereGeometry(1, 20, 14); ripple(geo, 0.06, 5);
    const m = add(geo, x, y, z); m.scale.set(sx * wide, sy * tall, sz * wide); m.rotation.set(rx, 0, rz); return m;
  };
  const r = R * 1.1;

  switch (style) {
    case 'wavy': {
      // The original wavy style: a smooth cap with clusters of round curls on
      // the crown, over the forehead and down the sides.
      const capGeo = new SphereGeometry(R * 1.08, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const capM = add(capGeo, 0, shape === 'square' ? 0.03 : 0.01, 0); capM.rotation.x = -0.38;
      for (const [x, y, z, rad] of [
        [0, 0.17, -0.01, 0.085], [-0.09, 0.15, 0.03, 0.075], [0.09, 0.15, 0.02, 0.078], [-0.05, 0.16, -0.08, 0.075], [0.06, 0.15, -0.09, 0.075],
        [-0.15, 0.08, -0.02, 0.07], [0.15, 0.08, -0.03, 0.07], [0, 0.11, -0.14, 0.08], [-0.11, 0.06, -0.11, 0.065], [0.11, 0.06, -0.11, 0.065],
        [-0.165, 0.0, 0.01, 0.055], [0.165, 0.0, 0.0, 0.055],
        [-0.07, 0.1, 0.12, 0.052], [0.015, 0.11, 0.135, 0.055], [0.085, 0.095, 0.115, 0.05],
      ] as const) add(new SphereGeometry(rad, 12, 9), x, y, z);
      break;
    }
    case 'short':
      // tidy, above the ears, with a side part sweeping across the forehead
      hair(r * 0.98, (x) => 0.5 + 0.18 * x, (x, z) => 0.02 - 0.46 * smooth(0.1, -0.5, z), { rip: 0.015, freq: 30, faceW: 0.82 });
      lump(-0.035, 0.12, 0.095, 0.12, 0.045, 0.07, 0.3, -0.3);
      break;
    case 'buzz':
      hair(r * 0.94, () => 0.56, (x, z) => 0.08 - 0.42 * smooth(0.1, -0.5, z), { rip: 0.006, freq: 40, faceW: 0.85 });
      break;
    case 'long': {
      // side-swept bangs; hair falls past the jaw, then a curtain behind and soft locks over the shoulders
      hair(r * 1.04, (x) => 0.3 + 0.32 * Math.max(0, x + 0.15), () => -0.92, { rip: 0.012, freq: 18, faceW: 0.66, flare: 0.12 });
      const back = new CapsuleGeometry(0.16, 0.16, 8, 24); ripple(back, 0.02, 12);
      const bm = add(back, 0, -0.2, -0.085); bm.scale.set(1.25 * wide, tall, 0.5 * wide);
      for (const d of [-1, 1]) {
        const lock = new CapsuleGeometry(0.06, 0.16, 8, 16); ripple(lock, 0.02, 12);
        const lm = add(lock, d * 0.16, -0.24, 0.02); lm.scale.set(wide, tall, 0.65 * wide); lm.rotation.z = d * 0.08;
      }
      break;
    }
    case 'curly': {
      // long, full curls: one bouncy mass (a strong ripple gives the curl
      // texture) that frames the face with a side part and widens as it falls
      // past the shoulders, with round curls along its outline and hem
      hair(r * 1.12, (x) => 0.3 + 0.28 * Math.max(0, x + 0.1), () => -0.6, { rip: 0.05, freq: 11, faceW: 0.62, flare: 0.3 });
      const back = new CapsuleGeometry(0.19, 0.2, 10, 28); ripple(back, 0.07, 10);
      const bm = add(back, 0, -0.2, -0.07); bm.scale.set(1.3 * wide, tall, 0.62 * wide);
      for (const d of [-1, 1]) {
        // curls cascading down each side, getting fuller toward the ends
        for (const [x, y, z, sz] of [[0.2, 0.0, 0.02, 0.07], [0.22, -0.11, 0.02, 0.076], [0.23, -0.22, 0.0, 0.082], [0.21, -0.32, -0.02, 0.08], [0.15, -0.38, 0.0, 0.07]] as const)
          lump(d * x, y, z, sz, sz, sz * 0.85, d * 0.3);
      }
      // the hem behind, and a couple of curls over the crown
      for (const [x, y, z, sz] of [[-0.12, -0.4, -0.1, 0.075], [0, -0.42, -0.12, 0.08], [0.12, -0.4, -0.1, 0.075], [-0.07, 0.17, 0.07, 0.06], [0.06, 0.18, 0.05, 0.055]] as const)
        lump(x, y, z, sz, sz, sz * 0.85);
      // rings of curls sitting right on the crown's outline, all the way round,
      // so from any angle the top reads as curls (not a smooth dome with an
      // outline showing between them); the front of each ring stays open for the face
      const R2 = r * 1.12;
      for (const [y, step, open, sz] of [[0.06, 36, 75, 0.058], [0.13, 40, 58, 0.056], [0.19, 60, 0, 0.052]] as const) {
        const ring = Math.sqrt(R2 * R2 - y * y) * 0.98;
        for (let a = -180 + step / 2; a < 180; a += step) {
          if (Math.abs(a) < open) continue;
          const t = (a * Math.PI) / 180;
          lump(Math.sin(t) * ring, y, Math.cos(t) * ring, sz, sz, sz * 0.85, t * 0.3);
        }
      }
      lump(0, 0.23, -0.02, 0.055, 0.045, 0.055);
      break;
    }
    case 'ponytail': {
      // pulled back from a high hairline, a band, and a tail curving down behind
      hair(r * 0.99, (x) => 0.52 - 0.06 * Math.cos(x * 4), (x, z) => -0.1 - 0.4 * smooth(0, -0.5, z), { rip: 0.012, freq: 22, faceW: 0.8 });
      const band = new Mesh(new TorusGeometry(0.035, 0.012, 8, 16), toon('#e2463c')); band.position.set(0, 0.06, -0.19); band.rotation.x = 0.5; g.add(band);
      for (const [y, z, rad, len, rx] of [[-0.02, -0.24, 0.052, 0.1, 0.7], [-0.15, -0.28, 0.047, 0.12, 0.2], [-0.27, -0.27, 0.035, 0.06, -0.2]] as const) {
        const geo = new CapsuleGeometry(rad, len, 8, 16); ripple(geo, 0.02, 14);
        const m = add(geo, 0, y, z); m.rotation.x = rx;
      }
      break;
    }
  }
  return g;
}

const smooth = (e0: number, e1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/** Push vertices out a little in a smooth pattern, for a hand-made hair texture. */
function ripple(geo: BufferGeometry, amp: number, freq: number) {
  const p = geo.attributes.position, v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * freq + 1.3) * Math.cos(v.y * freq * 1.2) + Math.sin(v.z * freq * 0.9 + v.y * freq * 0.7);
    v.multiplyScalar(1 + amp * 0.5 * n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
}
/** Widen the lower part of a shell (for a bob that flares at the ends). */
function flare(geo: BufferGeometry, amount: number) {
  const p = geo.attributes.position, v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = Math.max(0, -v.y / R) * amount;
    p.setXYZ(i, v.x * (1 + k), v.y, v.z * (1 + k * 0.6));
  }
  p.needsUpdate = true;
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
    const legs = new Mesh(new CapsuleGeometry(0.04, 0.06, 3, 8), pants); legs.position.y = 0.05; legs.scale.x = 2;
    body.add(torso, skirt, legs);
  } else {
    const torso = new Mesh(new CapsuleGeometry(0.15, 0.12, 4, 12), toon(shirt)); torso.position.y = 0.45;
    body.add(torso);
    for (const d of [-1, 1]) {
      const leg = new Mesh(new CapsuleGeometry(0.055, 0.14, 4, 8), pants); leg.position.set(d * 0.065, 0.13, 0); body.add(leg);
    }
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
  return { g, arm: right, left, right, head };
}
