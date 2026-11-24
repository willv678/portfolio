// Visitor avatars: an original cartoon toy-figure style (big head, small
// two-tone body, round hands). This file has no three.js: options, storage
// (this browser only), and flat SVG drawings for the editor and the top-bar
// button. The 3D version lives in src/scenes/avatar.ts and mirrors these parts.

export const OPTIONS = {
  skin: ['#f6d7c3', '#f1c9a5', '#d9a47a', '#b97b53', '#8d5a3b', '#5e3b27'],
  head: ['round', 'oval', 'square'],
  hair: ['wavy', 'short', 'buzz', 'long', 'curly', 'ponytail'],
  hairColor: ['#2a2320', '#3d2a1e', '#6b4428', '#a0673a', '#e0b25a', '#b5522e', '#9aa0a8'],
  eyes: ['big', 'dots', 'happy', 'sleepy', 'wink'],
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

function hairBack(a: Avatar) {
  const c = OPTIONS.hairColor[a.hairColor];
  switch (OPTIONS.hair[a.hair]) {
    case 'long': return `<path d="M24 34 Q17 66 21 92 Q28 98 36 92 Q33 70 36 50 Z M76 34 Q83 66 79 92 Q72 98 64 92 Q67 70 64 50 Z" fill="${c}" ${st}/>`;
    case 'curly': {
      // a cloud of curls behind the head, falling past the shoulders
      const bumps = [[24, 40, 10], [20, 54, 10], [21, 68, 10], [25, 81, 10], [33, 90, 9], [76, 40, 10], [80, 54, 10], [79, 68, 10], [75, 81, 10], [67, 90, 9], [50, 30, 22], [40, 84, 9], [60, 84, 9]];
      return `<g fill="${c}" ${st}>${bumps.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g><g fill="${c}">${bumps.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 1.4}"/>`).join('')}</g>`;
    }
    case 'ponytail': return `<path d="M66 24 Q86 22 84 46 Q83 64 74 72 Q78 52 70 36 Z" fill="${c}" ${st}/>`;
    default: return '';
  }
}
function hairFront(a: Avatar) {
  const c = OPTIONS.hairColor[a.hairColor];
  const cap = (extra = '') => `<path d="M24 42 Q22 13 50 13 Q78 13 76 42 Q70 26 50 25 Q30 26 24 42 Z" fill="${c}" ${st}/>${extra}`;
  switch (OPTIONS.hair[a.hair]) {
    case 'wavy': return `<path d="M24 46 Q18 31 26 22 Q29 9 42 10 Q50 4 59 9 Q72 8 75 21 Q82 31 76 46 Q73 36 67 34 Q64 40 57 35 Q51 41 45 35 Q39 40 34 34 Q28 36 24 46 Z" fill="${c}" ${st}/><path d="M33 18 Q38 14 43 18 M55 15 Q61 12 66 17" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".45"/>`;
    case 'short': return `<path d="M24 40 Q22 14 50 13 Q76 13 76 38 Q70 26 56 25 Q46 31 30 30 Q26 33 24 40 Z" fill="${c}" ${st}/>`;
    case 'long': return `<path d="M24 46 Q21 14 50 13 Q79 14 76 46 Q72 30 60 27 Q46 35 30 34 Q26 38 24 46 Z" fill="${c}" ${st}/>`;
    case 'curly': {
      // curls across the top, with a side part
      const top = [[30, 26, 8], [40, 18, 9], [52, 15, 9], [63, 19, 9], [71, 28, 8], [25, 37, 7], [75, 38, 7], [44, 26, 7]];
      return `<g fill="${c}" ${st}>${top.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g><g fill="${c}">${top.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 1.4}"/>`).join('')}</g>`;
    }
    case 'ponytail': return cap(`<circle cx="70" cy="24" r="5" fill="${c}" ${st}/>`);
    case 'buzz': return `<path d="M26 34 Q26 15 50 15 Q74 15 74 34 Q64 24 50 24 Q36 24 26 34 Z" fill="${c}" opacity=".85" ${st}/>`;
    default: return '';
  }
}
function face(a: Avatar) {
  const eyes = {
    big: `<ellipse cx="42" cy="43" rx="3.6" ry="5.4" fill="${INK}"/><ellipse cx="58" cy="43" rx="3.6" ry="5.4" fill="${INK}"/><circle cx="43.2" cy="40.8" r="1.4" fill="#fff"/><circle cx="59.2" cy="40.8" r="1.4" fill="#fff"/>`,
    dots: `<circle cx="42" cy="43" r="2.8" fill="${INK}"/><circle cx="58" cy="43" r="2.8" fill="${INK}"/>`,
    happy: `<path d="M37 45 Q42 38 47 45 M53 45 Q58 38 63 45" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    sleepy: `<path d="M37 43 Q42 47 47 43 M53 43 Q58 47 63 43" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
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
