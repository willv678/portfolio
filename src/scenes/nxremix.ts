// NXRemix: a toy game courtyard as it looks on a Switch (flat, milky, nobody casts a
// shadow), and a glowing seam that sweeps across it. Behind the seam the same world is
// remastered: warm stone, a sun comes up, shadows land under everyone, cobblestones
// get some depth. The characters (the visitor and a dog) are never repainted, only the
// world around them; the character looks down at its brand-new shadow. Then the critic
// checks the frame and approves it, and the seam slides back so it can play again.
//
// The wipe is per pixel: world materials carry both colors and pick by world x
// against the seam (see `dual`). Extras that only exist in the remaster (sun,
// shadows, cobblestones) pop in as the seam passes them.

import { Color, CylinderGeometry, CapsuleGeometry, BoxGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createStage, seg, ease, passed } from './kit';
import { sfx } from '../scripts/sound';
import { makeAvatar } from './avatar';
import { load, DEFAULT, type Avatar } from '../scripts/avatar';

const backOut = (x: number) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
// [stock, remastered]: stock is grey and milky, the remaster warm
const C = {
  ground: ['#b9bdc4', '#ecd2a6'], side: ['#a3a7b0', '#d8b583'],
  wall: ['#c8cad1', '#f3dfc4'], stone: ['#b3b6be', '#e2c49c'],
  crate: ['#a8a29b', '#cf9159'], barrel: ['#9e9994', '#b8754a'], hoop: ['#7c7a7a', '#6a4a36'],
  leaf: ['#a9b8ad', '#82c785'], trunk: ['#8f8984', '#9c6842'],
  accent: '#c2416e', seam: '#fff3dc', sun: '#ffd36b', cobble: '#e0b47e',
  dog: '#d99a5b', dogDark: '#6b4a36', dogLight: '#f6efe4', green: '#2f9e5b',
};

