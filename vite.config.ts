import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/** Where each site is published (SPEC §13.8). Link previews need absolute addresses, so the meta tags use these. */
const GAME_URL = 'https://swalliso.github.io/Sambattler/';
const DEV_URL = `${GAME_URL}dev/`;

/** Fills in the link-preview tags' address: the game's, or the dev site's for `--mode develop`. */
function siteUrlHtml(url: string): Plugin {
  return { name: 'site-url-html', transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', url) };
}

/** Dev-site builds (`--mode develop`) get their own page title and stay out of search results. */
function devSiteHtml(): Plugin {
  return {
    name: 'dev-site-html',
    transformIndexHtml(html) {
      return html
        .replace('<title>Spore &amp; Sprawl</title>', '<title>Spore &amp; Sprawl (dev)</title>')
        .replaceAll('content="Spore &amp; Sprawl" />', 'content="Spore &amp; Sprawl (dev)" />')
        .replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>');
    },
  };
}

// `base: './'` keeps the static build working under any GitHub Pages repository path (and /dev/).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'develop' ? [siteUrlHtml(DEV_URL), devSiteHtml()] : [siteUrlHtml(GAME_URL)],
  build: {
    outDir: 'dist',
    target: 'es2022',
    reportCompressedSize: true,
  },
  server: { port: 5173 },
  preview: { port: 4173, strictPort: true },
}));
