import { getCollection } from 'astro:content';

// Drafts are hidden everywhere; preview them with `PUBLIC_DRAFTS=1 npm run dev`.
const live = (e: { data: { draft: boolean } }) => !e.data.draft || import.meta.env.PUBLIC_DRAFTS === '1';

export async function projects() {
  return (await getCollection('projects', live)).sort((a, b) => a.data.order - b.data.order);
}

export async function posts() {
  return (await getCollection('writing', live)).sort((a, b) => +b.data.date - +a.data.date);
}

// SVG icons live in src/icons/*.svg and are inlined so they can use currentColor.
const icons = import.meta.glob('./icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

let uid = 0;
export function iconSvg(name?: string, glyph?: string) {
  if (name) {
    const raw = icons[`./icons/${name}.svg`];
    if (!raw) throw new Error(`No icon src/icons/${name}.svg`);
    // Each copy gets unique ids so masks/gradients don't collide when an icon
    // appears twice on one page, and inherits color from its container.
    const n = ++uid;
    return raw
      .replace(/id="([^"]+)"/g, `id="$1-${n}"`)
      .replace(/url\(#([^)]+)\)/g, `url(#$1-${n})`)
      .replace('<svg ', `<svg class="icon${raw.includes('class=') ? '' : ' hop'}" fill="currentColor" aria-hidden="true" `);
  }
  return `<svg class="icon hop" viewBox="0 0 40 40" aria-hidden="true"><text x="20" y="27" text-anchor="middle" font-family="Fraunces, serif" font-size="20" fill="currentColor">${glyph ?? '?'}</text></svg>`;
}

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
