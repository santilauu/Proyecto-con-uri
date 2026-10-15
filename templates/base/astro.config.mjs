import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import cliente from './src/content/cliente.json' with { type: 'json' };

export default defineConfig({
  site: cliente.siteUrl,
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
