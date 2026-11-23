# willvarner.me

Astro, static, deployed to GitHub Pages from `main`.

```sh
npm install
npm run dev      # http://localhost:4321 (drafts visible)
npm run build    # → dist/ (drafts hidden)
```

## Add a project

1. Create `src/content/projects/<slug>.mdx`. It's served at `willvarner.me/<slug>`. Copy the frontmatter from an existing one.
2. Icon: drop an SVG in `src/icons/<slug>.svg` and set `icon: <slug>`, or use `glyph: AB` until there's art.
3. `pinned: true` puts it on the home shelf; `order` sets the position (lower = further left).
4. Images go in `public/projects/<slug>/`.

In the body you can use `<Figure src alt caption />`, `<YouTube id title />` and `<Note label>…</Note>`.

## Add a post

Same idea in `src/content/writing/<slug>.mdx` (needs a `date`). `draft: true` keeps it off the live site. The `writing` link in the nav only appears once a non-draft post exists.

## Other pages

- Timeline: `src/pages/experience.astro` (one entry per line in the `timeline` array).
- Resume: replace `public/CSResume.pdf`.
