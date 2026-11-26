# willvarner.me

Astro, static, deployed to GitHub Pages from `main`.

```sh
npm install
npm run dev      # http://localhost:4321  (PUBLIC_DRAFTS=1 npm run dev to also show drafts)
npm run build    # → dist/
```

## Adding a project, and the style rules

See [AGENTS.md](AGENTS.md): the checklist (page, icon and its hover animation, 3D scene,
shelf, timeline), how the scenes and animations work, the writing voice, the do's and
don'ts, how to check your work and how to ship.

## Other pages

- Timeline: `src/data/experience.ts` (shown on the home page; 3D models in `src/scenes/experience.ts`).
- The home character's status lines: `src/data/status.ts`.
- Resume: replace `public/CSResume.pdf`.
