// The little 3D scene beside the active timeline entry, like a 3DS icon
// preview. One stage, one tiny looping scene per entry; show(name) swaps
// them with a pop.
//   abridge → a hospital; a speech bubble floats out and turns into a note
//   lab     → the lidar test car, with the agent's drone circling and scanning it
//   roblox  → a classic blocky avatar: waves, falls to pieces, respawns
//   leidos  → a car stops at a red light, they talk (V2X), it goes on green
//   uga     → a graduation cap with a swinging tassel

import {
  BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial,
  PlaneGeometry, RingGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createStage, seg, ease, easeIn, passed, type SceneHandle, type Kit } from './kit';
import { sfx } from '../scripts/sound';

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

    // ---------- UGA: graduation cap ----------
    {
      const g = new Group();
      const skull = new Mesh(new CylinderGeometry(0.34, 0.37, 0.26, 32), toon('#2a2a30')); skull.position.y = 0.13;
      const board = new Mesh(new RoundedBoxGeometry(1.0, 0.05, 1.0, 2, 0.015), toon('#33333a')); board.position.y = 0.28; board.rotation.y = Math.PI / 4;
      const button = new Mesh(new SphereGeometry(0.045, 12, 8), toon('#ba0c2f')); button.position.y = 0.31;
      const tassel = new Group(); tassel.position.set(0.68, 0.3, 0);
      const cord = new Mesh(new CylinderGeometry(0.012, 0.012, 0.3, 6), toon('#ba0c2f')); cord.position.y = -0.15;
      const end = new Mesh(new CylinderGeometry(0.03, 0.05, 0.13, 10), toon('#ba0c2f')); end.position.y = -0.33;
      tassel.add(cord, end);
      g.add(skull, board, button, tassel);
      g.position.y = 0.25;
      add('uga', g, (t) => { tassel.rotation.z = Math.sin(t * 3) * 0.18; tassel.rotation.x = Math.cos(t * 2.3) * 0.1; });
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

    // ---------- MSC Lab: the test car, with the agent's drone scanning it ----------
    {
      const g = new Group();
      const { car, body, wheels } = toyCar(kit);
      const lidar = new Mesh(new CylinderGeometry(0.06, 0.06, 0.06, 16), toon('#2fd0c0')); lidar.position.set(-0.03, 0.42, 0);
      body.add(lidar);
      car.scale.setScalar(1.5); car.position.y = 0;
      g.add(car);
      const drone = new Group();
      const dBody = new Mesh(new SphereGeometry(0.13, 20, 14), toon('#eef3f7')); dBody.scale.y = 0.55;
      const dRim = new Mesh(new TorusGeometry(0.13, 0.018, 8, 28), toon('#2f7d5b')); dRim.rotation.x = Math.PI / 2;
      const prop = new Mesh(new BoxGeometry(0.34, 0.01, 0.035), toon('#c9d3da')); prop.position.y = 0.1;
      const led = new MeshBasicMaterial({ color: '#5be38a' });
      const ledM = new Mesh(new SphereGeometry(0.02, 8, 6), led); ledM.position.set(0, 0, 0.125);
      drone.add(dBody, dRim, prop, ledM);
      g.add(drone);
      const scanMat = new MeshBasicMaterial({ color: '#5be38a', transparent: true, opacity: 0.18, depthWrite: false });
      const scanGeo = new ConeGeometry(0.32, 1, 24, 1, true); scanGeo.translate(0, -0.5, 0);
      const scan = new Mesh(scanGeo, scanMat); g.add(scan);
      add('lab', g, (t) => {
        lidar.rotation.y = t * 7;
        body.position.y = Math.abs(Math.sin(t * 16)) * 0.006;
        wheels.forEach((w) => (w.rotation.z = -t * 6));
        const a = t * 1.1;
        drone.position.set(Math.cos(a) * 0.75, 1.12 + Math.sin(t * 2.6) * 0.04, Math.sin(a) * 0.45);
        drone.rotation.set(0, -a + Math.PI / 2, 0.15);
        prop.rotation.y = t * 30;
        // scans for a beat, then the LED flicks green/amber like it's judging
        const scanning = Math.sin(t * 1.4) > 0.2;
        scan.visible = scanning;
        scan.position.copy(drone.position).y -= 0.05;
        scan.scale.set(1, drone.position.y - 0.25, 1);
        led.color.set(scanning ? '#5be38a' : '#ffc94d');
      });
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

    // ---------- Abridge: a conversation becomes a note ----------
    {
      const g = new Group();
      const bldg = new Mesh(new RoundedBoxGeometry(0.9, 0.72, 0.55, 3, 0.04), toon('#f2f3f7')); bldg.position.set(-0.32, 0.36, -0.15);
      const roof = new Mesh(new RoundedBoxGeometry(0.96, 0.06, 0.6, 2, 0.02), toon('#c9ccd6')); roof.position.set(-0.32, 0.74, -0.15);
      const sign = new Mesh(new RoundedBoxGeometry(0.24, 0.24, 0.06, 3, 0.04), toon('#ffffff')); sign.position.set(-0.32, 0.9, -0.15);
      const red = new MeshBasicMaterial({ color: '#e5484d' });
      const crossA = new Mesh(new BoxGeometry(0.16, 0.05, 0.01), red), crossB = new Mesh(new BoxGeometry(0.05, 0.16, 0.01), red);
      crossA.position.set(-0.32, 0.9, -0.115); crossB.position.copy(crossA.position);
      const win = new MeshBasicMaterial({ color: '#9fdcff' });
      for (const [x, y] of [[-0.6, 0.52], [-0.42, 0.52], [-0.22, 0.52], [-0.04, 0.52], [-0.6, 0.3], [-0.04, 0.3]]) {
        const w = new Mesh(new PlaneGeometry(0.11, 0.11), win); w.position.set(x, y, 0.131); g.add(w);
      }
      const door = new Mesh(new PlaneGeometry(0.16, 0.24), new MeshBasicMaterial({ color: '#2fb5a6' })); door.position.set(-0.32, 0.12, 0.131);
      g.add(bldg, roof, sign, crossA, crossB, door);
      // the bubble (front) and the note it turns into (back): one card that flips
      const card = new Group();
      const bubble = new Group();
      bubble.add(new Mesh(new RoundedBoxGeometry(0.5, 0.32, 0.08, 3, 0.1), toon('#ffffff')));
      const tail = new Mesh(new ConeGeometry(0.05, 0.12, 4), toon('#ffffff')); tail.position.set(-0.14, -0.18, 0); tail.rotation.z = Math.PI + 0.4;
      bubble.add(tail);
      const dots = [-0.11, 0, 0.11].map((x) => { const d = new Mesh(new SphereGeometry(0.032, 12, 8), new MeshBasicMaterial({ color: '#5b4bd6' })); d.position.set(x, 0, 0.045); bubble.add(d); return d; });
      const note = new Group();
      note.add(new Mesh(new RoundedBoxGeometry(0.34, 0.44, 0.03, 2, 0.02), toon('#ffffff')));
      const header = new Mesh(new PlaneGeometry(0.26, 0.05), new MeshBasicMaterial({ color: '#5b4bd6' })); header.position.set(0, 0.15, 0.017); note.add(header);
      for (let i = 0; i < 4; i++) {
        const l = new Mesh(new PlaneGeometry(i === 3 ? 0.14 : 0.24, 0.025), new MeshBasicMaterial({ color: '#c3c6d2' }));
        l.position.set(i === 3 ? -0.05 : 0, 0.06 - i * 0.07, 0.017); note.add(l);
      }
      note.rotation.y = Math.PI;                                              // on the back of the card
      card.add(bubble, note);
      g.add(card);
      // a little stack of finished notes on the right
      for (let i = 0; i < 2; i++) {
        const n = new Mesh(new RoundedBoxGeometry(0.34, 0.025, 0.44, 2, 0.01), toon('#ffffff'));
        n.position.set(0.62, 0.013 + i * 0.028, 0.05); n.rotation.y = 0.15 - i * 0.1; g.add(n);
      }
      const L = 4.4;
      add('abridge', g, (t, prev) => {
        const u = t % L;
        const rise = ease(seg(u, 0, 1.2)), flip = ease(seg(u, 1.4, 1.85)), fly = ease(seg(u, 2.0, 2.9));
        const start = new Vector3(-0.32, 0.25, 0.25), top = new Vector3(0.05, 1.05, 0.25), stack = new Vector3(0.62, 0.11, 0.05);
        card.position.lerpVectors(start, top, rise).lerp(stack, fly);
        card.scale.setScalar(Math.max(0.001, seg(u, 0, 0.3) * (1 - seg(u, 3.4, 3.6))));
        card.rotation.set(-Math.PI / 2 * fly, Math.PI * flip, 0);                 // flip to the note, then lay it flat
        dots.forEach((d, i) => (d.position.y = Math.max(0, Math.sin(t * 7 - i * 0.9)) * 0.04));
        if (passed(prev, t, 2.9, L)) kit.sfx(sfx.plink);
      });
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
