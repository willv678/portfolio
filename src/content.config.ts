import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Things that can sit on the home shelf share these fields.
const shelfFields = {
  title: z.string(),
  blurb: z.string(),                       // 1–3 sentences; the home panel clamps at 4 lines
  status: z.string(),                      // small mono line above the title, e.g. "2026 · in progress"
  tags: z.array(z.string()).max(2).default([]),
  pinned: z.boolean().default(false),      // show on the home shelf
  order: z.number().default(100),         // lower = further left on the shelf
  draft: z.boolean().default(false),       // drafts show in `npm run dev` only
};

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    ...shelfFields,
    color: z.string(),                     // accent: icon tint, links, buttons
    bg: z.string(),                        // banner background (any CSS background)
    icon: z.string().optional(),           // name of an SVG in src/icons/
    glyph: z.string().optional(),          // fallback: 1–2 letters if there's no icon yet
    scene: z.string().optional(),          // a 3D banner in src/scenes/<name>.ts (optional)
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    ...shelfFields,
    date: z.coerce.date(),
  }),
});

export const collections = { projects, writing };
