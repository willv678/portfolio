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

  // body: small, so the head reads big
  if (OPTIONS.body[a.body] === 'f') {
    const torso = new Mesh(new CapsuleGeometry(0.12, 0.08, 4, 12), toon(shirt)); torso.position.y = 0.48;
    const skirt = new Mesh(new CylinderGeometry(0.1, 0.19, 0.34, 20), toon(shirt)); skirt.position.y = 0.2;
    g.add(torso, skirt);
  } else {
    const body = new Mesh(new CapsuleGeometry(0.15, 0.24, 4, 12), toon(shirt)); body.position.y = 0.36;
    g.add(body);
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
    const cap = new Mesh(new SphereGeometry(R * 1.08, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), toon(hc));
    cap.position.y = HY + (shape === 'square' ? 0.03 : 0.01); cap.scale.set(shape === 'square' ? 1.08 : 1, top, shape === 'square' ? 1.08 : 1);
    cap.rotation.x = -0.38;
    g.add(cap);
    if (style === 'long') {
      const back = new Mesh(new RoundedBoxGeometry(0.36, 0.34, 0.09, 2, 0.04), toon(hc)); back.position.set(0, HY - 0.1, -0.12);
      g.add(back);
    } else if (style === 'bun') {
      const bun = new Mesh(new SphereGeometry(0.075, 14, 10), toon(hc)); bun.position.set(0, HY + R * top + 0.035, -0.05);
      g.add(bun);
    }
  }

  // right arm (pivot at the shoulder, so it can wave / be raised)
  const arm = new Group(); arm.position.set(a.body === 1 ? 0.15 : 0.18, 0.56, 0);
  const am = new Mesh(new CapsuleGeometry(0.045, 0.2, 4, 8), toon(shirt)); am.position.y = -0.13; arm.add(am);
  g.add(arm);

  kit.outline(g);
  return { g, arm };
}
