// The visitor's avatar (Will's by default) standing in the about panel on the
// home page, idling: a gentle bob, a wave now and then, and the occasional
// hop-and-spin. Rebuilds whenever the avatar is edited.
import { Group, Vector3 } from 'three';
import { createStage, seg, ease } from './kit';
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

  const L = 8;
  let prevT = 0;
  return (t) => {
    const dt = Math.min(0.05, t - prevT); prevT = t;
    pointK += ((pointing ? 1 : 0) - pointK) * Math.min(1, dt * 5);
    talkK += ((talking ? 1 : 0) - talkK) * Math.min(1, dt * 8);
    const u = t % L;
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
