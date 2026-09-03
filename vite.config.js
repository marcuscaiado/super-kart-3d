import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative asset URLs for GitHub Pages
  build: {
    target: 'esnext',
  },
  server: {
    host: true,
    port: 5173,
  },
});
