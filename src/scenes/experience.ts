// The little 3D scene beside the active timeline entry, like a 3DS icon
// preview. One stage, one tiny looping scene per entry; show(name) swaps
// them with a pop.
//   abridge → doctor and patient talk, a phone listens, a note writes itself
//   lab     → a test car bumps a cone, VHS-rewinds, and retries (run 1041, 1042…)
//   roblox  → a classic blocky avatar: waves, falls to pieces, respawns
//   leidos  → a car stops at a red light, they talk (V2X), it goes on green
//   uga     → a tiny Sanford Stadium, hedges and all, with a football in the air

import {
  BoxGeometry, CanvasTexture, CapsuleGeometry, ConeGeometry, GridHelper, CylinderGeometry, Group, Mesh, MeshBasicMaterial,
  PlaneGeometry, RingGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createStage, seg, ease, easeIn, passed, type SceneHandle, type Kit } from './kit';
import { sfx } from '../scripts/sound';

// A mesh placed at (x, y, z). (position is read-only, so it can't be Object.assign'ed.)
const at = <T extends Mesh>(m: T, x: number, y: number, z: number) => (m.position.set(x, y, z), m);

const backOut = (x: number) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);

// The toy car, shared by two scenes.
function toyCar(kit: Kit, color = '#ff8a3d') {
  const { toon } = kit;
  const car = new Group(), body = new Group(); car.add(body);
  const hull = new Mesh(new RoundedBoxGeometry(0.56, 0.16, 0.32, 3, 0.06), toon(color)); hull.position.y = 0.15;
  const cabin = new Mesh(new RoundedBoxGeometry(0.3, 0.15, 0.28, 3, 0.06), toon('#bfe6ff')); cabin.position.set(-0.03, 0.29, 0);
  const roof = new Mesh(new RoundedBoxGeometry(0.31, 0.04, 0.29, 2, 0.02), toon('#ffffff')); roof.position.set(-0.03, 0.37, 0);
  body.add(hull, cabin, roof);
  for (const z of [-0.1, 0.1]) {
    const h = new Mesh(new SphereGeometry(0.026, 10, 8), new MeshBasicMaterial({ color: '#fff1a8' })); h.position.set(0.28, 0.17, z); body.add(h);
  }
  const wheelGeo = new CylinderGeometry(0.075, 0.075, 0.06, 16); wheelGeo.rotateX(Math.PI / 2);
  const wheels = [[0.18, 0.165], [0.18, -0.165], [-0.18, 0.165], [-0.18, -0.165]].map(([x, z]) => {
    const w = new Mesh(wheelGeo, toon('#25252b')); w.position.set(x, 0.075, z); car.add(w); return w;
  });
  return { car, body, wheels };
}

