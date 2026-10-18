import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/** Versão web de testes (npm run build:web): sem a CSP rígida da app, para poder ser alojada numa página. */
function webPreview(): Plugin {
  return {
    name: 'web-preview',
    transformIndexHtml: (html) => html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, ''),
  };
}

// Build de lançamento: minificado, sem source maps e sem console.*/debugger (secção 11.1).
export default defineConfig(({ mode }) => {
  const web = mode === 'web';
  return {
    base: './',
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    plugins: web ? [webPreview()] : [],
    build: {
      target: 'es2020',
      sourcemap: false,
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 4000,
      outDir: web ? 'dist-web' : 'dist',
      rolldownOptions: {
        output: {
          // versão web: tudo num só ficheiro JS (níveis incluídos) para ser fácil de alojar
          ...(web ? { codeSplitting: false } : {}),
          minify: {
            compress: { dropConsole: true, dropDebugger: true },
            mangle: true,
          },
        },
      },
    },
  };
});
