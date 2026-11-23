// 3D version of a visitor avatar (see src/scripts/avatar.ts for the options).
// An original toy figure: capsule body, round head, dot eyes, simple hair.
// Faces +z; about 1.1 units tall. The right arm is a pivot so it can wave.

import { CapsuleGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OPTIONS, type Avatar } from '../scripts/avatar';
import type { Kit } from './kit';

export function makeAvatar(kit: Kit, a: Avatar) {
  const { toon } = kit;
  const skin = OPTIONS.skin[a.skin], hc = OPTIONS.hairColor[a.hairColor], shirt = OPTIONS.shirt[a.shirt];
  const g = new Group();

  // body
  if (OPTIONS.body[a.body] === 'a-line') {
    const torso = new Mesh(new CapsuleGeometry(0.13, 0.12, 4, 12), toon(shirt)); torso.position.y = 0.58;
    const skirt = new Mesh(new CylinderGeometry(0.12, 0.21, 0.4, 20), toon(shirt)); skirt.position.y = 0.24;
    g.add(torso, skirt);
  } else {
    const body = new Mesh(new CapsuleGeometry(0.17, 0.32, 4, 12), toon(shirt)); body.position.y = 0.42;
    g.add(body);
  }

  // head
  const HY = 0.86, R = 0.14;
  const shape = OPTIONS.head[a.head];
  const head = shape === 'square'
    ? new Mesh(new RoundedBoxGeometry(0.26, 0.26, 0.25, 3, 0.08), toon(skin))
    : new Mesh(new SphereGeometry(R, 20, 14), toon(skin));
  if (shape === 'oval') head.scale.set(0.92, 1.14, 0.95);
  head.position.y = HY;
  g.add(head);
  const front = shape === 'square' ? 0.126 : R * (shape === 'oval' ? 0.9 : 0.95);

  // eyes
  const eyeMat = new MeshBasicMaterial({ color: '#2b2838' });
  for (const d of [-1, 1]) {
    const e = new Mesh(new SphereGeometry(0.018, 10, 8), eyeMat);
    e.position.set(d * 0.05, HY + 0.01, front);
    e.scale.set(1, OPTIONS.eyes[a.eyes] === 'ovals' ? 1.7 : 1, 0.6);
    g.add(e);
  }

  // hair
  const style = OPTIONS.hair[a.hair];
  if (style !== 'none') {
    const top = shape === 'oval' ? 1.14 : 1;
    const cap = new Mesh(new SphereGeometry(R * 1.08, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), toon(hc));
    cap.position.y = HY + (shape === 'square' ? 0.02 : 0.005); cap.scale.set(shape === 'square' ? 1.05 : 1, top, shape === 'square' ? 1.05 : 1);
    cap.rotation.x = -0.35;
    g.add(cap);
    if (style === 'long') {
      const back = new Mesh(new RoundedBoxGeometry(0.29, 0.3, 0.08, 2, 0.04), toon(hc)); back.position.set(0, HY - 0.08, -0.1);
      g.add(back);
    } else if (style === 'bun') {
      const bun = new Mesh(new SphereGeometry(0.065, 14, 10), toon(hc)); bun.position.set(0, HY + R * top + 0.03, -0.04);
      g.add(bun);
    }
  }

  // right arm (pivot at the shoulder, so it can wave / be raised)
  const arm = new Group(); arm.position.set(a.body === 1 ? 0.16 : 0.2, 0.66, 0);
  const am = new Mesh(new CapsuleGeometry(0.05, 0.24, 4, 8), toon(shirt)); am.position.y = -0.15; arm.add(am);
  g.add(arm);

  kit.outline(g);
  return { g, arm };
}
