// Visitor avatars: an original cartoon toy-figure style (big round head,
// expressive eyes, simple brows and a smile, a few hair shapes). This file has no three.js in it: options,
// storage (this browser only), and a flat SVG preview for the editor.
// The 3D version lives in src/scenes/avatar.ts.

export const OPTIONS = {
  skin: ['#f6d7c3', '#f1c9a5', '#d9a47a', '#b97b53', '#8d5a3b', '#5e3b27'],
  head: ['round', 'oval', 'square'],
  hair: ['wavy', 'short', 'long', 'bun', 'none'],
  hairColor: ['#2a2320', '#3d2a1e', '#6b4428', '#e0b25a', '#b5522e'],
  eyes: ['big', 'dots', 'happy'],
  shirt: ['#5b8def', '#e2463c', '#4caf6a', '#7c6cf6', '#f0a020'],
  body: ['m', 'f'],
} as const;

export type Part = keyof typeof OPTIONS;
export type Avatar = Record<Part, number>;
export const PARTS = Object.keys(OPTIONS) as Part[];
// The default is roughly Will: fair skin, wavy dark-brown hair.
export const DEFAULT: Avatar = { skin: 1, head: 0, hair: 0, hairColor: 1, eyes: 0, shirt: 0, body: 0 };

const KEY = 'avatar';
const clean = (a: Partial<Avatar>): Avatar =>
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

/** Front-view SVG of an avatar (viewBox 100×120). */
export function svg(a: Avatar, headOnly = false) {
  const skin = OPTIONS.skin[a.skin], hc = OPTIONS.hairColor[a.hairColor], shirt = OPTIONS.shirt[a.shirt];
  const ink = '#2b2838', st = `stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"`;
  // plain-colored top, dark bottoms (trousers or a skirt)
  const pants = '#2b2a30';
  const body = OPTIONS.body[a.body] === 'f'
    ? `<path d="M38 92 H62 L70 116 Q50 120 30 116 Z" fill="${pants}" ${st}/><rect x="36" y="68" width="28" height="30" rx="12" fill="${shirt}" ${st}/>`
    : `<rect x="38" y="94" width="10" height="22" rx="5" fill="${pants}" ${st}/><rect x="52" y="94" width="10" height="22" rx="5" fill="${pants}" ${st}/><rect x="33" y="68" width="34" height="32" rx="14" fill="${shirt}" ${st}/>`;
  const shape = OPTIONS.head[a.head];
  const cy = 40;
  const head = shape === 'oval' ? `<ellipse cx="50" cy="${cy}" rx="22" ry="26" fill="${skin}" ${st}/>`
    : shape === 'square' ? `<rect x="27" y="16" width="46" height="46" rx="15" fill="${skin}" ${st}/>`
    : `<circle cx="50" cy="${cy}" r="25" fill="${skin}" ${st}/>`;
  const style = OPTIONS.hair[a.hair];
  const top = shape === 'oval' ? 13 : 15;
  const cap = `<path d="M24 ${top + 26} Q23 ${top - 3} 50 ${top - 2} Q77 ${top - 3} 76 ${top + 26} Q70 ${top + 10} 56 ${top + 9} Q50 ${top + 15} 40 ${top + 9} Q30 ${top + 10} 24 ${top + 26} Z" fill="${hc}" ${st}/>`;
  // wavy: a messy mop with a scalloped fringe swept over the forehead, covering the tops of the ears
  const wavy = `<path d="M24 46 Q18 31 26 22 Q29 9 42 10 Q50 4 59 9 Q72 8 75 21 Q82 31 76 46 Q73 36 67 34 Q64 40 57 35 Q51 41 45 35 Q39 40 34 34 Q28 36 24 46 Z" fill="${hc}" ${st}/>`
    + `<path d="M33 18 Q38 14 43 18 M55 15 Q61 12 66 17" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" opacity=".45"/>`;
  const hair = style === 'none' ? ''
    : style === 'wavy' ? wavy
    : style === 'long' ? `<path d="M23 40 Q21 70 28 76 H40 V48 Z M77 40 Q79 70 72 76 H60 V48 Z" fill="${hc}" ${st}/>${cap}`
    : style === 'bun' ? `<circle cx="50" cy="${top - 5}" r="9" fill="${hc}" ${st}/>${cap}`
    : cap;
  const eyeStyle = OPTIONS.eyes[a.eyes];
  const eyes = eyeStyle === 'happy'
    ? `<path d="M37 45 Q42 38 47 45 M53 45 Q58 38 63 45" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`
    : eyeStyle === 'dots'
      ? `<circle cx="42" cy="43" r="2.8" fill="${ink}"/><circle cx="58" cy="43" r="2.8" fill="${ink}"/>`
      : `<ellipse cx="42" cy="43" rx="3.6" ry="5.4" fill="${ink}"/><ellipse cx="58" cy="43" rx="3.6" ry="5.4" fill="${ink}"/><circle cx="43.2" cy="40.8" r="1.4" fill="#fff"/><circle cx="59.2" cy="40.8" r="1.4" fill="#fff"/>`;
  const brows = `<path d="M37 34 Q42 31 46 33 M54 33 Q58 31 63 34" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>`;
  const mouth = `<path d="M45 52 Q50 56.5 55 52" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`;
  const vb = headOnly ? '20 6 60 60' : '0 0 100 120';
  const arms = headOnly ? '' : `<path d="M33 76 L22 96 M67 76 L78 96" stroke="${shirt}" stroke-width="9" stroke-linecap="round"/><circle cx="21" cy="98" r="5.5" fill="${skin}" ${st}/><circle cx="79" cy="98" r="5.5" fill="${skin}" ${st}/>`;
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${arms}${headOnly ? '' : body}${style === 'long' ? hair : ''}${head}${style === 'long' ? '' : hair}${brows}${eyes}${mouth}</svg>`;
}
