// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://willvarner.me',
  integrations: [mdx()],
  // CSS goes inside each page: one less request before anything draws, and a page
  // can never end up unstyled because its stylesheet changed name in a deploy.
  build: { format: 'directory', inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
});
