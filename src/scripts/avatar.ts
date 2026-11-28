// Visitor avatars: an original cartoon toy-figure style (big head, small
// two-tone body, round hands). This file has no three.js: options, storage
// (this browser only), and flat SVG drawings for the editor and the top-bar
// button. The 3D version lives in src/scenes/avatar.ts and mirrors these parts.

export const OPTIONS = {
  skin: ['#f6d7c3', '#f1c9a5', '#d9a47a', '#b97b53', '#8d5a3b', '#5e3b27'],
  head: ['round', 'oval', 'square'],
  hair: ['wavy', 'shaggy', 'spiky', 'long', 'curly', 'parted', 'bob', 'buzz'],
  hairColor: ['#2a2320', '#3d2a1e', '#6b4428', '#a0673a', '#e0b25a', '#b5522e', '#9aa0a8'],
  eyes: ['big', 'dots', 'happy', 'sleepy', 'wink', 'lashes'],
  glasses: ['none', 'round', 'square'],
  makeup: ['none', 'blush', 'lipstick', 'both'],
  shirt: ['#5b8def', '#e2463c', '#4caf6a', '#7c6cf6', '#f0a020', '#2b2a30'],
  body: ['m', 'f'],
  height: ['shorter', 'short', 'medium', 'tall', 'taller'],
  build: ['slimmer', 'slim', 'medium', 'broad', 'broader'],
} as const;

export type Part = keyof typeof OPTIONS;
export type Avatar = Record<Part, number>;
export const PARTS = Object.keys(OPTIONS) as Part[];

// The default is Will: fair skin, wavy brown hair, happy eyes, blue top.
export const DEFAULT: Avatar = {
  skin: 1, head: 0, hair: 0, hairColor: 2, eyes: 2, glasses: 0, makeup: 0, shirt: 0, body: 0, height: 3, build: 1,
};

/** True when the avatar is Will's own (the default). */
export const isWill = (a: Avatar | null) => !a || PARTS.every((p) => a[p] === DEFAULT[p]);

/** Height / build as scale factors (index 2 = 1.0). */
export const heightScale = (a: Avatar) => 0.85 + a.height * 0.075;
export const buildScale = (a: Avatar) => 0.84 + a.build * 0.08;

const KEY = 'avatar';
export const clean = (a: Partial<Avatar>): Avatar =>
  Object.fromEntries(PARTS.map((p) => {
    const v = Number(a[p]);
    return [p, Number.isInteger(v) && v >= 0 && v < OPTIONS[p].length ? v : DEFAULT[p]];
  })) as Avatar;

/** The visitor's saved avatar, or null if they haven't made one. */
export function load(): Avatar | null {
  try { const v = localStorage.getItem(KEY); return v ? clean(JSON.parse(v)) : null; } catch { return null; }
}
export function save(a: Avatar) {
  try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {}
  dispatchEvent(new CustomEvent('avatar-change', { detail: a }));
}
export function clear() {
  try { localStorage.removeItem(KEY); } catch {}
  dispatchEvent(new CustomEvent('avatar-change', { detail: null }));
}

// ---------- SVG drawing (viewBox 100 × 120; head centered at 50,40) ----------
const INK = '#2b2838';
const st = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;

// Curly hair (Will's design): a smooth dome on top, sharp zigzag teeth down
// the sides and along the hem, and a jagged fringe stepping up across the forehead.
const CURLY_BACK = 'M24 40 Q24 12 50 12 Q76 12 76 40 L84 49 L78 56 L85 64 L78 72 L85 80 L78 88 L82 96 L72 92 L64 99 L56 92 L50 99 L44 92 L36 99 L28 92 L18 96 L22 88 L15 80 L22 72 L15 64 L22 56 L16 49 Z';
const CURLY_FRONT = 'M24 48 Q21 13 50 12 Q79 13 76 48 L74 36 L69 29 L64 21 L61 15 L56 23 L48 26 L44 32 L36 34 L31 42 Z';

