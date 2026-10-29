import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/** Dev-site builds (`--mode develop`) get their own page title and stay out of search results. */
function devSiteHtml(): Plugin {
  return {
    name: 'dev-site-html',
    transformIndexHtml(html) {
      return html
        .replace('<title>Spore &amp; Sprawl</title>', '<title>Spore &amp; Sprawl (dev)</title>')
        .replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>');
    },
  };
}

// `base: './'` keeps the static build working under any GitHub Pages repository path (and /dev/).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'develop' ? [devSiteHtml()] : [],
  build: {
    outDir: 'dist',
    target: 'es2022',
    reportCompressedSize: true,
  },
  server: { port: 5173 },
  preview: { port: 4173, strictPort: true },
}));
