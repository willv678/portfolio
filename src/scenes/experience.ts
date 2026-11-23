// The little 3D object beside the active timeline entry, like a 3DS icon
// preview. One stage, a few tiny models; show(name) swaps them with a pop.
// Generic objects on purpose (no company logos):
//   uga → graduation cap · leidos → traffic light · lab → toy car with lidar
//   roblox → a blocky figure waving · abridge → a speech bubble, typing

import {
  BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createStage, seg, type SceneHandle } from './kit';

const backOut = (x: number) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);

export function create(): (SceneHandle & { show(name: string): void }) | null {
  let want = '', shownAt = -1, current = '';
  const models = new Map<string, { g: Group; tick(t: number): void }>();

  const handle = createStage((kit) => {
    const { scene, toon, blob } = kit;
    const shadow = blob(1.4, 1.0); scene.add(shadow);
    const add = (name: string, g: Group, tick: (t: number) => void = () => {}) => {
      g.visible = false; scene.add(g); models.set(name, { g, tick });
    };

    // ---------- UGA: graduation cap ----------
    {
      const g = new Group();
      const skull = new Mesh(new CylinderGeometry(0.34, 0.37, 0.26, 32), toon('#2a2a30')); skull.position.y = 0.13;
      const board = new Mesh(new BoxGeometry(1.0, 0.05, 1.0), toon('#33333a')); board.position.y = 0.28; board.rotation.y = Math.PI / 4;
      const button = new Mesh(new SphereGeometry(0.045, 12, 8), toon('#ba0c2f')); button.position.y = 0.31;
      const tassel = new Group(); tassel.position.set(0.68, 0.3, 0);
      const cord = new Mesh(new CylinderGeometry(0.012, 0.012, 0.3, 6), toon('#ba0c2f')); cord.position.y = -0.15;
      const end = new Mesh(new CylinderGeometry(0.03, 0.05, 0.13, 10), toon('#ba0c2f')); end.position.y = -0.33;
      tassel.add(cord, end);
      g.add(skull, board, button, tassel);
      g.position.y = 0.25;
      add('uga', g, (t) => { tassel.rotation.z = Math.sin(t * 3) * 0.18; tassel.rotation.x = Math.cos(t * 2.3) * 0.1; });
    }

    // ---------- Leidos: traffic light ----------
    {
      const g = new Group();
      const base = new Mesh(new RoundedBoxGeometry(0.34, 0.06, 0.34, 2, 0.02), toon('#8d939c')); base.position.y = 0.03;
      const pole = new Mesh(new CylinderGeometry(0.035, 0.035, 0.7, 10), toon('#a3a9b1')); pole.position.y = 0.38;
      const box = new Mesh(new RoundedBoxGeometry(0.28, 0.66, 0.22, 3, 0.06), toon('#2a2d35')); box.position.y = 1.03;
      const lamps = ['#ff5d5d', '#ffc94d', '#5be38a'].map((c, i) => {
        const m = new MeshBasicMaterial({ color: '#4a4f5a' });
        const l = new Mesh(new SphereGeometry(0.075, 14, 10), m); l.position.set(0, 1.22 - i * 0.19, 0.1);
        g.add(l); return { m, c };
      });
      g.add(base, pole, box);
      g.scale.setScalar(0.85);
      // red → green → yellow, like a real one
      add('leidos', g, (t) => {
        const ph = t % 3.2, on = ph < 1.3 ? 0 : ph < 2.6 ? 2 : 1;
        lamps.forEach(({ m, c }, i) => m.color.set(i === on ? c : '#4a4f5a'));
      });
    }

    // ---------- MSC Lab: toy car with a spinning lidar ----------
    {
      const g = new Group(), body = new Group(); g.add(body);
      const hull = new Mesh(new RoundedBoxGeometry(0.56, 0.16, 0.32, 3, 0.06), toon('#ff8a3d')); hull.position.y = 0.15;
      const cabin = new Mesh(new RoundedBoxGeometry(0.3, 0.15, 0.28, 3, 0.06), toon('#bfe6ff')); cabin.position.set(-0.03, 0.29, 0);
      const roof = new Mesh(new RoundedBoxGeometry(0.31, 0.04, 0.29, 2, 0.02), toon('#ffffff')); roof.position.set(-0.03, 0.37, 0);
      const lidar = new Mesh(new CylinderGeometry(0.06, 0.06, 0.06, 16), toon('#2fd0c0')); lidar.position.set(-0.03, 0.42, 0);
      const stripe = new Mesh(new BoxGeometry(0.02, 0.03, 0.125), new MeshBasicMaterial({ color: '#0f5f57' })); stripe.position.set(0.055, 0, 0); lidar.add(stripe);
      body.add(hull, cabin, roof, lidar);
      const wheelGeo = new CylinderGeometry(0.075, 0.075, 0.06, 16); wheelGeo.rotateX(Math.PI / 2);
      const wheels = [[0.18, 0.165], [0.18, -0.165], [-0.18, 0.165], [-0.18, -0.165]].map(([x, z]) => {
        const w = new Mesh(wheelGeo, toon('#25252b')); w.position.set(x, 0.075, z); g.add(w); return w;
      });
      g.scale.setScalar(1.7);
      add('lab', g, (t) => {
        lidar.rotation.y = t * 6;
        body.position.y = Math.abs(Math.sin(t * 16)) * 0.006;
        wheels.forEach((w) => (w.rotation.z = -t * 6));
      });
    }

    // ---------- Roblox: a blocky figure, waving ----------
    {
      const g = new Group();
      const skin = '#ececf0';
      const torso = new Mesh(new RoundedBoxGeometry(0.46, 0.46, 0.24, 2, 0.03), toon('#e2463c')); torso.position.y = 0.73;
      const head = new Mesh(new RoundedBoxGeometry(0.3, 0.3, 0.3, 3, 0.07), toon(skin)); head.position.y = 1.13;
      const legs = [-0.12, 0.12].map((x) => { const l = new Mesh(new RoundedBoxGeometry(0.21, 0.5, 0.22, 2, 0.03), toon('#3a3f4a')); l.position.set(x, 0.25, 0); return l; });
      const arm = (x: number) => {
        const pivot = new Group(); pivot.position.set(x, 0.94, 0);
        const a = new Mesh(new RoundedBoxGeometry(0.2, 0.46, 0.21, 2, 0.03), toon(skin)); a.position.y = -0.23;
        pivot.add(a); return pivot;
      };
      const left = arm(-0.34), right = arm(0.34);
      g.add(torso, head, ...legs, left, right);
      g.scale.setScalar(0.92);
      add('roblox', g, (t) => {
        right.rotation.z = 2.5 + Math.sin(t * 7) * 0.35;
        left.rotation.z = -0.08 + Math.sin(t * 2) * 0.04;
        head.rotation.y = Math.sin(t * 1.3) * 0.2;
      });
    }

    // ---------- Abridge: a speech bubble, typing ----------
    {
      const g = new Group();
      const bubble = new Mesh(new RoundedBoxGeometry(1.0, 0.62, 0.22, 4, 0.2), toon('#f7f7fb')); bubble.position.y = 0.85;
      const tail = new Mesh(new ConeGeometry(0.1, 0.24, 4), toon('#f7f7fb'));
      tail.position.set(-0.26, 0.5, 0); tail.rotation.z = Math.PI + 0.45;
      const dots = [-0.2, 0, 0.2].map((x) => {
        const d = new Mesh(new SphereGeometry(0.06, 14, 10), toon('#5b4bd6')); d.position.set(x, 0.85, 0.12); g.add(d); return d;
      });
      g.add(bubble, tail);
      add('abridge', g, (t) => dots.forEach((d, i) => (d.position.y = 0.85 + Math.max(0, Math.sin(t * 6 - i * 0.9)) * 0.07)));
    }

    return (t) => {
      if (want !== current) {                           // swap models with a little pop
        if (current) models.get(current)!.g.visible = false;
        current = want; shownAt = t;
      }
      const m = models.get(current);
      shadow.visible = !!m;
      if (!m) return;
      const k = seg(t, shownAt, shownAt + 0.45);
      m.g.visible = true;
      m.g.userData.base ??= m.g.scale.x;
      m.g.scale.setScalar(m.g.userData.base * (0.55 + 0.45 * backOut(k)));
      m.g.rotation.y = Math.sin(t * 0.7) * 0.55 + (1 - k) * 1.2;   // sway, plus a spin-in on arrival
      m.g.position.y = (m.g.userData.y ??= m.g.position.y) + Math.sin(t * 2) * 0.03;
      shadow.scale.setScalar(0.9 - Math.sin(t * 2) * 0.05);
      m.tick(t);
    };
  }, { lookAt: new Vector3(0, 0.62, 0), minSpan: 2.5, minHeight: 2.5 });

  if (!handle) return null;
  return Object.assign(handle, { show: (name: string) => { want = name; } });
}
