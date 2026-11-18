import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { pages } from './frontend/ui/routes.mjs';
import { renderPartials } from './frontend/ui/partials.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const frontend = resolve(root, 'frontend');
const require = createRequire(import.meta.url);
const icons = new Map();

// Keep the export's outlined symbols, but ship only the icons actually used.
function inlineIcons(html) {
  return html.replace(
    /(<span class="material-symbols-outlined\b[^"]*" aria-hidden="true">)([a-z0-9_]+)(<\/span>)/g,
    (_, start, name, end) => {
      if (!icons.has(name)) {
        const iconPath = require.resolve(`@material-symbols/svg-400/outlined/${name}.svg`);
        icons.set(name, readFileSync(iconPath, 'utf8').trim().replace('<svg ', '<svg focusable="false" '));
      }
      return `${start}${icons.get(name)}${end}`;
    },
  );
}

const previewHost = { host: '0.0.0.0', allowedHosts: ['.e2b.app'] };

export default defineConfig({
  root: frontend,
  appType: 'mpa',
  server: previewHost,
  preview: previewHost,
  css: { postcss: root },
  plugins: [{
    name: 'yojnaagent-pages',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => inlineIcons(renderPartials(html)),
    },
  }],
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    rolldownOptions: {
      input: Object.fromEntries(Object.entries(pages).map(([key, path]) => [key, resolve(frontend, path)])),
    },
  },
});
