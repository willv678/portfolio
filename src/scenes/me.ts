// The visitor's avatar (Will's by default) standing in the about panel on the
// home page, idling: a gentle bob, a wave now and then, and the occasional
// hop-and-spin. Rebuilds whenever the avatar is edited. On the first visit of
// a session it waddles in from the right edge first (see 'avatar-walk-in').
import { Group, Vector3 } from 'three';
import { createStage, seg, ease } from './kit';
import { sfx } from '../scripts/sound';
import { makeAvatar } from './avatar';
import { load, DEFAULT, type Avatar } from '../scripts/avatar';

export const create = () => createStage((kit) => {
  const { scene, blob } = kit;
  const holder = new Group(); scene.add(holder);
  const shadow = blob(0.55, 0.38); scene.add(shadow);
  let fig = makeAvatar(kit, load() ?? DEFAULT);
  holder.add(fig.g);
  addEventListener('avatar-change', (e) => {
    holder.clear();
    fig = makeAvatar(kit, (e as CustomEvent<Avatar | null>).detail ?? DEFAULT);
    holder.add(fig.g);
  });

  // "point at the button" (while the speech bubble shows): turn toward the top
  // right, look up, raise an arm. Eases in and out.
  let pointing = false, pointK = 0;
  addEventListener('avatar-point', () => (pointing = true));
  addEventListener('avatar-point-end', () => (pointing = false));
  // nod along while talking
  let talking = false, talkK = 0;
  addEventListener('avatar-talk', (e) => (talking = !!(e as CustomEvent<boolean>).detail));

  // the entrance: waddle in from off the right edge, turn to face you, then
  // the idle loop picks up (its wave lands about 1.5s after arriving)
  const WALK = 1.6, FROM = 1.05, STEPS = 7;
  let walkReq = false, walkAt = -1, idle0 = 0;
  addEventListener('avatar-walk-in', () => (walkReq = true));

  const L = 8;
  let prevT = 0;
  return (t) => {
    const dt = Math.min(0.05, t - prevT); prevT = t;
    if (walkReq) { walkReq = false; walkAt = t; }
    const wk = walkAt < 0 ? 1 : seg(t, walkAt, walkAt + WALK);
    if (walkAt >= 0 && wk >= 1) { walkAt = -1; idle0 = t; }
    if (wk < 1) {
      // waddle: hop on each step, rock side to side, arms swinging
      const ph = wk * STEPS * Math.PI;
      const slow = 1 - seg(wk, 0.75, 1);                                  // the last steps settle
      holder.position.x = FROM * Math.pow(1 - Math.min(1, wk * 1.08), 2.2);   // in right away, slowing as it arrives
      holder.position.y = Math.abs(Math.sin(ph)) * 0.04 * slow;
      holder.rotation.y = -Math.PI / 2 + (Math.PI / 2 + 0.25) * ease(seg(wk, 0.72, 1));   // facing left, then you
      holder.rotation.z = Math.sin(ph) * 0.09 * slow;
      fig.right.rotation.z = 0.18; fig.left.rotation.z = -0.18;
      fig.right.rotation.x = Math.sin(ph) * 0.7 * slow; fig.left.rotation.x = -Math.sin(ph) * 0.7 * slow;
      fig.head.rotation.set(0, 0, Math.sin(ph) * 0.06);
      shadow.position.x = holder.position.x; shadow.scale.setScalar(1);
      // a pit-pat on every footfall
      const step = Math.floor(wk * STEPS), prevStep = Math.floor(seg(t - dt, walkAt, walkAt + WALK) * STEPS);
      if (step !== prevStep && step < STEPS) kit.sfx(() => sfx.step(step % 2));
      return;
    }
    holder.position.x = 0; holder.rotation.z = 0; shadow.position.x = 0;
    fig.left.rotation.x = 0;
    pointK += ((pointing ? 1 : 0) - pointK) * Math.min(1, dt * 5);
    talkK += ((talking ? 1 : 0) - talkK) * Math.min(1, dt * 8);
    const u = (t - idle0) % L;
    // idle: a soft bob and a little sway
    holder.position.y = Math.abs(Math.sin(t * 2.2)) * 0.015;
    holder.rotation.y = 0.25 + Math.sin(t * 0.7) * 0.12;
    fig.head.rotation.z = Math.sin(t * 1.1) * 0.05;
    // wave, around 1.5–3.3s
    const w = seg(u, 1.5, 1.8) * (1 - seg(u, 3.0, 3.3));
    fig.right.rotation.z = 0.18 + w * (2.3 + Math.sin(t * 9) * 0.35);
    fig.left.rotation.z = -0.18;
    // hop and spin, around 5.4–6.4s
    const h = pointK > 0.01 ? 0 : seg(u, 5.4, 6.4);              // no spinning while pointing at the button
    if (h > 0 && h < 1) {
      holder.position.y += Math.sin(Math.PI * h) * 0.18;
      holder.rotation.y += ease(h) * Math.PI * 2;
    }
    shadow.scale.setScalar(1 - Math.sin(Math.PI * h) * 0.3);
    if (pointK > 0.001) {
      // body keeps facing you; only the head turns up toward the button, and
      // the arm on that side points up and out at 45°
      const p = pointK, mix = (a: number, b: number) => a + (b - a) * p;
      holder.rotation.y = mix(holder.rotation.y, 0.12);
      fig.head.rotation.y = mix(0, 0.55);
      fig.head.rotation.x = mix(0, -0.3);
      fig.head.rotation.z = mix(fig.head.rotation.z, -0.08);
      fig.right.rotation.z = mix(fig.right.rotation.z, Math.PI * 0.75 + Math.sin(t * 5) * 0.05);
      fig.right.rotation.x = 0;
    } else { fig.head.rotation.x = 0; fig.head.rotation.y = 0; fig.right.rotation.x = 0; }
    fig.head.rotation.x += Math.sin(t * 17) * 0.045 * talkK;          // little nods while speaking
  };
}, { lookAt: new Vector3(0, 0.62, 0), minSpan: 1.15, minHeight: 1.3, outline: 0.008 });
