// @ts-check
import lit from '@astrojs/lit';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://shenanigans.shoghisimon.ca',
  integrations: [mdx(), sitemap(), react(), lit(), tailwind()],
  output: 'static',
  server: {
    headers: {
      // Allow worker-src
      // 'Content-Security-Policy': "default-src 'self' 'unsafe-inline' blob:",
    },
  },
});
