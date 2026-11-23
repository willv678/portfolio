// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://willvarner.me',
  integrations: [mdx()],
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
