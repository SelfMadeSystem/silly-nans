// @ts-check
import lit from '@astrojs/lit';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://shenanigans.shoghisimon.ca',
  integrations: [mdx(), sitemap(), react(), lit()],
  output: 'static',
  server: {
    headers: {
      // Allow worker-src
      // 'Content-Security-Policy': "default-src 'self' 'unsafe-inline' blob:",
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