export const create = () => createStage((kit) => {
  const { scene, toon, blob } = kit;

  // ---------- the wipe: one seam, shared by every world material ----------
  const seam = { value: -9 };
  const dual = ([a, b]: string[]) => {
    const m = toon(a), colB = { value: new Color(b) };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uSeam = seam; sh.uniforms.uColB = colB;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vWX;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWX = (modelMatrix * vec4(transformed, 1.0)).x;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vWX;\nuniform float uSeam;\nuniform vec3 uColB;')
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( mix( uColB, diffuse, smoothstep( uSeam - 0.012, uSeam + 0.012, vWX ) ), opacity );');
    };
    m.customProgramCacheKey = () => 'nxr-dual';
    return m;
  };
  const M = Object.fromEntries(Object.entries(C).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, dual(v as string[])]));

  // ---------- the courtyard ----------
  const plaza = new Mesh(new RoundedBoxGeometry(4.0, 0.2, 2.3, 2, 0.06), [M.side, M.side, M.ground, M.side, M.side, M.side]);
  plaza.position.y = -0.1; scene.add(plaza);
  const wall = new Mesh(new RoundedBoxGeometry(4.0, 1.05, 0.26, 2, 0.05), M.wall);
  wall.position.set(0, 0.525, -1.02); scene.add(wall);
  const stoneGeo = new RoundedBoxGeometry(0.34, 0.15, 0.06, 2, 0.025);
  for (const [x, y] of [[-1.6, 0.25], [-1.2, 0.48], [-0.35, 0.3], [0.2, 0.72], [0.65, 0.42], [1.15, 0.78], [1.6, 0.3], [-0.9, 0.82]]) {
    const s = new Mesh(stoneGeo, M.stone); s.position.set(x, y, -0.875); scene.add(s);
  }
  // crates and a barrel at the back left, a tree at the back right
  const crateGeo = new RoundedBoxGeometry(0.42, 0.42, 0.42, 2, 0.03);
  for (const [x, y, z, r] of [[-1.45, 0.21, -0.6, 0.1], [-1.0, 0.21, -0.66, -0.15], [-1.3, 0.63, -0.64, -0.05]]) {
    const c = new Mesh(crateGeo, M.crate); c.position.set(x, y, z); c.rotation.y = r; scene.add(c);
  }
  const barrel = new Group(); barrel.position.set(-0.45, 0, -0.68); scene.add(barrel);
  const bBody = new Mesh(new CylinderGeometry(0.17, 0.17, 0.42, 20), M.barrel); bBody.position.y = 0.21; bBody.scale.set(1, 1, 1);
  barrel.add(bBody);
  for (const y of [0.09, 0.33]) {
    const h = new Mesh(new TorusGeometry(0.172, 0.018, 6, 24), M.hoop); h.rotation.x = Math.PI / 2; h.position.y = y; barrel.add(h);
  }
  const tree = new Group(); tree.position.set(1.5, 0, -0.62); scene.add(tree);
  const trunk = new Mesh(new CylinderGeometry(0.06, 0.08, 0.55, 8), M.trunk); trunk.position.y = 0.27; tree.add(trunk);
  for (const [x, y, r] of [[0, 0.78, 0.33], [-0.2, 0.62, 0.22], [0.2, 0.64, 0.23]]) {
    const l = new Mesh(new SphereGeometry(r, 16, 12), M.leaf); l.position.set(x, y, 0.02); tree.add(l);
  }

  // ---------- the characters: never repainted ----------
  const me = new Group(); me.position.set(-0.25, 0, 0.2); me.rotation.y = 0.45; scene.add(me);
  let head: Group | null = null;
  const build = (a: Avatar) => {
    me.clear();
    const f = makeAvatar(kit, a); kit.outline(f.g); me.add(f.g); head = f.head;
  };
  build(load() ?? DEFAULT);
  addEventListener('avatar-change', (e) => build((e as CustomEvent<Avatar | null>).detail ?? DEFAULT));

  // a toy dog, facing the character (built facing +x)
  const dog = new Group(); dog.position.set(0.72, 0, 0.32); dog.rotation.y = -2.55; scene.add(dog);
  const tan = toon(C.dog), dark = toon(C.dogDark), light = toon(C.dogLight);
  const torso = new Mesh(new CapsuleGeometry(0.1, 0.2, 4, 12), tan); torso.rotation.z = Math.PI / 2; torso.position.y = 0.27; dog.add(torso);
  const saddle = new Mesh(new SphereGeometry(0.1, 14, 10), dark); saddle.scale.set(1.3, 0.55, 1.02); saddle.position.set(-0.03, 0.33, 0); dog.add(saddle);
  const legGeo = new CylinderGeometry(0.032, 0.03, 0.2, 8);
  for (const [x, z] of [[0.1, 0.06], [0.1, -0.06], [-0.1, 0.06], [-0.1, -0.06]]) {
    const l = new Mesh(legGeo, tan); l.position.set(x, 0.1, z); dog.add(l);
    const paw = new Mesh(new SphereGeometry(0.036, 10, 8), light); paw.position.set(x + 0.01, 0.02, z); paw.scale.y = 0.6; dog.add(paw);
  }
  const dHead = new Group(); dHead.position.set(0.2, 0.42, 0); dog.add(dHead);
  dHead.add(new Mesh(new SphereGeometry(0.1, 16, 12), tan));
  const snout = new Mesh(new SphereGeometry(0.06, 12, 10), light); snout.scale.set(1.2, 0.8, 0.9); snout.position.set(0.08, -0.03, 0); dHead.add(snout);
  const nose = new Mesh(new SphereGeometry(0.022, 8, 6), toon('#2b2838')); nose.position.set(0.15, -0.01, 0); dHead.add(nose);
  for (const z of [-1, 1]) {
    const ear = new Mesh(new SphereGeometry(0.07, 12, 8), dark); ear.scale.set(0.55, 1.1, 0.35); ear.position.set(-0.02, -0.02, z * 0.095); ear.rotation.x = z * 0.25; dHead.add(ear);
    const eye = new Mesh(new SphereGeometry(0.016, 8, 6), toon('#2b2838')); eye.position.set(0.075, 0.035, z * 0.05); dHead.add(eye);
  }
  const tail = new Group(); tail.position.set(-0.2, 0.33, 0); dog.add(tail);
  const tailM = new Mesh(new CapsuleGeometry(0.022, 0.13, 3, 8), tan); tailM.position.y = 0.08; tail.add(tailM);
  tail.rotation.z = 0.5;

  // ---------- only in the remaster ----------
  const sun = new Group(); sun.position.set(-1.35, 1.6, -1.35); scene.add(sun);
  sun.add(new Mesh(new SphereGeometry(0.2, 20, 14), new MeshBasicMaterial({ color: C.sun })));
  const sunGlow = kit.glow(C.sun); sunGlow.scale.setScalar(1.1); sun.add(sunGlow);
  // the sun is up and to the left, so shadows fall to the right and back
  const shadows: { m: Mesh; x: number; k: number }[] = [];
  const shadow = (x: number, z: number, w: number, d: number, k = 0.8) => {
    const m = blob(w, d); m.position.set(x + w * 0.22, 0.006, z - 0.04); scene.add(m);
    shadows.push({ m, x, k });
  };
  shadow(me.position.x, me.position.z, 0.85, 0.42, 0.95);
  shadow(dog.position.x, dog.position.z, 0.75, 0.38);
  shadow(-1.25, -0.5, 1.15, 0.5);
  shadow(-0.45, -0.6, 0.55, 0.36);
  shadow(1.5, -0.5, 0.9, 0.45);
  const cobbleGeo = new RoundedBoxGeometry(0.17, 0.05, 0.12, 2, 0.02), cobbleMat = toon(C.cobble);
  const cobbles: Mesh[] = [];
  for (const [x, z] of [[-1.7, 0.85], [-1.4, 0.55], [-1.15, 0.9], [-0.85, 0.65], [-0.55, 0.92], [-1.65, 0.2], [-0.95, 0.15],
    [0.05, 0.85], [0.4, 0.62], [0.75, 0.92], [1.1, 0.68], [1.45, 0.92], [1.72, 0.55], [1.25, 0.2], [1.75, 0.05], [0.2, -0.35]]) {
    const c = new Mesh(cobbleGeo, cobbleMat); c.position.set(x, 0.025, z); c.userData.x = x;
    c.rotation.y = Math.sin(x * 7 + z * 3) * 0.5; scene.add(c); cobbles.push(c);
  }

  // ---------- the seam: a thin sheet of light with a handle ----------
  const wipe = new Group(); scene.add(wipe);
  const sheetMat = new MeshBasicMaterial({ color: C.seam, transparent: true, opacity: 0.5, depthWrite: false });
  const sheet = new Mesh(new BoxGeometry(0.03, 1.55, 2.4), sheetMat); sheet.position.y = 0.7; wipe.add(sheet);
  const edgeMat = new MeshBasicMaterial({ color: '#ffffff', transparent: true });
  const edge = new Mesh(new BoxGeometry(0.035, 1.6, 0.035), edgeMat); edge.position.set(0, 0.72, 1.2); wipe.add(edge);
  const knob = new Mesh(new SphereGeometry(0.1, 16, 12), new MeshBasicMaterial({ color: C.accent, transparent: true })); knob.position.set(0, 1.56, 1.2); wipe.add(knob);
  const knobGlow = kit.glow('#ffe2b0'); knobGlow.scale.setScalar(0.7); knobGlow.position.copy(knob.position); wipe.add(knobGlow);
  const wipeMats = [sheetMat, edgeMat, knob.material as MeshBasicMaterial];

  // ---------- the critic's check ----------
  const ok = new Group(); ok.position.set(0.25, 1.55, 0.3); scene.add(ok);
  const okMat = new MeshBasicMaterial({ color: C.green });
  const disc = new Mesh(new CylinderGeometry(0.17, 0.17, 0.03, 28), toon('#ffffff')); disc.rotation.x = Math.PI / 2; disc.position.z = -0.025; ok.add(disc);
  const tick1 = new Mesh(new BoxGeometry(0.1, 0.04, 0.02), okMat); tick1.position.set(-0.045, -0.02, 0); tick1.rotation.z = -0.8; ok.add(tick1);
  const tick2 = new Mesh(new BoxGeometry(0.21, 0.04, 0.02), okMat); tick2.position.set(0.05, 0.02, 0); tick2.rotation.z = 0.9; ok.add(tick2);
  const sparks = kit.sparkles(8);

  // ---------- the loop ----------
  const L = 7.2, X0 = -2.35, X1 = 2.35;
  const IN_A = 0.6, IN_B = 2.7, CHECK = 3.0, OUT_A = 5.3, OUT_B = 6.6;
  const sparkAt = new Vector3(0.25, 1.45, 0.3);
  const SUN_AT = IN_A + (IN_B - IN_A) * Math.cbrt((sun.position.x - X0) / (X1 - X0) / 4);   // when the seam reaches the sun (inverse of ease's first half)

  return (t, prev) => {
    const u = t % L;
    const x = u < OUT_A ? X0 + (X1 - X0) * ease(seg(u, IN_A, IN_B)) : X1 + (X0 - X1) * ease(seg(u, OUT_A, OUT_B));
    seam.value = x;
    const moving = (u > IN_A - 0.15 && u < IN_B + 0.15) || (u > OUT_A - 0.15 && u < OUT_B + 0.15);
    const vis = moving ? Math.min(seg(Math.abs(x), 2.35, 2.0), 1) : 0;
    wipe.visible = vis > 0.01;
    wipe.position.x = x;
    wipeMats.forEach((m, i) => (m.opacity = vis * (i === 0 ? 0.3 : 1)));
    knobGlow.material.opacity = vis * 0.6;

    // what's left of the seam is remastered: pop the extras as it passes
    const done = (px: number, w = 0.25) => seg(x, px - w, px + w);
    const s = done(sun.position.x, 0.2);
    sun.scale.setScalar(Math.max(0.001, backOut(s)));
    sun.position.y = 1.6 - (1 - s) * 0.3;
    for (const sh of shadows) (sh.m.material as MeshBasicMaterial).opacity = done(sh.x, 0.3) * sh.k;
    for (const c of cobbles) {
      const k = done(c.userData.x, 0.15);
      c.scale.setScalar(Math.max(0.001, backOut(k)));
      c.visible = k > 0.01;
    }

    // the character notices it has a shadow now, and looks down at it
    if (head) {
      const look = Math.sin(Math.PI * seg(u, 1.75, 2.9));
      head.rotation.x = 0.45 * look;
      head.rotation.y = -0.3 * look;
    }
    // the dog wags, harder once the sun is out, and hops when the check lands
    tail.rotation.y = Math.sin(t * (u > SUN_AT && u < OUT_B ? 18 : 7)) * 0.5;
    const hop = Math.sin(Math.PI * seg(u, CHECK + 0.1, CHECK + 0.45));
    dog.position.y = hop * 0.12;
    dHead.rotation.z = 0.15 * hop;

    // the critic: same frame, better: approved
    const k = u - CHECK;
    ok.visible = k > 0 && k < 1.9;
    if (ok.visible) ok.scale.setScalar(Math.max(0.001, backOut(seg(k, 0, 0.3)) * (1 - seg(k, 1.6, 1.9))));
    ok.position.y = 1.55 + Math.sin(t * 3) * 0.02;

    if (passed(prev, t, CHECK, L)) sparks.burst(t, sparkAt, ['#ffd36b', '#ffe9a8', C.accent]);
    sparks.update(t);
    if (passed(prev, t, SUN_AT, L)) kit.sfx(sfx.plink);
    if (passed(prev, t, CHECK, L)) kit.sfx(sfx.ding);
  };
}, { lookAt: new Vector3(0, 0.72, 0), minSpan: 4.8, minHeight: 3.1, outline: 0.012 });
