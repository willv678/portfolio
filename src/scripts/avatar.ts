// Visitor avatars: an original cartoon toy-figure style (big round head,
// expressive eyes, simple brows and a smile, a few hair shapes). This file has no three.js in it: options,
// storage (this browser only), and a flat SVG preview for the editor.
// The 3D version lives in src/scenes/avatar.ts.

export const OPTIONS = {
  skin: ['#f6d7c3', '#f1c9a5', '#d9a47a', '#b97b53', '#8d5a3b', '#5e3b27'],
  head: ['round', 'oval', 'square'],
  hair: ['short', 'long', 'bun', 'none'],
  hairColor: ['#2a2320', '#6b4428', '#e0b25a', '#b5522e'],
  eyes: ['big', 'dots', 'happy'],
  shirt: ['#5b8def', '#e2463c', '#4caf6a', '#7c6cf6'],
  body: ['m', 'f'],
} as const;

export type Part = keyof typeof OPTIONS;
export type Avatar = Record<Part, number>;
export const PARTS = Object.keys(OPTIONS) as Part[];
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
  const body = OPTIONS.body[a.body] === 'f'
    ? `<path d="M41 68 H59 L71 116 Q50 121 29 116 Z" fill="${shirt}" ${st}/>`
    : `<rect x="32" y="68" width="36" height="48" rx="16" fill="${shirt}" ${st}/>`;
  const shape = OPTIONS.head[a.head];
  const cy = 40;
  const head = shape === 'oval' ? `<ellipse cx="50" cy="${cy}" rx="22" ry="26" fill="${skin}" ${st}/>`
    : shape === 'square' ? `<rect x="27" y="16" width="46" height="46" rx="15" fill="${skin}" ${st}/>`
    : `<circle cx="50" cy="${cy}" r="25" fill="${skin}" ${st}/>`;
  const style = OPTIONS.hair[a.hair];
  const top = shape === 'oval' ? 13 : 15;
  const cap = `<path d="M24 ${top + 26} Q23 ${top - 3} 50 ${top - 2} Q77 ${top - 3} 76 ${top + 26} Q70 ${top + 10} 56 ${top + 9} Q50 ${top + 15} 40 ${top + 9} Q30 ${top + 10} 24 ${top + 26} Z" fill="${hc}" ${st}/>`;
  const hair = style === 'none' ? ''
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
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${headOnly ? '' : body}${style === 'long' ? hair : ''}${head}${style === 'long' ? '' : hair}${brows}${eyes}${mouth}</svg>`;
}
