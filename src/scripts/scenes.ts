// 3D banner scenes (src/scenes/<name>.ts), loaded on demand and built once.
//
// - getScene(name): download + build (first time only), then reuse.
// - preloadScenes(names): on desktop, do that while the browser is idle, so
//   selecting a tile plays instantly. Skipped on phones, slow connections,
//   data-saver, and for anyone who asked their OS for reduced motion.
import type { SceneHandle } from '../scenes/kit';

// Every file in src/scenes/ except the shared kit is a scene.
const loaders = import.meta.glob<{ create: () => SceneHandle | null }>(['../scenes/*.ts', '!../scenes/kit.ts']);
const built = new Map<string, Promise<SceneHandle | null>>();

export const motionOK = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

export function getScene(name: string): Promise<SceneHandle | null> {
  const load = loaders[`../scenes/${name}.ts`];
  if (!load || !motionOK()) return Promise.resolve(null);
  if (!built.has(name)) built.set(name, load().then((m) => m.create()).catch(() => null));
  return built.get(name)!;
}

export function preloadScenes(names: string[]) {
  const conn = (navigator as any).connection;
  const desktop = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!desktop || conn?.saveData || /2g/.test(conn?.effectiveType ?? '')) return;
  const idle = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1200));
  const go = () => idle(() => names.forEach((n) => getScene(n)), { timeout: 4000 });
  document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
}
