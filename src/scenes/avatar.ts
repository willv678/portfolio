// 3D version of a visitor avatar (options in src/scripts/avatar.ts). An
// original cartoon toy figure: big head, small two-tone body, round hands.
//   makeHead(kit, a)   → just the head + hair + face, centered at its origin
//   makeAvatar(kit, a) → the whole figure, feet at the origin, facing +z
// Everything is primitives; each figure is a few dozen tiny meshes.

import {
  BoxGeometry, CapsuleGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial,
  SphereGeometry, TorusGeometry,
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
    ? new Mesh(new RoundedBoxGeometry(0.33, 0.33, 0.31, 3, 0.1), toon(skin))
    : new Mesh(new SphereGeometry(R, 24, 16), toon(skin));
  if (shape === 'oval') skull.scale.set(0.9, 1.12, 0.94);
  g.add(skull);
  const front = shape === 'square' ? 0.158 : R * (shape === 'oval' ? 0.88 : 0.94);
  const tall = shape === 'oval' ? 1.12 : 1, wide = shape === 'square' ? 1.08 : 1;

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
  const bs = OPTIONS.brows[a.brows];
  for (const d of [-1, 1]) {
    const b = new Mesh(new CapsuleGeometry(bs === 'thick' ? 0.011 : 0.006, 0.032, 3, 6), ink);
    b.rotation.z = Math.PI / 2 + (bs === 'straight' ? 0 : bs === 'thick' ? d * -0.28 : d * 0.18);
    at(b, d * 0.058, 0.07, front - 0.004);
  }
  const ms = OPTIONS.mouth[a.mouth];
  if (ms === 'smile') at(arc(0.026, false), 0, -0.05, front - 0.003);
  else if (ms === 'grin') {
    const m = new Mesh(new CircleGeometry(0.036, 16, Math.PI, Math.PI), ink); at(m, 0, -0.04, front + 0.002);
    const teeth = new Mesh(new BoxGeometry(0.05, 0.012, 0.002), white); at(teeth, 0, -0.046, front + 0.004);
  } else if (ms === 'open') { const m = new Mesh(new CircleGeometry(0.02, 16), ink); m.scale.y = 1.2; at(m, 0, -0.06, front + 0.002); }
  else { const m = new Mesh(new CapsuleGeometry(0.005, 0.03, 3, 6), ink); m.rotation.z = Math.PI / 2; at(m, 0, -0.058, front); }
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
  const style = OPTIONS.hair[a.hair];
  if (style === 'none') return g;
  const H = (geo: ConstructorParameters<typeof Mesh>[0], x: number, y: number, z: number) => {
    const m = new Mesh(geo, toon(hc)); m.position.set(x * wide, y * tall, z * wide); g.add(m); return m;
  };
  const cap = (scale = 1.08, tilt = -0.38) => {
    const m = H(new SphereGeometry(R * scale, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, shape === 'square' ? 0.03 : 0.01, 0);
    m.scale.set(wide, tall, wide); m.rotation.x = tilt; return m;
  };
  const curl = (x: number, y: number, z: number, r: number) => H(new SphereGeometry(r, 12, 9), x, y, z);

  switch (style) {
    case 'wavy':
      cap();
      for (const [x, y, z, r] of [
        [0, 0.17, -0.01, 0.085], [-0.09, 0.15, 0.03, 0.075], [0.09, 0.15, 0.02, 0.078], [-0.05, 0.16, -0.08, 0.075], [0.06, 0.15, -0.09, 0.075],
        [-0.15, 0.08, -0.02, 0.07], [0.15, 0.08, -0.03, 0.07], [0, 0.11, -0.14, 0.08], [-0.11, 0.06, -0.11, 0.065], [0.11, 0.06, -0.11, 0.065],
        [-0.165, 0.0, 0.01, 0.055], [0.165, 0.0, 0.0, 0.055],
        [-0.07, 0.1, 0.12, 0.052], [0.015, 0.11, 0.135, 0.055], [0.085, 0.095, 0.115, 0.05],
      ] as const) curl(x, y, z, r);
      break;
    case 'short': {
      cap(1.07, -0.3);
      const swoop = curl(-0.04, 0.13, 0.1, 0.09); swoop.scale.set(1.5, 0.6, 0.9); swoop.rotation.z = 0.25;
      break;
    }
    case 'long': {
      cap(1.09, -0.32);
      // a smooth curtain down the back, locks over the shoulders, side-swept bangs
      const back = H(new CapsuleGeometry(0.15, 0.22, 6, 16), 0, -0.14, -0.08); back.scale.set(1.25, 1, 0.55);
      for (const d of [-1, 1]) {
        const lock = H(new CapsuleGeometry(0.05, 0.26, 6, 12), d * 0.165, -0.13, 0.03); lock.rotation.z = d * 0.12;
        const tip = curl(d * 0.185, -0.3, 0.035, 0.05); tip.scale.y = 0.8;
      }
      const bang = curl(0.05, 0.12, 0.11, 0.09); bang.scale.set(1.6, 0.55, 0.8); bang.rotation.z = -0.35;
      break;
    }
    case 'bob': {
      const shell = H(new SphereGeometry(R * 1.16, 24, 16), 0, 0.0, -0.035); shell.scale.set(1.08, 0.98, 1);
      const fringe = curl(0, 0.115, 0.1, 0.1); fringe.scale.set(1.75, 0.5, 0.75);
      break;
    }
    case 'ponytail': {
      cap(1.07, -0.3);
      curl(0, 0.08, -0.17, 0.05);
      const tail = H(new CapsuleGeometry(0.055, 0.22, 6, 12), 0, -0.07, -0.22); tail.rotation.x = 0.35;
      break;
    }
    case 'curly':
      curl(0, 0.07, -0.04, R * 1.35);
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2;
        curl(Math.cos(t) * 0.2, 0.09 + Math.sin(t) * 0.16, -0.02 - Math.abs(Math.sin(t)) * 0.04, 0.07);
      }
      for (const x of [-0.08, 0, 0.08]) curl(x, 0.14, 0.11, 0.05);
      break;
    case 'spiky':
      cap(1.06, -0.3);
      for (const [x, z, lean] of [[-0.11, 0.02, 0.6], [-0.05, 0.06, 0.25], [0.02, 0.04, -0.05], [0.09, 0.02, -0.4], [0.13, -0.05, -0.75], [-0.13, -0.06, 0.8], [0, -0.07, 0], [-0.06, -0.12, 0.3], [0.07, -0.12, -0.3]] as const) {
        const s = H(new ConeGeometry(0.05, 0.14, 8), x, 0.19, z); s.rotation.set(-z * 3, 0, lean);
      }
      break;
    case 'bun':
      cap();
      curl(0, R + 0.035, -0.05, 0.075);
      break;
    case 'buzz': cap(1.03, -0.2); break;
  }
  return g;
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
