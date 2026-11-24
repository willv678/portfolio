// Pages can be rendered ahead of time in the background (see the speculation
// rules in Base.astro). Anything that should only start once someone is
// actually looking (timers, talking, nudges, counting visits) waits for this.
type Doc = Document & { prerendering?: boolean };
export const shown: Promise<void> = (document as Doc).prerendering
  ? new Promise((r) => document.addEventListener('prerenderingchange', () => r(), { once: true }))
  : Promise.resolve();
