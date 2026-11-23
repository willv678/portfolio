// Tiny UI sounds, synthesized (no audio files).
//
// Browsers only allow audio after a click, tap or key press; hovering doesn't
// count. So sound is "on" by default and the first gesture anywhere unlocks it.
// The speaker button mutes it, and the choice is remembered.

let ctx: AudioContext | undefined;
let unlocked = false;
let on = true;
try { on = localStorage.getItem('muted') !== '1'; } catch {}

function unlock() {
  if (unlocked) return;
  unlocked = true;
  ctx ??= new AudioContext();
  ctx.resume();
}
addEventListener('pointerdown', unlock, { capture: true });
addEventListener('keydown', unlock, { capture: true });

export function blip(freq = 880, dur = 0.05, vol = 0.035) {
  if (!on || !unlocked || !ctx || ctx.state !== 'running') return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 1.25, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur);
}

// Clicking into something: a higher, slightly longer tick.
export function openSound() { blip(1200, 0.08); }

function paint(btn: HTMLElement) {
  btn.setAttribute('aria-pressed', String(on));
  btn.title = `Sound ${on ? 'on' : 'off'}`;
  btn.querySelector('.wave')?.setAttribute('opacity', on ? '1' : '.25');
}

export function initSoundButton() {
  const btn = document.getElementById('snd');
  if (!btn) return;
  paint(btn);
  btn.addEventListener('click', () => {
    on = !on;
    try { localStorage.setItem('muted', on ? '0' : '1'); } catch {}
    paint(btn);
    blip(990, 0.06);
  });
}

// Any element with [data-blip] gets the hover tick.
export function initHoverBlips() {
  document.addEventListener('pointerover', (e) => {
    if (document.documentElement.classList.contains('kbd')) return;
    const el = (e.target as Element).closest('[data-blip]');
    const from = (e.relatedTarget as Element | null)?.closest?.('[data-blip]');
    if (el && el !== from) blip(Number((el as HTMLElement).dataset.blip) || 880);
  });
}

// ---------- scene sound effects ----------
// Same rules as the blips: off until the first click/key, respects mute.
// Deliberately quiet; nothing here should be noticeable over music.
function tone(f0: number, f1: number, dur: number, { type = 'sine' as OscillatorType, vol = 0.02, delay = 0 } = {}) {
  if (!on || !unlocked || !ctx || ctx.state !== 'running') return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + delay;
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  /** tractor beam switching on: a soft rising hum */
  beam: () => tone(170, 380, 0.5, { type: 'triangle', vol: 0.012 }),
  /** something small getting picked up */
  bloop: () => tone(480, 980, 0.11, { vol: 0.022 }),
  /** something arriving: three quick rising notes */
  chime: () => { tone(1319, 1319, 0.08, { vol: 0.014 }); tone(1760, 1760, 0.08, { vol: 0.012, delay: 0.07 }); tone(2093, 2093, 0.12, { vol: 0.01, delay: 0.14 }); },
  /** approved */
  ding: () => { tone(880, 880, 0.07, { vol: 0.016 }); tone(1319, 1319, 0.11, { vol: 0.014, delay: 0.07 }); },
  /** rejected */
  buzz: () => tone(260, 130, 0.2, { type: 'square', vol: 0.006 }),
  /** little toy-car horn */
  beep: () => { tone(660, 660, 0.05, { type: 'square', vol: 0.005 }); tone(660, 660, 0.05, { type: 'square', vol: 0.005, delay: 0.09 }); },
};
