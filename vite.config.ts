import { defineConfig } from 'vite';

// Build de lançamento: minificado, sem source maps e sem console.*/debugger (secção 11.1).
export default defineConfig({
  base: './',
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
