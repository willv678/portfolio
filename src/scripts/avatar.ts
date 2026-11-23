// Visitor avatars: an original, simple toy-figure style (round head, dot
// eyes, a few hair shapes). This file has no three.js in it: options,
// storage (this browser only), and a flat SVG preview for the editor.
// The 3D version lives in src/scenes/avatar.ts.

export const OPTIONS = {
  skin: ['#f6d7c3', '#f1c9a5', '#d9a47a', '#b97b53', '#8d5a3b', '#5e3b27'],
  head: ['round', 'oval', 'square'],
  hair: ['short', 'long', 'bun', 'none'],
  hairColor: ['#2a2320', '#6b4428', '#e0b25a', '#b5522e'],
  eyes: ['dots', 'ovals'],
  shirt: ['#5b8def', '#e2463c', '#4caf6a', '#7c6cf6'],
  body: ['straight', 'a-line'],
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
  const ink = '#2b2838';
  const body = OPTIONS.body[a.body] === 'a-line'
    ? `<path d="M41 60 H59 L73 114 Q50 120 27 114 Z" fill="${shirt}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>`
    : `<rect x="30" y="60" width="40" height="56" rx="19" fill="${shirt}" stroke="${ink}" stroke-width="2.5"/>`;
  const headShape = OPTIONS.head[a.head];
  const head = headShape === 'oval' ? `<ellipse cx="50" cy="40" rx="18" ry="22" fill="${skin}" stroke="${ink}" stroke-width="2.5"/>`
    : headShape === 'square' ? `<rect x="31" y="21" width="38" height="38" rx="12" fill="${skin}" stroke="${ink}" stroke-width="2.5"/>`
    : `<circle cx="50" cy="40" r="20" fill="${skin}" stroke="${ink}" stroke-width="2.5"/>`;
  const hairStyle = OPTIONS.hair[a.hair];
  const top = headShape === 'oval' ? 18 : 20;
  const cap = `<path d="M29 ${top + 21} Q29 ${top - 2} 50 ${top - 1} Q71 ${top - 2} 71 ${top + 21} Q63 ${top + 9} 50 ${top + 9} Q37 ${top + 9} 29 ${top + 21} Z" fill="${hc}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const hair = hairStyle === 'none' ? ''
    : hairStyle === 'long' ? `<path d="M28 40 Q27 64 32 70 H41 V46 Z M72 40 Q73 64 68 70 H59 V46 Z" fill="${hc}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>${cap}`
    : hairStyle === 'bun' ? `<circle cx="50" cy="${top - 4}" r="8" fill="${hc}" stroke="${ink}" stroke-width="2.5"/>${cap}`
    : cap;
  const eyes = OPTIONS.eyes[a.eyes] === 'ovals'
    ? `<ellipse cx="43" cy="43" rx="2.4" ry="4" fill="${ink}"/><ellipse cx="57" cy="43" rx="2.4" ry="4" fill="${ink}"/>`
    : `<circle cx="43" cy="43" r="2.7" fill="${ink}"/><circle cx="57" cy="43" r="2.7" fill="${ink}"/>`;
  const vb = headOnly ? '22 6 56 56' : '0 0 100 120';
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${headOnly ? '' : body}${hairStyle === 'long' ? hair : ''}${head}${hairStyle === 'long' ? '' : hair}${eyes}</svg>`;
}
