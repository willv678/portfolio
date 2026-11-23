// The avatar's voice: procedural "babble" speech. Instead of recorded clips,
// every letter is a tiny synthesized syllable: a buzzy tone shaped by two
// band-pass filters tuned like the resonances of a mouth saying a vowel
// (formants), with a little random pitch jitter so no two sound alike.
// Punctuation sets the rhythm: spaces and commas pause, sentence ends pause
// longer, and the last syllables before "?" rise. Costs nothing to load.

import { audioOut } from './sound';
import { OPTIONS, heightScale, buildScale, type Avatar } from './avatar';

// formant pairs (Hz) for five vowel shapes
const VOWELS: [number, number][] = [[800, 1200], [500, 1900], [320, 2300], [520, 900], [360, 800]];
const VOWEL_OF: Record<string, number> = { a: 0, e: 1, i: 2, o: 3, u: 4, y: 2 };

/** Speaking pitch for an avatar: m lower, f higher; taller and broader a bit lower. */
export function voiceFor(a: Avatar) {
  const base = OPTIONS.body[a.body] === 'f' ? 245 : 155;
  return base / Math.pow(heightScale(a), 1.4) / Math.pow(buildScale(a), 0.5);
}

function syllable(ctx: AudioContext, pitch: number, ch: string, loud: boolean) {
  const t = ctx.currentTime;
  const lower = ch.toLowerCase();
  // vowels get their own shape; consonants borrow one by letter, and are shorter
  const isVowel = lower in VOWEL_OF;
  const [f1, f2] = VOWELS[isVowel ? VOWEL_OF[lower] : lower.charCodeAt(0) % VOWELS.length];
  const dur = isVowel ? 0.07 : 0.05;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(pitch, t);
  o.frequency.linearRampToValueAtTime(pitch * (0.96 + Math.random() * 0.06), t + dur);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(loud ? 0.07 : 0.05, t + 0.006);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const [f, q] of [[f1, 6], [f2, 9]] as const) {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    o.connect(bp).connect(out);
  }
  out.connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

/**
 * Type `text` out one character at a time, babbling along (if sound is on).
 * `onType(shown)` gets the visible text so far. Returns a cancel function.
 */
export function speak(text: string, a: Avatar, onType: (shown: string) => void, onDone?: () => void) {
  const pitch = voiceFor(a);
  let i = 0, timer = 0, cancelled = false;
  const qStart = text.lastIndexOf('?') >= 0 ? text.lastIndexOf('?') - 5 : Infinity;   // rise into a question
  const loud = text.includes('!');
  const step = () => {
    if (cancelled) return;
    if (i >= text.length) { onDone?.(); return; }
    const ch = text[i++];
    onType(text.slice(0, i));
    const ctx = audioOut();
    if (ctx && /[a-z0-9]/i.test(ch)) {
      const rise = i > qStart ? 1 + (i - qStart) * 0.06 : 1;
      const jitter = 0.9 + Math.random() * 0.22;
      syllable(ctx, pitch * jitter * rise, ch, loud);
    }
    const wait = ch === ' ' ? 55 : ch === ',' ? 170 : /[.!?…]/.test(ch) ? 260 : 42;
    timer = window.setTimeout(step, wait);
  };
  step();
  return () => { cancelled = true; clearTimeout(timer); };
}
