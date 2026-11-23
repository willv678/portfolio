// The big preview in the avatar editor: your avatar on a slow turntable.
// Drag (mouse or finger) to spin it; it eases back to turning on its own.
// Rebuilds instantly whenever an option changes.
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
  let angle = 0.35, vel = 0, dragging = false, lastX = 0;
  addEventListener('pointerdown', (e) => {
    const h = kit.host();
    if (!h || !h.contains(e.target as Node)) return;
    dragging = true; lastX = e.clientX; h.setPointerCapture?.(e.pointerId);
  });
  addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; angle += dx * 0.012; vel = dx * 0.012; });
  addEventListener('pointerup', () => (dragging = false));
  addEventListener('pointercancel', () => (dragging = false));

  let prevT = 0;
  return (t) => {
    const dt = Math.min(0.05, t - prevT); prevT = t;
    if (!dragging) { vel *= 0.92; angle += vel + dt * 0.5; }      // momentum, then a slow turn
    holder.rotation.y = angle;
    holder.position.y = Math.abs(Math.sin(t * 2.2)) * 0.012;
    fig.head.rotation.z = Math.sin(t * 1.1) * 0.04;
  };
}, { lookAt: new Vector3(0, 0.62, 0), minSpan: 1.3, minHeight: 1.35, outline: 0.008 });