export function create(): (SceneHandle & { show(name: string): void }) | null {
  let want = '', shownAt = -1, current = '';
  const models = new Map<string, { g: Group; tick(t: number, prev: number): void; fixed?: boolean }>();

  const handle = createStage((kit) => {
    const { scene, toon, blob } = kit;
    const shadow = blob(1.4, 1.0); scene.add(shadow);
    const add = (name: string, g: Group, tick: (t: number, prev: number) => void = () => {}, fixed = false) => {
      g.visible = false; scene.add(g); models.set(name, { g, tick, fixed });
    };

    // ---------- UGA: a tiny Sanford Stadium ----------
    {
      const g = new Group();
      const RX = 1.0, RZ = 0.62;
      // concrete floor under everything, so there's no gap between field and stands
      const floor = new Mesh(new CylinderGeometry(1.0, 1.0, 0.02, 56), toon('#cfcabd')); floor.scale.set(0.95 * RX, 1, 0.95 * RZ); floor.position.y = 0.005;
      g.add(floor);
      // field + the famous hedges
      const field = new Mesh(new CylinderGeometry(1, 1, 0.04, 48), toon('#5fbf6a')); field.scale.set(0.78, 1, 0.44); field.position.y = 0.02;
      g.add(field);
      for (let i = -3; i <= 3; i++) {
        const l = new Mesh(new BoxGeometry(0.012, 0.005, 0.6), new MeshBasicMaterial({ color: '#f4f4ef' })); l.position.set(i * 0.17, 0.043, 0); g.add(l);
      }
      const hedge = new Mesh(new TorusGeometry(1, 0.035, 8, 64), toon('#2f6b3a')); hedge.rotation.x = Math.PI / 2; hedge.scale.set(0.83, 0.5, 1); hedge.position.y = 0.06;
      g.add(hedge);
      // the bowl: tiers of seats, red and black, opening wider as they go up
      [['#ba0c2f', 0.0], ['#2a2a30', 0.13], ['#ba0c2f', 0.26]].forEach(([c, y], i) => {
        const r0 = 0.92 + i * 0.12, tier = new Mesh(new CylinderGeometry(r0 + 0.12, r0, 0.13, 56, 1, true), toon(c as string, { side: 2 }));
        tier.scale.set(RX, 1, RZ); tier.position.y = 0.065 + (y as number);
        tier.userData.noOutline = true;                                       // open shells don't outline cleanly
        g.add(tier);
      });
      // goalposts (yellow) at each end
      for (const x of [-0.72, 0.72]) {
        const post = new Group(); post.position.set(x, 0.04, 0);
        const up = new Mesh(new CylinderGeometry(0.008, 0.008, 0.14, 6), toon('#ffd23f')); up.position.y = 0.07;
        const bar = new Mesh(new CylinderGeometry(0.007, 0.007, 0.16, 6), toon('#ffd23f')); bar.rotation.x = Math.PI / 2; bar.position.y = 0.14;
        const l = new Mesh(new CylinderGeometry(0.006, 0.006, 0.14, 6), toon('#ffd23f')); l.position.set(0, 0.21, -0.08);
        const r = l.clone(); r.position.z = 0.08;
        post.add(up, bar, l, r); g.add(post);
      }
      // the football, kicked end to end
      const ball = new Mesh(new SphereGeometry(0.045, 16, 10), toon('#8b4a2b')); ball.scale.set(1.5, 1, 1);
      g.add(ball);
      g.scale.setScalar(0.72);
      g.rotation.x = 0.5;                                                    // tip it toward the camera to show the field
      g.position.y = 0.3;
      add('uga', g, (t) => {
        const L = 2.6, u = (t % L) / L, dir = Math.floor(t / L) % 2 ? -1 : 1;
        ball.position.set(dir * (-0.62 + 1.24 * u), 0.08 + Math.sin(Math.PI * u) * 0.55, 0);
        ball.rotation.z = -dir * u * Math.PI * 3;
      }, true);
    }

    // ---------- Leidos: stop at the light, talk to it, go on green ----------
    {
      const g = new Group();
      const road = new Mesh(new BoxGeometry(3.2, 0.02, 0.62), new MeshBasicMaterial({ color: '#4a505c' })); road.position.y = 0.01;
      const line = new Mesh(new BoxGeometry(0.05, 0.022, 0.6), new MeshBasicMaterial({ color: '#f4f1e8' })); line.position.set(0.42, 0.012, 0);
      g.add(road, line);
      const light = new Group(); light.position.set(0.62, 0, -0.52);
      const pole = new Mesh(new CylinderGeometry(0.03, 0.03, 0.85, 10), toon('#a3a9b1')); pole.position.y = 0.42;
      const box = new Mesh(new RoundedBoxGeometry(0.22, 0.52, 0.18, 3, 0.05), toon('#2a2d35')); box.position.y = 1.05;
      light.add(pole, box);
      const lamps = ['#ff5d5d', '#ffc94d', '#5be38a'].map((c, i) => {
        const m = new MeshBasicMaterial({ color: '#4a4f5a' });
        const l = new Mesh(new SphereGeometry(0.055, 14, 10), m); l.position.set(0, 1.2 - i * 0.15, 0.085);
        light.add(l); return { m, c };
      });
      g.add(light);
      const { car, wheels } = toyCar(kit, '#3d8bfd');
      g.add(car);
      const carShadow = blob(0.75, 0.5); g.add(carShadow);
      // "talking": rings pulse out from the light and from the car's roof
      const rings = Array.from({ length: 4 }, () => {
        const m = new MeshBasicMaterial({ color: '#2fd0c0', transparent: true, depthWrite: false });
        const r = new Mesh(new RingGeometry(0.08, 0.1, 32), m); g.add(r); return { r, m };
      });
      const L = 4.8;
      add('leidos', g, (t, prev) => {
        const u = t % L;
        let x: number;
        if (u < 1.3) x = -1.6 + 1.82 * (1 - Math.pow(1 - u / 1.3, 2));          // brake to the line
        else if (u < 2.3) x = 0.22;
        else x = 0.22 + 2.2 * easeIn(seg(u, 2.3, 3.9));                        // pull away
        car.position.set(x, 0, 0.08);
        car.visible = u < 3.9;
        carShadow.position.set(x, 0.004, 0.08);
        carShadow.visible = car.visible;
        wheels.forEach((w) => (w.rotation.z = -x * 6));
        const on = u < 2.3 ? 0 : u < 3.9 ? 2 : 1;
        lamps.forEach(({ m, c }, i) => m.color.set(i === on ? c : '#4a4f5a'));
        rings.forEach(({ r, m }, i) => {
          const fromCar = i % 2 === 1, k = seg(u, 1.3 + i * 0.22, 1.3 + i * 0.22 + 0.7);
          r.visible = k > 0 && k < 1;
          r.position.copy(fromCar ? new Vector3(x - 0.03, 0.5, 0.08) : new Vector3(0.62, 1.32, -0.52));
          r.scale.setScalar(1 + k * 3);
          m.opacity = 0.9 * (1 - k);
          r.lookAt(r.position.clone().add(new Vector3(0, 0.3, 1)));
        });
        if (passed(prev, t, 2.3, L)) kit.sfx(sfx.bip);
      }, true);
    }

    // ---------- MSC Lab: run, crash, rewind, retry (stress testing) ----------
    {
      const g = new Group();
      // a glowing simulation grid instead of a real floor
      const grid = new GridHelper(2.6, 13, '#2fd0c0', '#2fd0c0');
      (grid.material as MeshBasicMaterial).transparent = true; (grid.material as MeshBasicMaterial).opacity = 0.35;
      grid.position.y = 0.002; grid.scale.z = 0.6;
      g.add(grid);
      const { car, body, wheels } = toyCar(kit);
      const lidar = new Mesh(new CylinderGeometry(0.06, 0.06, 0.06, 16), toon('#2fd0c0')); lidar.position.set(-0.03, 0.42, 0);
      body.add(lidar);
      car.scale.setScalar(1.25);
      g.add(car);
      const carShadow = blob(0.75, 0.5); g.add(carShadow);
      const cone = new Group();
      const cBase = new Mesh(new RoundedBoxGeometry(0.2, 0.025, 0.2, 2, 0.01), toon('#ff7a2f')); cBase.position.y = 0.012;
      const cTop = new Mesh(new ConeGeometry(0.08, 0.24, 18), toon('#ff7a2f')); cTop.position.y = 0.14;
      const cBand = new Mesh(new CylinderGeometry(0.047, 0.057, 0.04, 18), toon('#ffffff')); cBand.position.y = 0.14;
      cone.add(cBase, cTop, cBand); g.add(cone);
      // the "◀◀ rewind" badge and a run counter, drawn on little canvases
      const label = (w: number) => {
        const c = document.createElement('canvas'); c.width = w; c.height = 64;
        const tex = kit.own(new CanvasTexture(c)); tex.colorSpace = SRGBColorSpace;
        const m = new Mesh(new PlaneGeometry(w / 256, 0.25), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
        return { m, draw(text: string, color: string) { const x = c.getContext('2d')!; x.clearRect(0, 0, w, 64); x.fillStyle = color; x.font = '600 34px "IBM Plex Mono", ui-monospace, monospace'; x.textBaseline = 'middle'; x.fillText(text, 8, 34); tex.needsUpdate = true; } };
      };
      const rew = label(160); rew.draw('◀◀', '#2a2733'); rew.m.position.set(-0.85, 0.95, 0.2); g.add(rew.m);
      const counter = label(256); counter.m.position.set(0.55, 1.0, 0.2); g.add(counter.m);
      let shownRun = -1;
      const L = 4.6, laneZ = [0.0, 0.16, -0.14];
      add('lab', g, (t, prev) => {
        const run = Math.floor(t / L), u = t % L;
        if (run !== shownRun) { shownRun = run; counter.draw(`run ${String(1041 + run).padStart(4, '0')}`, '#6d6b64'); }
        const cz = laneZ[run % laneZ.length];
        let x: number, z = 0, tip = 0, jitter = 0;
        if (u < 1.5) { x = -1.05 + 1.15 * ease(seg(u, 0, 1.5)); }                    // try 1: bump the cone
        else if (u < 1.8) { x = 0.1; tip = seg(u, 1.5, 1.7); }
        else if (u < 2.5) { const k = seg(u, 1.8, 2.5); x = 0.1 - 1.15 * ease(k); tip = 1 - k; jitter = Math.sin(t * 90) * 0.02; }  // rewind
        else if (u < 4.2) { x = -1.05 + 2.2 * ease(seg(u, 2.5, 4.2)); z = Math.sin(Math.PI * seg(u, 2.9, 3.9)) * 0.3 * (cz > 0 ? -1 : 1); }  // retry: swerve past
        else { x = 1.15; }
        car.position.set(x + jitter, 0, z);
        car.rotation.y = u > 2.5 && u < 4.2 ? Math.sin(2 * Math.PI * seg(u, 2.9, 3.9)) * 0.35 * (cz > 0 ? 1 : -1) : 0;
        car.visible = u < 4.2;
        carShadow.position.set(car.position.x, 0.004, z); carShadow.visible = car.visible;
        wheels.forEach((w) => (w.rotation.z = -x * 7));
        lidar.rotation.y = t * 7;
        cone.position.set(0.42 + jitter, 0, u < 2.5 ? 0 : cz);
        cone.rotation.z = -tip * 1.25;
        rew.m.visible = u > 1.8 && u < 2.5 && Math.sin(t * 20) > -0.3;
        grid.position.x = jitter * 2;
        if (passed(prev, t, 1.5, L)) kit.sfx(sfx.clunk);
        if (passed(prev, t, 1.8, L)) kit.sfx(() => sfx.lower(0.6));
      }, true);
    }

    // ---------- Roblox: classic blocky avatar — waves, falls apart, respawns ----------
    {
      const g = new Group();
      const yellow = '#f5cd30', blue = '#0d69ac', green = '#a4bd47';
      const faceCanvas = document.createElement('canvas'); faceCanvas.width = faceCanvas.height = 64;
      const fc = faceCanvas.getContext('2d')!;
      fc.fillStyle = '#1b1b1b';
      fc.beginPath(); fc.ellipse(23, 26, 3.5, 6, 0, 0, Math.PI * 2); fc.fill();
      fc.beginPath(); fc.ellipse(41, 26, 3.5, 6, 0, 0, Math.PI * 2); fc.fill();
      fc.strokeStyle = '#1b1b1b'; fc.lineWidth = 3; fc.lineCap = 'round';
      fc.beginPath(); fc.arc(32, 32, 13, Math.PI * 0.2, Math.PI * 0.8); fc.stroke();
      const faceTex = kit.own(new CanvasTexture(faceCanvas)); faceTex.colorSpace = SRGBColorSpace;

      const head = new Group(); head.position.y = 1.17;
      head.add(new Mesh(new CylinderGeometry(0.16, 0.16, 0.28, 24), toon(yellow)));
      const face = new Mesh(new PlaneGeometry(0.22, 0.22), new MeshBasicMaterial({ map: faceTex, transparent: true }));
      face.position.z = 0.162; head.add(face);
      const torso = new Mesh(new RoundedBoxGeometry(0.46, 0.46, 0.23, 2, 0.02), toon(blue)); torso.position.y = 0.76;
      const leg = (x: number) => { const l = new Mesh(new RoundedBoxGeometry(0.22, 0.52, 0.22, 2, 0.02), toon(green)); l.position.set(x, 0.26, 0); return l; };
      const arm = (x: number) => {
        const p = new Group(); p.position.set(x, 0.97, 0);
        const a = new Mesh(new RoundedBoxGeometry(0.2, 0.46, 0.21, 2, 0.02), toon(yellow)); a.position.y = -0.22;
        p.add(a); return p;
      };
      const legL = leg(-0.115), legR = leg(0.115), armL = arm(-0.34), armR = arm(0.34);
      g.add(head, torso, legL, legR, armL, armR);
      g.scale.setScalar(0.92);
      // each part's home pose and the way it flies when the avatar breaks
      const parts = [
        { o: head, v: new Vector3(0.1, 1.4, 0.3), w: new Vector3(1.5, 0.5, 2), ground: 0.16 },
        { o: torso, v: new Vector3(-0.1, 0.6, 0.15), w: new Vector3(0.6, 0, -1.4), ground: 0.115 },
        { o: legL, v: new Vector3(-0.5, 0.4, 0.3), w: new Vector3(0, 0, 1.6), ground: 0.11 },
        { o: legR, v: new Vector3(0.5, 0.45, 0.1), w: new Vector3(0, 0, -1.6), ground: 0.11 },
        { o: armL, v: new Vector3(-0.9, 1.0, 0.2), w: new Vector3(0.4, 0, 2.2), ground: 0.1 },
        { o: armR, v: new Vector3(0.9, 1.1, -0.1), w: new Vector3(-0.3, 0, -2.4), ground: 0.1 },
      ].map((p) => ({ ...p, home: p.o.position.clone(), rot: p.o.rotation.clone() }));
      const L = 5.2, BREAK = 2.4, RESPAWN = 4.4;
      add('roblox', g, (t, prev) => {
        const u = t % L;
        if (u < BREAK || u >= RESPAWN) {
          const pop = u >= RESPAWN ? backOut(seg(u, RESPAWN, RESPAWN + 0.35)) : 1;
          for (const p of parts) { p.o.position.copy(p.home); p.o.rotation.copy(p.rot); p.o.scale.setScalar(Math.max(0.001, pop)); }
          armR.rotation.z = 2.5 + Math.sin(t * 7) * 0.35;                    // wave
          armL.rotation.z = -0.08;
          head.rotation.y = Math.sin(t * 1.3) * 0.2;
        } else {
          const k = u - BREAK;                                                  // seconds since it broke
          for (const p of parts) {
            const y = p.home.y + p.v.y * k - 4.5 * k * k;
            const tLand = (p.v.y + Math.sqrt(p.v.y ** 2 + 18 * (p.home.y - p.ground))) / 9;
            const kk = Math.min(k, tLand);
            p.o.position.set(p.home.x + p.v.x * kk, Math.max(p.ground, y), p.home.z + p.v.z * kk);
            p.o.rotation.set(p.rot.x + p.w.x * kk, p.rot.y + p.w.y * kk, p.rot.z + p.w.z * kk);
            p.o.scale.setScalar(1 - seg(u, RESPAWN - 0.35, RESPAWN));
          }
        }
        if (passed(prev, t, BREAK, L)) kit.sfx(sfx.clunk);
      });
    }

    // ---------- Abridge: a visit becomes a note ----------
    // A doctor and a patient talk (bubbles take turns), a phone between them
    // listens, then a note rises out of it, writes itself, and lands on the
    // doctor's clipboard.
    {
      const g = new Group();
      // the hospital, set back
      const H = new Group(); H.position.set(0, 0, -0.62); H.scale.setScalar(0.8);
      H.add(at(new Mesh(new RoundedBoxGeometry(1.5, 0.72, 0.4, 3, 0.04), toon('#f2f3f7')), 0, 0.36, 0));
      H.add(at(new Mesh(new RoundedBoxGeometry(1.56, 0.06, 0.45, 2, 0.02), toon('#c9ccd6')), 0, 0.74, 0));
      H.add(at(new Mesh(new RoundedBoxGeometry(0.24, 0.24, 0.06, 3, 0.04), toon('#ffffff')), 0, 0.9, 0));
      const red = new MeshBasicMaterial({ color: '#e5484d' });
      H.add(at(new Mesh(new BoxGeometry(0.16, 0.05, 0.01), red), 0, 0.9, 0.035));
      H.add(at(new Mesh(new BoxGeometry(0.05, 0.16, 0.01), red), 0, 0.9, 0.035));
      const win = new MeshBasicMaterial({ color: '#9fdcff' });
      for (const x of [-0.55, -0.35, 0.35, 0.55]) for (const y of [0.32, 0.54]) H.add(at(new Mesh(new PlaneGeometry(0.12, 0.12), win), x, y, 0.201));
      H.add(at(new Mesh(new PlaneGeometry(0.2, 0.3), new MeshBasicMaterial({ color: '#2fb5a6' })), 0, 0.15, 0.201));
      g.add(H);
      // two people (no faces): doctor in a white coat, patient in blue
      const person = (coat: string, x: number) => {
        const p = new Group(); p.position.set(x, 0, 0.12);
        const torso = new Mesh(new CapsuleGeometry(0.09, 0.16, 4, 12), toon(coat)); torso.position.y = 0.2;
        const head = new Mesh(new SphereGeometry(0.075, 16, 12), toon('#f1c9a5')); head.position.y = 0.42;
        p.add(torso, head); g.add(p);
        const sh = blob(0.3, 0.2); sh.position.set(x, 0.004, 0.12); g.add(sh);
        return p;
      };
      const doctor = person('#ffffff', -0.5), patient = person('#5b8def', 0.5);
      const clip = new Mesh(new RoundedBoxGeometry(0.13, 0.17, 0.015, 2, 0.01), toon('#a8774f')); clip.position.set(0.11, 0.24, 0.07); clip.rotation.y = 0.5;
      doctor.add(clip);
      // the phone, on a little table between them
      const table = new Mesh(new CylinderGeometry(0.1, 0.1, 0.02, 20), toon('#d3d5de')); table.position.set(0, 0.2, 0.15);
      const leg = new Mesh(new CylinderGeometry(0.015, 0.015, 0.2, 8), toon('#a3a9b1')); leg.position.set(0, 0.1, 0.15);
      const phone = new Mesh(new RoundedBoxGeometry(0.07, 0.012, 0.13, 2, 0.006), toon('#2a2d35')); phone.position.set(0, 0.217, 0.15);
      const screen = new MeshBasicMaterial({ color: '#7c6cf6' });
      const scr = new Mesh(new PlaneGeometry(0.055, 0.11), screen); scr.rotation.x = -Math.PI / 2; scr.position.set(0, 0.224, 0.15);
      g.add(table, leg, phone, scr);
      const rings = Array.from({ length: 2 }, () => {
        const m = new MeshBasicMaterial({ color: '#7c6cf6', transparent: true, depthWrite: false });
        const r = new Mesh(new RingGeometry(0.06, 0.072, 32), m); r.rotation.x = -Math.PI / 2; r.position.set(0, 0.23, 0.15); g.add(r); return { r, m };
      });
      // speech bubbles
      const bubble = (x: number) => {
        const b = new Group(); b.position.set(x, 0.66, 0.12);
        b.add(new Mesh(new RoundedBoxGeometry(0.26, 0.16, 0.05, 3, 0.06), toon('#ffffff')));
        [-0.06, 0, 0.06].forEach((dx) => { const d = new Mesh(new SphereGeometry(0.017, 8, 6), new MeshBasicMaterial({ color: '#6d6b64' })); d.position.set(dx, 0, 0.03); b.add(d); });
        g.add(b); return b;
      };
      const bDoc = bubble(-0.42), bPat = bubble(0.42);
      // the note
      const note = new Group();
      note.add(new Mesh(new RoundedBoxGeometry(0.2, 0.26, 0.012, 2, 0.01), toon('#ffffff')));
      const hdr = new Mesh(new PlaneGeometry(0.15, 0.03), new MeshBasicMaterial({ color: '#5b4bd6' })); hdr.position.set(0, 0.09, 0.007); note.add(hdr);
      const lines = [0.04, 0, -0.04, -0.08].map((y, i) => {
        const l = new Mesh(new PlaneGeometry(i === 3 ? 0.08 : 0.14, 0.014), new MeshBasicMaterial({ color: '#b8bbc8' }));
        l.position.set(0, y, 0.007); note.add(l); return l;
      });
      g.add(note);
      const L = 5.2;
      add('abridge', g, (t, prev) => {
        const u = t % L;
        // conversation: doctor, patient, doctor
        const talk = (b: Group, a: number) => b.scale.setScalar(Math.max(0.001, backOut(seg(u, a, a + 0.25)) * (1 - seg(u, a + 0.65, a + 0.8))));
        talk(bDoc, 0.1); talk(bPat, 0.9); bDoc.scale.multiplyScalar(u > 1.7 ? 0 : 1); if (u > 1.7) talk(bDoc, 1.7);
        doctor.rotation.z = Math.sin(t * 8) * 0.03 * (u < 2.5 ? 1 : 0);
        patient.rotation.z = -Math.sin(t * 7) * 0.03 * (u > 0.9 && u < 1.7 ? 1 : 0);
        // the phone listens while they talk
        const listening = u < 2.5;
        screen.color.set(listening ? '#7c6cf6' : '#b4abff');
        rings.forEach(({ r, m }, i) => { const k = ((t * 0.9 + i * 0.5) % 1); r.visible = listening; r.scale.setScalar(1 + k * 2); m.opacity = 0.8 * (1 - k); });
        // the note: rises from the phone, writes itself, flies to the clipboard
        const up = ease(seg(u, 2.6, 3.1)), fly = ease(seg(u, 3.9, 4.5));
        const from = new Vector3(0, 0.25, 0.15), mid = new Vector3(0, 0.72, 0.2), to = new Vector3(-0.39, 0.27, 0.2);
        note.position.lerpVectors(from, mid, up).lerp(to, fly);
        note.scale.setScalar(Math.max(0.001, seg(u, 2.6, 2.8) * (1 - 0.35 * fly) * (1 - seg(u, 4.9, 5.1))));
        note.rotation.set(0, 0.5 * fly, Math.sin(t * 3) * 0.05 * (1 - fly));
        lines.forEach((l, i) => (l.scale.x = Math.max(0.001, seg(u, 3.1 + i * 0.18, 3.3 + i * 0.18))));
        if (passed(prev, t, 2.6, L)) kit.sfx(sfx.pop);
        if (passed(prev, t, 4.5, L)) kit.sfx(sfx.plink);
      }, true);
    }

    return (t, prev) => {
      if (want !== current) {                           // swap scenes with a little pop
        if (current) models.get(current)!.g.visible = false;
        current = want; shownAt = t;
      }
      const m = models.get(current);
      shadow.visible = !!m && !m.fixed;
      if (!m) return;
      const k = seg(t, shownAt, shownAt + 0.45);
      m.g.visible = true;
      m.g.userData.base ??= m.g.scale.x;
      m.g.userData.y ??= m.g.position.y;
      m.g.scale.setScalar(m.g.userData.base * (0.55 + 0.45 * backOut(k)));
      // objects sway on a turntable; scenes with a "front" (fixed) sway less
      const sway = m.fixed ? 0.25 : 0.55;
      m.g.rotation.y = Math.sin(t * 0.7) * sway + (1 - k) * 1.2;
      m.g.position.y = m.g.userData.y + (m.fixed ? 0 : Math.sin(t * 2) * 0.03);
      shadow.scale.setScalar(0.9 - Math.sin(t * 2) * 0.05);
      m.tick(t, prev);
    };
  }, { lookAt: new Vector3(0, 0.62, 0), minSpan: 2.6, minHeight: 2.6, outline: 0.008 });

  if (!handle) return null;
  return Object.assign(handle, { show: (name: string) => { want = name; } });
}
