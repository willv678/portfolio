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
// Some visits are allowed sound right away (Chrome, for one, may allow it
// after you've already clicked around this site). Check once on load; if the
// browser says no, wait for the first gesture as usual.
try {
  const probe = new AudioContext();
  if (probe.state === 'running') { ctx = probe; unlocked = true; } else probe.close();
} catch {}
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

// A wobbly hum that slides from f0 to f1: the tractor beam "pulling".
function warble(f0: number, f1: number, dur: number, vol = 0.014) {
  if (!on || !unlocked || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
  out.gain.linearRampToValueAtTime(vol * 0.8, t + dur * 0.85);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  out.connect(ctx.destination);
  // the vibrate: an LFO wobbling the pitch, getting faster as it pulls
  const lfo = ctx.createOscillator(), depth = ctx.createGain();
  lfo.frequency.setValueAtTime(7, t); lfo.frequency.linearRampToValueAtTime(13, t + dur);
  depth.gain.value = f0 * 0.06;
  lfo.connect(depth);
  for (const [mult, type, g] of [[1, 'sine', 1], [2, 'triangle', 0.25]] as const) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = type; og.gain.value = g;
    o.frequency.setValueAtTime(f0 * mult, t);
    o.frequency.exponentialRampToValueAtTime(f1 * mult, t + dur);
    depth.connect(o.frequency);
    o.connect(og).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  }
  lfo.start(t); lfo.stop(t + dur + 0.05);
}

// A short burst of filtered noise: fizzles and clunks.
let noiseBuf: AudioBuffer | undefined;
function noise(dur: number, from: number, to: number, vol = 0.01) {
  if (!on || !unlocked || !ctx || ctx.state !== 'running') return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime, src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf;
  bp.type = 'bandpass'; bp.Q.value = 2;
  bp.frequency.setValueAtTime(from, t); bp.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(ctx.destination);
  src.start(t); src.stop(t + dur);
}

// Recorded clips (everything else here is synthesized). The bytes can be
// fetched ahead of time (preloadClip); decoding needs the audio context, so it
// happens on first play, which for a clip this small is instant.
const bytes = new Map<string, Promise<ArrayBuffer | null>>();
const decoded = new Map<string, Promise<AudioBuffer | null>>();
export function preloadClip(url: string) {
  if (!bytes.has(url)) bytes.set(url, fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null));
}
function clip(url: string, vol: number) {
  if (!on || !unlocked || !ctx || ctx.state !== 'running') return;
  const c = ctx;
  preloadClip(url);
  if (!decoded.has(url)) decoded.set(url, bytes.get(url)!.then((b) => (b ? c.decodeAudioData(b.slice(0)) : null)).catch(() => null));
  decoded.get(url)!.then((buf) => {
    if (!buf || !on) return;
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; g.gain.value = vol;
    src.connect(g).connect(c.destination); src.start();
  });
}

export const sfx = {
  /** the Roblox "oof", when the blocky avatar falls apart */
  oof: () => clip('/sfx/oof.mp3', 0.56),
  /** tractor beam sucking something up: a wobbly hum rising in pitch */
  pull: (dur = 1.0) => warble(150, 360, dur),
  /** ...and lowering it down */
  lower: (dur = 1.0) => warble(340, 150, dur),
  /** the UFO catching the save: a soft pop */
  pop: () => { tone(620, 180, 0.07, { vol: 0.03 }); noise(0.03, 3000, 1500, 0.006); },
  /** something arriving: one soft plink */
  plink: () => { tone(1568, 1568, 0.18, { vol: 0.016 }); tone(3136, 3136, 0.1, { vol: 0.004 }); },
  /** approved */
  ding: () => { tone(880, 880, 0.07, { vol: 0.016 }); tone(1319, 1319, 0.11, { vol: 0.014, delay: 0.07 }); },
  /** rejected: a little "nuh-uh" plus a fizzle */
  nuhuh: () => { tone(440, 420, 0.09, { type: 'triangle', vol: 0.016 }); tone(330, 300, 0.12, { type: 'triangle', vol: 0.016, delay: 0.12 }); noise(0.28, 4000, 600, 0.008); },
  /** little toy-car horn */
  beep: () => { tone(660, 660, 0.05, { type: 'square', vol: 0.005 }); tone(660, 660, 0.05, { type: 'square', vol: 0.005, delay: 0.09 }); },
  /** blocks falling apart */
  clunk: () => { tone(170, 70, 0.14, { type: 'triangle', vol: 0.02 }); noise(0.08, 900, 300, 0.008); },
  /** tires squealing around an obstacle: a high, wobbling scrape */
  screech: () => { noise(0.42, 3400, 2200, 0.009); tone(1900, 1500, 0.38, { type: 'sawtooth', vol: 0.0025 }); },
  /** a little footstep (alternating feet are pitched apart): pit, pat */
  step: (foot = 0) => { tone(foot ? 520 : 440, foot ? 360 : 300, 0.06, { type: 'triangle', vol: 0.06 }); noise(0.03, 2400, 1200, 0.012); },
  /** signal light turning green */
  bip: () => tone(1046, 1046, 0.06, { vol: 0.01 }),
};

/** The audio context, if sound is on and unlocked (for the avatar voice). */
export function audioOut(): AudioContext | null {
  return on && unlocked && ctx && ctx.state === 'running' ? ctx : null;
}
