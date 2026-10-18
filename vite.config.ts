import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Build de lançamento: minificado, sem source maps e sem console.*/debugger (secção 11.1).
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    target: 'es2020',
    sourcemap: false,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      output: {
        minify: {
          compress: { dropConsole: true, dropDebugger: true },
          mangle: true,
        },
      },
    },
  },
});
