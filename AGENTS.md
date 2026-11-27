# Working on willvarner.me

A guide for coding agents. It covers how to add a project (icon, shelf card, 3D scene, page) and
the style rules that keep the site consistent. Read all of it before changing anything visible.
It's long on purpose: most of it is lessons Will had to teach the last agent the hard way.

The site is Will Varner's portfolio. It's an Astro static site deployed to GitHub Pages at
willvarner.me (repo `willv678/portfolio`). The feel is a Nintendo 3DS / Wii home menu: a
top screen (the about panel) and a shelf of app icons below it. Each project is an "app" with a
small animated icon and a toy-like 3D scene. Quiet, charming, slightly nerdy, fast. Never flashy.

---

## 1. Map

| What | Where |
|---|---|
| Project pages (one MDX file each, served at `/<slug>/`) | `src/content/projects/<slug>.mdx` |
| Frontmatter schema (the source of truth for fields) | `src/content.config.ts` |
| App icons (flat SVG, one per project) | `src/icons/<name>.svg` |
| Icon hover animations | `src/styles/global.css`, the "Icon motion" block |
| 3D scenes (one file per project; registered automatically) | `src/scenes/<name>.ts` |
| Shared 3D kit (stage, toon shading, outlines, helpers) | `src/scenes/kit.ts` |
| Avatar (visitor's character): options + flat SVG | `src/scripts/avatar.ts` |
| Avatar in 3D (`makeHead`, `makeAvatar`) | `src/scenes/avatar.ts` |
| Sound effects (synthesized) and recorded clips | `src/scripts/sound.ts`, clips in `public/sfx/` |
| Experience timeline entries | `src/data/experience.ts` |
| Experience 3D models (one per timeline entry) | `src/scenes/experience.ts` |
| The character's status lines on the home page | `src/data/status.ts` |
| Home page (about panel, shelf, talking character) | `src/pages/index.astro` |
| Project page template | `src/pages/[slug].astro` |
| Layout: top bar, keys, swipe, prerendering, view counter | `src/layouts/Base.astro` |
| MDX building blocks | `src/components/` (`Figure`, `FigurePair`, `CompareVideo`, `YouTube`, `Note`) |
| Images for a project | `public/projects/<slug>/` |

---

## 2. Adding a project: the checklist

A finished project has all of these. Do them in this order:

1. **The page:** `src/content/projects/<slug>.mdx`, with frontmatter (§3) and the write-up (§7).
2. **The icon:** `src/icons/<name>.svg`, plus its hover animation (§4).
3. **The 3D scene:** `src/scenes/<name>.ts`, set as `scene: <name>` (§5).
4. **On the shelf:** `pinned: true` and an `order` (lower is further left; decimals are fine).
   Order by what Will would want a visitor to see first: current, substantial work near the
   front (a work-in-progress project he's excited about can go second), old school projects
   toward the end. Not strictly by date. The shelf, the home
   info card, the page, ← / → and swipe order, the side arrows and prerendering all come from
   this; there's nothing else to register.
5. **Timeline, if it was a job or research:** add an entry to `src/data/experience.ts` with an
   `href` to the page, and a model in `src/scenes/experience.ts` (§6).
6. **Images:** in `public/projects/<slug>/`, compressed (§9).
7. **Check everything** (§10), then **ship** (§11).

To work on a project that isn't public yet, set `draft: true` and preview it with
`PUBLIC_DRAFTS=1 npm run dev`. Drafts are hidden everywhere else.

---

## 3. Frontmatter

```yaml
---
title: WarpPoint
blurb: One to three plain sentences. The home card clamps at 4 lines.
status: 2026 · 1.0 out now      # small mono line: "YEAR · state"; keep it short
tags: [C++, Swift]              # at most 3, languages/tools only, never "AI" or buzzwords
color: "#5b4bd6"                # accent: icon color, first button, side-arrow hover
icon: warppoint                 # src/icons/warppoint.svg (or glyph: "AB" until there's art)
scene: warppoint                # src/scenes/warppoint.ts (optional; the icon shows without it)
pinned: true
order: 1
links:
  - { label: GitHub, href: "https://github.com/willv678/..." }   # first link = filled button
  - { label: Download, href: "https://github.com/.../releases/latest" }
---
```

- **`color`**: a mid-saturation color that reads on both the light (`#f7f6f2`) and dark
  (`#1f1f23`) panels. White text on it should be legible, so avoid bright yellow or amber. The
  current set is purple `#5b4bd6`, teal, green and amber `#d9820f`; pick something distinct.
- **`bg`**: leave it at the default flat panel color. Banners are transparent, and the 3D scene
  sits on the panel.
- **`banner`**: a photo banner instead of the icon. Rarely right; the icon and scene are the look.
- **Links**: GitHub first. Only add a link that works today. Check for draft releases and private
  repos before linking.

---

## 4. The app icon

The icon is the project's face: it appears on the shelf tile, in the home info card, on the page
banner (until the 3D scene loads) and on the prev/next arrows.

**Drawing rules**
- `viewBox="0 0 48 48"`, flat shapes, **no stroke-heavy line art, no text, no logos or brand
  marks**. No decorative gradients; a soft gradient is OK only for light itself (WarpPoint's
  beam). It should say what the project does, literally and simply: a UFO carrying
  a save, a gate a car drives under, a bridge, a face in scan brackets.
- Use `currentColor` (inherited; the loader sets `fill="currentColor"`), so the icon takes the
  project's `color`. For depth, use the same color at 2–3 opacities (`opacity=".3"`, `".7"`).
  A small white or light detail is fine (the gate's lamp).
- Keep a ground line or shadow (`opacity=".3"`) when the thing sits on something; it keeps the
  icons consistent.
- `id`s inside the SVG (masks, clip paths) are made unique automatically, since an icon can appear
  twice on a page.

**Hover animation**
- If the SVG has no `class=` anywhere, it gets the default bounce (`.hop`) for free.
- To animate parts, put classes on them (`<g class="car">`) and add a comment at the top of the
  SVG saying what moves. Then add keyframes in `global.css` under "Icon motion", using the
  **same selector list** as the others, so the animation plays on a hovered tile, a selected tile
  (keyboard), the attract-mode peek, the prev/next tiles and the page banner:

```css
/* MyProject: the widget spins up */
@keyframes spin-up { from { transform: rotate(-90deg); } }
.icon .widget { transform-box: fill-box; transform-origin: center; }
:is(.tile.on, .tile.peek, html:not(.kbd) a.tile:hover, .nav-tile:hover, .banner) .icon .widget { animation: spin-up .8s cubic-bezier(.3,1.4,.5,1); }
```

- Motion is small: about 1–1.6s. An entrance plays once (the car rolls in); an idle motion loops
  softly (the UFO bobs, the scan sweeps). Use `transform-box: fill-box` (or `view-box`) so
  transforms pivot on the part, not the whole icon.
- Elements hidden until the animation starts get `opacity: 0` in the base rule (see `.save`).

---

## 5. The 3D scene

Each project gets a small looping toy diorama that acts out what the project does. Examples:
- **WarpPoint:** a UFO beams a save from a Switch to a laptop and back, piloted by the visitor's
  character.
- **Agent Stress Testing:** the character drives a toy car with a controller and it swerves.
- **CDASim:** a city with a floating map of the route.
- **TechDetect:** students walk past a laptop and webcam, which check them in.

It plays in the home info card (when the tile is selected) and on the project page's banner.

**Skeleton** (`src/scenes/<name>.ts`; the file name is the `scene:` value, and it's picked up
automatically):

```ts
import { Group, Mesh, SphereGeometry, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createStage, seg, ease, bump, passed } from './kit';
import { sfx } from '../scripts/sound';

export const create = () => createStage((kit) => {
  const { scene, toon, blob } = kit;
  // build everything once, from primitives
  const box = new Mesh(new RoundedBoxGeometry(0.6, 0.4, 0.4, 2, 0.05), toon('#5b8def'));
  box.position.y = 0.2; scene.add(box);
  const shadow = blob(0.8, 0.5); scene.add(shadow);

  const L = 5;                                   // one loop, in seconds
  return (t, prev) => {                          // pose the scene for time t; no state that drifts
    const u = t % L;
    box.position.y = 0.2 + bump(u, 1.0, 1.6) * 0.3;
    if (passed(prev, t, 1.0, L)) kit.sfx(sfx.pop);   // sounds fire on a moment, once per loop
  };
}, { lookAt: new Vector3(0, 0.6, 0), minSpan: 4, minHeight: 2.6, outline: 0.012 });
```

**How the kit works** (`kit.ts`)
- `createStage(setup, opts)` owns the renderer, camera, lights, cel outlines, mouse parallax,
  play/pause, sound gating and cleanup. It returns `null` without WebGL; the icon then stays.
- **It only runs while it's attached, on screen and the tab is visible.** Don't start your own
  timers or rAF loops.
- `update(t, prev)` should be a **pure function of `t`**: a loop `u = t % L` with
  `seg` / `ease` / `bump` to shape moments, and `passed(prev, t, at, L)` for one-off events like
  sounds and sparkle bursts. That makes it restart cleanly, pause for free and render
  deterministically in tests.
- **Framing:** `lookAt` is where the camera aims. `minSpan` / `minHeight` are the world units
  that must stay visible at any aspect ratio (wide banner, squarer info card, phone).
- **Materials:** `toon(color)` (three flat tones, like a 3DS menu render) for solid things,
  `MeshBasicMaterial` for screens, lights and paint. Outlines are added automatically to
  everything built in `setup`. Anything built later (an avatar rebuilt on change) needs
  `kit.outline(obj)`.
- **Shadows:** `blob(w, d)` soft round shadows only. No shadow maps.
- **Extras:** `kit.island()`, `kit.stars()`, `kit.sparkles()`, `kit.glow()`, `kit.own(texture)`
  (register canvas textures so they're freed), `kit.host()` (the element it's playing in, for
  HTML overlays like the lab's camcorder OSD).
- **Sound:** `kit.sfx(sfx.something)`. It only plays when the scene is allowed to (hovered on
  project pages, always in the home card) and after the visitor's first click.

**Put the visitor's character in it** (the personal touch Will likes):
```ts
import { makeAvatar, makeHead } from './avatar';
import { load, DEFAULT, type Avatar } from '../scripts/avatar';
const seat = new Group(); scene.add(seat);
const build = (a: Avatar) => { seat.clear(); const f = makeAvatar(kit, a); kit.outline(f.g); seat.add(f.g); };
build(load() ?? DEFAULT);
addEventListener('avatar-change', (e) => build((e as CustomEvent<Avatar | null>).detail ?? DEFAULT));
```
`makeAvatar` returns `{ g, head, left, right, arm }` (`arm` is the same as `right`); the arms pivot at the shoulder (`rotation.z`
raises, `rotation.x` swings). `makeHead` is just the head, for a pilot or a driver.

**Scene style rules**
- **Toy diorama, primitives only:** rounded boxes, spheres, capsules, cylinders. No model files,
  no image textures (small canvas textures for screens are fine), no text in 3D (it's unreadable
  and looks cheap).
- **Transparent background.** No ground plane edge-to-edge; things sit on blob shadows, an
  island or a small base.
- **The story should read in one loop of 4–8 seconds,** with a clear beat (the save lands, the
  car swerves, the check pops). It should make sense with the sound off.
- **Soft, pastel-leaning colors** that fit the panel, plus the project's accent. Nothing neon.
- **Performance:** a few dozen meshes. Reuse geometries and materials in loops. No per-frame
  allocations: create Vectors once outside `update`.
- **Facing:** characters face the camera or inward toward the content, not out of the frame.
- **A "before → after" wipe across the scene** (as in `nxremix.ts`): patch `MeshToonMaterial` with
  `onBeforeCompile` to mix two colors by world x against a moving seam uniform, and give every
  patched material the same `customProgramCacheKey`. That works with the automatic outlines.
  Objects that exist on only one side (a sun, shadows) should pop in or out as the seam passes,
  not be clipped, or their outlines show on the wrong side.

---

## 6. Experience timeline entries

`src/data/experience.ts` is newest first. Fields: `start`, `end?` (`"now"` for ongoing),
`role`, `org`, `short?` (caption under the 3D viewer), `what` (one plain sentence), `href?`
(project page, or an external link, which gets ↗ and a new tab), `model?` (3D model name) and
`minor?` (goes in the small "earlier" list with no model). Dates are seasons ("Summer 2025"),
except minor entries, which use years.

A model goes in `src/scenes/experience.ts` with `add('<name>', group, tick, fixed)`. Add the name
to the `model` union in `experience.ts`. `tick(t, prev)` gets time since this entry became
active, so the little story starts from the top every time someone scrolls to it. `fixed: true`
means it has a front and sways less. Same style rules as §5: a literal toy version of the job (a
hospital for Abridge, a blocky avatar that falls apart with an "oof" for Roblox, a traffic light
for Leidos, a laptop doing face check-in for GTRI).

---

## 7. Writing the project page

**Voice** (this matters more than anything visual):
- **Plain, concrete, first person, short sentences.** Say what it does and how. Like explaining
  it to a smart friend.
- **No hype or buzzwords:** "revolutionary", "seamless", "leverage", "robust", "cutting-edge",
  "passionate". No emoji. No "Tech stack:" lists.
- **Specifics beat adjectives:** "19 MB of memory, 0.1% of a core while idle" beats
  "lightweight". Real numbers, measured.
- **Engineering ideas are the interesting part:** why it's built the way it is, what was hard,
  what the clever trick was. Will wants visitors to see how he thinks.
- **Honest status:** "in progress", "paper under review". Never claim more than exists.

**Shape that works** (see `warppoint.mdx`, `techdetect.mdx`):
1. **A one-paragraph hook:** the everyday problem.
2. **A bold one-line answer** ("**WarpPoint is the link.**").
3. **A figure:** the thing itself.
4. **Optionally, a `<Note label="the rule">`** with the one design principle.
5. **`## How it works`:** the engineering, with bold run-in labels.
6. **The sections that make it interesting:** safety, a clever detail, numbers.
7. **`## What's next` or `## Looking back`.**

**Components**
- `<Figure src alt caption max? wide? />`. The caption is lowercase, short and a little dry
  ("click the UFO", "me in 2022, seventy-five times"). Use `max={360}` for small or tall shots.
- `<FigurePair a={{src,alt,caption}} b={{...}} />` puts two images side by side.
- `<YouTube id title caption />` loads the player only when clicked (no tracking before that).
- `<CompareVideo …/>` shows two versions with a draggable divider (see the component header).
  It works for **stills** too: stack the two images (left on top) into a 2-frame video with
  ffmpeg and give it a 50/50 poster. Label honestly in the slider's `left`/`right` tags and in
  the caption; mockups say "mockup".
- `<Note label="…">` is a quiet aside.
- Tables are fine for numbers.

---

## 8. Style guide: what Will likes, and what he doesn't

**The look**
- **Calm and warm:** off-white dotted background (`--bg`, `--dot`), panels in `--panel`, one
  ink color, the project's accent used sparingly. Light and dark themes both work from the
  tokens in `global.css`. Never hardcode a gray; use `--muted`, `--line` or `--ink`.
- **Type:** Fraunces (serif) for headings only, IBM Plex Sans for text, IBM Plex Mono (small,
  muted) for labels, captions, status lines and keys. Fonts are self-hosted; don't add Google
  Fonts or new families.
- **Rounded panels** (14–22px) with the soft `--shadow`. **Keycaps** (`<kbd>`) for keyboard hints.
- **Motion:** small, springy, purposeful: `cubic-bezier(.3,1.6,.5,1)` for pops, about 0.3s
  transitions. Things never pop in or snap: heights ease, content fades, placeholders don't
  flash. Respect `prefers-reduced-motion`.
- **Sound:** soft synthesized blips (vol 0.01–0.03), only after a gesture, mute remembered.
  Never autoplay music. A recorded clip (the Roblox oof) is a rare treat, not a pattern.
- **Humor:** dry and deadpan, in small doses. The character's gossip lines, a cut feature
  mentioned in "Looking back". Never cringe, never "Reddit".

**Do**
- Make each project feel like a little app on a console menu: icon, toy scene, one-line card.
- Keep everything keyboard-navigable (← → Esc Enter) and touch-friendly (tap to select, tap
  again or "open" to go; × or tap outside to close).
- Use the visitor's character in scenes where a person makes sense.
- Keep the site fast (§9) and measure before claiming it is.

**Don't**
- **No skill bars,** percentage meters, "years of experience" counters, logo walls or
  tech-stack badges.
- **No "vibecoded" look:** gradient hero blobs, glassmorphism, neon glows, cards full of icons
  and fake metrics, stock illustrations, emoji headings.
- **No Nintendo or Mii art,** sprites, logos or traced assets. Everything is original; the
  character is an original toy-figure design. If Will hands over art and says he made it, take
  his word and use it (he drew the curly, shaggy, spiky and center-part hair designs).
- **No employer-internal details** (Roblox, Abridge; Abridge is clinical). Resume-level only.
- **The research project is under double-blind review until 2027-01-15.** Until then, don't
  name the research system or the venue anywhere public, this repo included. The page is
  "Agent Stress Testing". Will's private notes have the details.
- **No third-party scripts** beyond GoatCounter (cookie-free view counts). No Google
  Analytics, no embeds that load before a click.
- **No Claude/model co-author lines** in commits.

---

## 9. Performance budget

- **Total size:** the home page is about 330 KB with everything. Keep new pages in that range.
- **Video:** H.264 MP4 at about 1440–1600 wide, a JPEG poster, and lazy-loaded (CompareVideo
  and YouTube already are). Keep each clip under about 1 MB.
- **Images:** JPEG at quality 70–82, at most about 1440px wide (about 2× the column), ideally
  under 250 KB. Use PNG only when transparency matters. Use `sips` to convert and resize.
  `<Figure>` lazy-loads.
- **three.js** (about 145 KB gzipped) loads lazily: on project pages after load, when idle; on
  home, idle-preloaded on desktop.
- **Pages are prepared ahead of time** with speculation rules on hover devices (home plus
  prev/next). Anything that should start only when a person is actually looking waits for
  `shown` (`src/scripts/shown.ts`): timers, talking, nudges, counting visits.
- **CSS is inlined** in each page. Old hashed scripts are kept across deploys (see
  `deploy.yml`), so a stale tab never breaks.

---

## 10. Checking your work (do this every time)

**Look at your own output before saying it's done.** The last agent once approved a 3D render
that plainly showed hair covering the character's chest, and Will had to point it out. Zoom
in (2× device scale), check several angles and variants, and look for clipping, things poking
through, layout jumps and overlap.

In a fresh worktree, run `npm ci` first; `node_modules` isn't shared.

```sh
npm run build                                   # must pass
npx astro preview --port 4377                   # serve dist/; it detaches and may pick another
                                                # free port, so READ THE PORT FROM ITS OUTPUT
                                                # (another session may already own 4322, serving
                                                # a different checkout). Stop: npx astro preview stop
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# static screenshot (the 3D scene may not have drawn yet; use the real GPU)
"$CH" --headless=new --use-angle=metal --enable-gpu --hide-scrollbars \
  --window-size=1440,900 --force-device-scale-factor=2 --virtual-time-budget=3000 \
  --screenshot=/tmp/shot.png http://localhost:4322/<slug>/
```

- **Selecting a shelf tile in a test:** hovering only counts as a real mouse `pointerover`.
  Dispatch `new PointerEvent('pointerover', {bubbles: true, pointerType: 'mouse'})` on
  `a.tile[href*="<slug>"]`, or press → with CDP key events.
- **Interaction** (taps, keys, scrolling, timing): drive Chrome with
  `--remote-debugging-port=9333` and a small Node script over CDP (`Runtime.evaluate`,
  `Input.dispatchTouchEvent`, `Emulation.setDeviceMetricsOverride` with `mobile: true` for
  phones, `Page.captureScreenshot`). Node's built-in `WebSocket` is enough; no Puppeteer needed.
- **Test sheets for 3D:** make a temporary page (e.g. `src/pages/render-test.astro`) that uses
  `createStage` to lay out many variants at once (every hair style × head shape, front and back,
  arms raised). Screenshot it, then **delete the page before committing**.
- **Sizes to check:** 1440×900, 1280×650 (a short laptop), about 1000, about 730, about 670,
  and a 390 phone (emulated). Nothing clips, nothing scrolls sideways, no awkward empty space.
- **Both themes:** light and dark.
- **Performance:** `npx lighthouse@12 <url> --only-categories=performance` against the preview,
  mobile and desktop.

---

## 11. Shipping

- **Branch:** work on `main`; pushing it deploys. (`redesign` is an old branch from before
  launch. Don't use it.)
- **Other sessions may be working in this repo at the same time.** Before committing, run
  `git status -sb` and check you're on the branch you think. Never `--amend` or rebase a commit
  you didn't just make, and never switch branches or stash in the shared checkout. If `main` has
  moved, `git pull --rebase` your own commit on top.
- **Deploy:** pushing `main` runs `.github/workflows/deploy.yml` (about a minute). Wait for it:
  `gh run watch <id> --exit-status`. The run list can briefly show the previous run, so match
  the head SHA.
- **Commits:** plain messages that say what changed for a visitor ("Phones: tapped project stays
  open…"). No co-author trailers.
- **What needs Will's OK:** commit and push only when he's asked for the change (he usually
  has). Ask before anything outward-facing that he hasn't asked for: DNS, repo settings, new
  third-party services.
- **After deploying:** browsers may keep a page for up to 10 minutes, so ask him to hard-refresh
  if something looks stale.

---

## 12. The avatar system (if you touch it)

- **Options** live in `OPTIONS` (`src/scripts/avatar.ts`), as indexes. Saved avatars store
  indexes, so replacing an option at an index changes it for everyone who picked it. That's
  fine, but say so. `DEFAULT` is Will's own look; `isWill(a)` checks for it.
- **A hair style has two halves that must match:** the flat SVG (`hairBack` / `hairFront`,
  viewBox 100×120, head circle at 50,40, r 25) and the 3D version (`makeHead` in
  `src/scenes/avatar.ts`).
- **3D hair is built from one shell:** `hair(r, line, bottom, opts)`. The face is cut out below
  `line(x)`, the ends are trimmed at `bottom(x, z)`, and hidden parts are tucked inside the head.
  Extra pieces come from `lump`, `spike` and `teardrop`.
- **Hair pitfalls:**
  - Square heads need roomier hair, or the corners poke through.
  - Texture must fade near cut edges, or the hairline frays.
  - Long hair must stop at the jaw in front, or it covers the chest.
  - Separate balls stuck onto a cap read as "a pile of balls", not curls.
- **Test every change on a sheet:** all head shapes, a light and a dark hair color, front, side
  and back, and an arm raised (waving).

---

## 13. Little things that are easy to break

- **A tile's `view-transition-name`** (`vt-<slug>`) must match the page banner's for the
  tile → banner morph. `[slug].astro` and the shelf already do this; keep it if you touch either.
- **Keyboard:** the handlers in `Base.astro` are inline in `<head>` on purpose, so they work
  before scripts load. Don't move them into a module.
- **Touch:** never treat a `pointerleave` from a finger as "the mouse left".
- **The home character** talks on desktop only: first line about customizing, then a status line
  every ~12s. Status lines are in `src/data/status.ts`; keep them short and deadpan, with the
  punchline on the `them` line.
- **Sounds** must go through `kit.sfx` / `sfx.*`, so mute and gesture-gating apply.
