// The big preview in the avatar editor: your avatar facing the camera with a
// gentle idle. Drag (mouse or finger) to turn it; the reset button (or the
// 'avatar-preview-reset' event) eases it back to the front. Rebuilds
// instantly whenever an option changes.
import { Group, Vector3 } from 'three';
import { createStage } from './kit';
import { makeAvatar } from './avatar';
import { load, DEFAULT, type Avatar } from '../scripts/avatar';

export const create = () => createStage((kit) => {
  const { scene, blob } = kit;
  const holder = new Group(); scene.add(holder);
  const shadow = blob(0.7, 0.5); scene.add(shadow);
  let fig = makeAvatar(kit, load() ?? DEFAULT);
  holder.add(fig.g);
  addEventListener('avatar-change', (e) => {
    holder.clear();
    fig = makeAvatar(kit, (e as CustomEvent<Avatar | null>).detail ?? DEFAULT);
    holder.add(fig.g);
  });

  // drag to spin
  const FRONT = 0.15;
  let angle = FRONT, vel = 0, dragging = false, lastX = 0, returning = false;
  addEventListener('avatar-preview-reset', () => { returning = true; vel = 0; });
  addEventListener('pointerdown', (e) => {
    const h = kit.host();
    if (!h || !h.contains(e.target as Node)) return;
    if ((e.target as Element).closest('button')) return;           // the reset button isn't a drag
    dragging = true; returning = false; lastX = e.clientX; h.setPointerCapture?.(e.pointerId);
  });
  addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; angle += dx * 0.012; vel = dx * 0.012; });
  addEventListener('pointerup', () => (dragging = false));
  addEventListener('pointercancel', () => (dragging = false));

  let prevT = 0;
  return (t) => {
    const dt = Math.min(0.05, t - prevT); prevT = t;
    fig.blink(t);
    if (!dragging) { vel *= 0.9; angle += vel; }                   // a little momentum after a drag
    if (returning) {                                               // ease back to the front by the shortest way round
      const d = Math.atan2(Math.sin(FRONT - angle), Math.cos(FRONT - angle));
      angle += d * Math.min(1, dt * 7);
      if (Math.abs(d) < 0.002) { angle = FRONT; returning = false; }
    }
    holder.rotation.y = angle + Math.sin(t * 0.8) * 0.05;          // idle: a gentle sway
    holder.position.y = Math.abs(Math.sin(t * 2.2)) * 0.012;
    fig.head.rotation.z = Math.sin(t * 1.1) * 0.04;
  };
}, { lookAt: new Vector3(0, 0.62, 0), minSpan: 1.3, minHeight: 1.35, outline: 0.008 });
