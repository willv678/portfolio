// Loads a 3D banner scene (src/scenes/<name>.ts) on demand. three.js is only
// downloaded when a scene is actually shown, and never for people who've
// asked their OS for reduced motion (they keep the flat SVG banner).
const loaders = import.meta.glob<{ mount: (el: HTMLElement) => () => void }>('../scenes/*.ts');

export const motionOK = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function mountScene(name: string, el: HTMLElement): Promise<() => void> {
  const load = loaders[`../scenes/${name}.ts`];
  if (!load || !motionOK()) return () => {};
  const { mount } = await load();
  return mount(el);
}
