import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// This repository is the GitHub *user* site: there is no /repo-name/ base path.
export default defineConfig({
  site: 'https://xleia.github.io',
  output: 'static',
  trailingSlash: 'always',
  integrations: [react()],
});