function hairBack(a: Avatar) {
  const c = OPTIONS.hairColor[a.hairColor];
  switch (OPTIONS.hair[a.hair]) {
    case 'long': return `<path d="M24 34 Q17 66 21 92 Q28 98 36 92 Q33 70 36 50 Z M76 34 Q83 66 79 92 Q72 98 64 92 Q67 70 64 50 Z" fill="${c}" ${st}/>`;
    case 'curly': return `<path d="${CURLY_BACK}" fill="${c}" ${st}/>`;
    // center part: the length behind the head, ending in jagged points below the jaw
    case 'parted': return `<path d="M24 40 Q24 14 50 13 Q76 14 76 40 L79 62 L75 68 L80 74 L72 80 L66 70 L34 70 L28 80 L20 74 L25 68 L21 62 Z" fill="${c}" ${st}/>`;
    // bob: one blunt length to the jaw, all the way round
    case 'bob': return `<path d="M26 40 H74 L77 64 Q77 71 70 71 H30 Q23 71 23 64 Z" fill="${c}" ${st}/>`;
    default: return '';
  }
}
function hairFront(a: Avatar) {
  const c = OPTIONS.hairColor[a.hairColor];
  switch (OPTIONS.hair[a.hair]) {
    case 'wavy': return `<path d="M24 46 Q18 31 26 22 Q29 9 42 10 Q50 4 59 9 Q72 8 75 21 Q82 31 76 46 Q73 36 67 34 Q64 40 57 35 Q51 41 45 35 Q39 40 34 34 Q28 36 24 46 Z" fill="${c}" ${st}/><path d="M33 18 Q38 14 43 18 M55 15 Q61 12 66 17" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".45"/>`;
    // shaggy (Will's design): a full top, a fringe swept to one side with a notch, and notched sides down to the ears
    case 'shaggy': return `<path d="M25 50 L22 45 L25 42 L21 37 Q20 13 50 12 Q80 13 79 37 L75 42 L78 45 L75 50 L73 37 Q68 30 60 31 L62 25 L54 29 Q42 31 31 28 L28 36 Z" fill="${c}" ${st}/>`;
    case 'long': return `<path d="M24 46 Q21 14 50 13 Q79 14 76 46 Q72 30 60 27 Q46 35 30 34 Q26 38 24 46 Z" fill="${c}" ${st}/>`;
    case 'curly': return `<path d="${CURLY_FRONT}" fill="${c}" ${st}/>`;
    // center part (Will's design): a pointed crown, the hair parting in an arch over the face and falling down both sides
    case 'parted': return `<path d="M30 72 Q26 46 28 38 Q32 20 50 16 Q68 20 72 38 Q74 46 70 72 L76 66 L74 58 L78 52 L77 34 Q74 16 61 11 L58 4 L54 10 L50 3 L46 10 L42 4 L39 11 Q26 16 23 34 L22 52 L26 58 L24 66 Z" fill="${c}" ${st}/>`;
    // spiky (Will's design): a crown of points and a zigzag fringe
    case 'spiky': return `<path d="M25 46 L23 30 L29 23 L27 16 L37 16 L41 8 L50 13 L59 7 L63 15 L72 15 L71 22 L77 29 L75 46 L72 31 L67 34 L63 26 L58 33 L54 25 L49 32 L44 25 L40 31 L34 27 L29 34 Z" fill="${c}" ${st}/>`;
    // bob: a straight fringe, the sides falling in front of the cheeks and turning in at the ends
    case 'bob': return `<path d="M22 64 Q19 12 50 11 Q81 12 78 64 Q78 71 71 69 Q75 46 70 32 Q50 37 30 32 Q25 46 29 69 Q22 71 22 64 Z" fill="${c}" ${st}/>`;
    // buzz: a close crop with square temples
    case 'buzz': return `<path d="M25 39 Q23 14 50 13.5 Q77 14 75 39 L71 31 Q50 24 29 31 Z" fill="${c}" ${st}/>`;
    default: return '';
  }
}
function face(a: Avatar) {
  const eyes = {
    big: `<ellipse cx="42" cy="43" rx="3.6" ry="5.4" fill="${INK}"/><ellipse cx="58" cy="43" rx="3.6" ry="5.4" fill="${INK}"/><circle cx="43.2" cy="40.8" r="1.4" fill="#fff"/><circle cx="59.2" cy="40.8" r="1.4" fill="#fff"/>`,
    dots: `<circle cx="42" cy="43" r="2.8" fill="${INK}"/><circle cx="58" cy="43" r="2.8" fill="${INK}"/>`,
    happy: `<path d="M37 45 Q42 38 47 45 M53 45 Q58 38 63 45" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    sleepy: `<path d="M37 43 Q42 47 47 43 M53 43 Q58 47 63 43" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    lashes: `<ellipse cx="42" cy="43" rx="3.6" ry="5.4" fill="${INK}"/><ellipse cx="58" cy="43" rx="3.6" ry="5.4" fill="${INK}"/><circle cx="43.2" cy="40.8" r="1.4" fill="#fff"/><circle cx="59.2" cy="40.8" r="1.4" fill="#fff"/><path d="M39 40 L35.5 37.5 M40 38.3 L37.8 35 M61 40 L64.5 37.5 M60 38.3 L62.2 35" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
    wink: `<ellipse cx="42" cy="43" rx="3.6" ry="5.4" fill="${INK}"/><circle cx="43.2" cy="40.8" r="1.4" fill="#fff"/><path d="M53 45 Q58 38 63 45" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  }[OPTIONS.eyes[a.eyes]];
  const mk = OPTIONS.makeup[a.makeup];
  const blush = mk === 'blush' || mk === 'both' ? `<ellipse cx="35" cy="50" rx="5" ry="2.8" fill="#ff8fa3" opacity=".55"/><ellipse cx="65" cy="50" rx="5" ry="2.8" fill="#ff8fa3" opacity=".55"/>` : '';
  const lips = mk === 'lipstick' || mk === 'both';
  const brows = `<path d="M37 34 Q42 31 46 33 M54 33 Q58 31 63 34" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>`;
  const mouth = `<path d="M45 52 Q50 56.5 55 52" fill="none" stroke="${lips ? '#d6334d' : INK}" stroke-width="${lips ? 3.4 : 2.4}" stroke-linecap="round"/>`;
  const glasses = {
    none: '',
    round: `<g fill="none" stroke="${INK}" stroke-width="2"><circle cx="42" cy="43" r="7"/><circle cx="58" cy="43" r="7"/><path d="M49 43 H51 M35 42 L27 40 M65 42 L73 40"/></g>`,
    square: `<g fill="none" stroke="${INK}" stroke-width="2"><rect x="34" y="37" width="15" height="12" rx="3"/><rect x="51" y="37" width="15" height="12" rx="3"/><path d="M49 42 H51 M34 41 L27 40 M66 41 L73 40"/></g>`,
  }[OPTIONS.glasses[a.glasses]];
  return blush + brows + eyes + mouth + glasses;
}
function head(a: Avatar) {
  const skin = OPTIONS.skin[a.skin];
  switch (OPTIONS.head[a.head]) {
    case 'oval': return `<ellipse cx="50" cy="40" rx="22" ry="26" fill="${skin}" ${st}/>`;
    case 'square': return `<rect x="27" y="16" width="46" height="46" rx="15" fill="${skin}" ${st}/>`;
    default: return `<circle cx="50" cy="40" r="25" fill="${skin}" ${st}/>`;
  }
}
function body(a: Avatar) {
  const skin = OPTIONS.skin[a.skin], shirt = OPTIONS.shirt[a.shirt], pants = '#2b2a30';
  const torso = OPTIONS.body[a.body] === 'f'
    ? `<path d="M38 92 H62 L70 116 Q50 120 30 116 Z" fill="${pants}" ${st}/><rect x="36" y="68" width="28" height="30" rx="12" fill="${shirt}" ${st}/>`
    : `<rect x="38" y="94" width="10" height="22" rx="5" fill="${pants}" ${st}/><rect x="52" y="94" width="10" height="22" rx="5" fill="${pants}" ${st}/><rect x="33" y="68" width="34" height="32" rx="14" fill="${shirt}" ${st}/>`;
  const arms = `<path d="M33 76 L22 96 M67 76 L78 96" stroke="${shirt}" stroke-width="9" stroke-linecap="round"/><circle cx="21" cy="98" r="5.5" fill="${skin}" ${st}/><circle cx="79" cy="98" r="5.5" fill="${skin}" ${st}/>`;
  // height stretches the body down from the neck; build widens it
  const h = heightScale(a), b = buildScale(a);
  return `<g transform="translate(50 66) scale(${b} ${h}) translate(-50 -66)">${arms}${torso}</g>`;
}

/** Front-view SVG. `headOnly` crops to the head (for the button and part tiles). */
export function svg(a: Avatar, headOnly = false) {
  const vb = headOnly ? '14 2 72 72' : '0 -4 100 130';
  const hb = OPTIONS.hair[a.hair] === 'long' && headOnly ? hairBack(a).replace('Q17 66 21 92', 'Q17 60 21 74').replace('Q83 66 79 92', 'Q83 60 79 74') : hairBack(a);
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${hb}${headOnly ? '' : body(a)}${head(a)}${hairFront(a)}${face(a)}</svg>`;
}
