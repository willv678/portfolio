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
