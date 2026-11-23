// 3D version of a visitor avatar (see src/scripts/avatar.ts for the options).
// An original cartoon toy figure: big head, small body, expressive eyes.
// Faces +z; about 1.1 units tall. The right arm is a pivot so it can wave.

import { CapsuleGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, TorusGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OPTIONS, type Avatar } from '../scripts/avatar';
import type { Kit } from './kit';

export function makeAvatar(kit: Kit, a: Avatar) {
  const { toon } = kit;
  const skin = OPTIONS.skin[a.skin], hc = OPTIONS.hairColor[a.hairColor], shirt = OPTIONS.shirt[a.shirt];
  const g = new Group();

  // body: plain-colored top, dark bottoms; small, so the head reads big
  const pants = toon('#2b2a30');
  if (OPTIONS.body[a.body] === 'f') {
    const torso = new Mesh(new CapsuleGeometry(0.12, 0.1, 4, 12), toon(shirt)); torso.position.y = 0.49;
    const skirt = new Mesh(new CylinderGeometry(0.1, 0.18, 0.3, 20), pants); skirt.position.y = 0.2;
    const legs = new Mesh(new CapsuleGeometry(0.04, 0.06, 3, 8), pants); legs.position.y = 0.05; legs.scale.x = 2;
    g.add(torso, skirt, legs);
  } else {
    const torso = new Mesh(new CapsuleGeometry(0.15, 0.12, 4, 12), toon(shirt)); torso.position.y = 0.45;
    g.add(torso);
    for (const d of [-1, 1]) {
      const leg = new Mesh(new CapsuleGeometry(0.055, 0.14, 4, 8), pants); leg.position.set(d * 0.065, 0.13, 0); g.add(leg);
    }
  }

  // head
  const HY = 0.8, R = 0.18;
  const shape = OPTIONS.head[a.head];
  const head = shape === 'square'
    ? new Mesh(new RoundedBoxGeometry(0.33, 0.33, 0.31, 3, 0.1), toon(skin))
    : new Mesh(new SphereGeometry(R, 24, 16), toon(skin));
  if (shape === 'oval') head.scale.set(0.9, 1.12, 0.94);
  head.position.y = HY;
  g.add(head);
  const front = shape === 'square' ? 0.158 : R * (shape === 'oval' ? 0.88 : 0.94);

  // face: brows, eyes, a small smile (flat ink, no outline)
  const ink = new MeshBasicMaterial({ color: '#2b2838' }), white = new MeshBasicMaterial({ color: '#ffffff' });
  const eyeStyle = OPTIONS.eyes[a.eyes];
  for (const d of [-1, 1]) {
    const x = d * 0.058, y = HY + 0.015;
    if (eyeStyle === 'happy') {
      const arc = new Mesh(new TorusGeometry(0.024, 0.0065, 6, 14, Math.PI), ink);
      arc.position.set(x, y - 0.01, front); g.add(arc);
    } else if (eyeStyle === 'dots') {
      const e = new Mesh(new SphereGeometry(0.017, 10, 8), ink); e.scale.z = 0.5; e.position.set(x, y, front); g.add(e);
    } else {
      const e = new Mesh(new SphereGeometry(0.022, 12, 10), ink); e.scale.set(0.8, 1.3, 0.45); e.position.set(x, y, front); g.add(e);
      const shine = new Mesh(new SphereGeometry(0.007, 8, 6), white); shine.position.set(x + 0.006, y + 0.012, front + 0.01); g.add(shine);
    }
    const brow = new Mesh(new CapsuleGeometry(0.006, 0.03, 3, 6), ink);
    brow.rotation.z = Math.PI / 2 + d * 0.18; brow.position.set(x, y + 0.055, front - 0.004); g.add(brow);
  }
  const smile = new Mesh(new TorusGeometry(0.026, 0.0065, 6, 14, Math.PI), ink);
  smile.rotation.z = Math.PI; smile.position.set(0, HY - 0.05, front - 0.003); g.add(smile);

  // hair
  const style = OPTIONS.hair[a.hair];
  if (style !== 'none') {
    const top = shape === 'oval' ? 1.12 : 1;
    const capScale = shape === 'square' ? 1.08 : 1;
    const cap = new Mesh(new SphereGeometry(R * 1.08, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), toon(hc));
    cap.position.y = HY + (shape === 'square' ? 0.03 : 0.01); cap.scale.set(capScale, top, capScale);
    cap.rotation.x = -0.38;
    g.add(cap);
    const curl = (x: number, y: number, z: number, r: number) => {
      const c = new Mesh(new SphereGeometry(r, 12, 9), toon(hc)); c.position.set(x * capScale, HY + y * top, z * capScale); g.add(c);
    };
    if (style === 'wavy') {
      // a fluffy mop: curls across the crown, a few falling over the forehead, some over the ears
      for (const [x, y, z, r] of [
        [0, 0.17, -0.01, 0.085], [-0.09, 0.15, 0.03, 0.075], [0.09, 0.15, 0.02, 0.078], [-0.05, 0.16, -0.08, 0.075], [0.06, 0.15, -0.09, 0.075],
        [-0.15, 0.08, -0.02, 0.07], [0.15, 0.08, -0.03, 0.07], [0, 0.11, -0.14, 0.08], [-0.11, 0.06, -0.11, 0.065], [0.11, 0.06, -0.11, 0.065],
        [-0.165, 0.0, 0.01, 0.055], [0.165, 0.0, 0.0, 0.055],                       // over the ears
        [-0.07, 0.1, 0.12, 0.052], [0.015, 0.11, 0.135, 0.055], [0.085, 0.095, 0.115, 0.05], // fringe
      ] as const) curl(x, y, z, r);
    } else if (style === 'long') {
      const back = new Mesh(new RoundedBoxGeometry(0.36, 0.34, 0.09, 2, 0.04), toon(hc)); back.position.set(0, HY - 0.1, -0.12);
      g.add(back);
    } else if (style === 'bun') {
      curl(0, R + 0.035, -0.05, 0.075);
    }
  }

  // arms with round hands; the right one is a pivot so it can wave / be raised
  const arm = (side: number) => {
    const p = new Group(); p.position.set(side * (a.body === 1 ? 0.15 : 0.18), 0.56, 0);
    p.rotation.z = side * 0.18;                                    // hang slightly out from the body
    const sleeve = new Mesh(new CapsuleGeometry(0.045, 0.17, 4, 8), toon(shirt)); sleeve.position.y = -0.11;
    const hand = new Mesh(new SphereGeometry(0.05, 12, 9), toon(skin)); hand.position.y = -0.25;
    p.add(sleeve, hand); g.add(p);
    return p;
  };
  arm(-1);
  const right = arm(1);

  kit.outline(g);
  return { g, arm: right };
}
