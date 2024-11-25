// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import lit from '@astrojs/lit';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://shenanigans.shoghisimon.ca',
  integrations: [mdx(), sitemap(), react(), lit(), tailwind()],
  output: 'static',
});
