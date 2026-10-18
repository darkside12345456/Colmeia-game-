// Junta a versão web (npm run build:web) numa só página HTML, com o JS e as letras incluídos,
// para poder ser aberta/partilhada como página de testes. Saída: dist-web/colmeia-doce.html
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const dir = 'dist-web/assets';
const files = readdirSync(dir);
const js = readFileSync(`${dir}/${files.find((f) => f.endsWith('.js'))}`, 'utf8');
let css = readFileSync(`${dir}/${files.find((f) => f.endsWith('.css'))}`, 'utf8');
// letras: só woff2, como data URI
css = css.replace(/url\(\.\/([^)]+\.woff2)\)format\("woff2"\),url\(\.\/[^)]+\.woff\)format\("woff"\)/g, (_, f) => {
  const b64 = readFileSync(`${dir}/${f}`).toString('base64');
  return `url(data:font/woff2;base64,${b64})format("woff2")`;
});
if (/\.woff/.test(css.replace(/data:font\/woff2/g, ''))) throw new Error('ficou uma letra por incluir');
if (js.includes('</script')) throw new Error('o JS contém </script');

const page = `<title>Colmeia Doce</title>
<style>
  /* Jogo de ecrã inteiro com um só visual (noite índigo/mel), igual em tema claro e escuro */
  :root { --bg: #26154A; --ink: #F5F2FF; --honey: #FFC23D; color-scheme: dark; }
  html, body { height: 100%; }
  body { margin: 0; background: linear-gradient(#120D2E, var(--bg) 55%, #43205A); color: var(--ink); overflow: hidden; overscroll-behavior: none;
    -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; touch-action: none; }
  #game { position: fixed; left: 0; right: 0; top: env(safe-area-inset-top, 0px); bottom: env(safe-area-inset-bottom, 0px);
    display: flex; align-items: center; justify-content: center; }
  #loading { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
  #loading .dot { width: 64px; height: 64px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #FFE29A, var(--honey) 55%, #E8961E);
    box-shadow: 0 0 40px rgba(255,182,39,.55);
    animation: b 0.9s ease-in-out infinite alternate; }
  @keyframes b { from { transform: translateY(0) } to { transform: translateY(-18px) } }
  @media (prefers-reduced-motion: reduce) { #loading .dot { animation: none; } }
${css}
</style>
<div id="loading"><div class="dot"></div></div>
<div id="game"></div>
<script type="module">
${js}
</script>
`;
writeFileSync('dist-web/colmeia-doce.html', page);
console.log(`dist-web/colmeia-doce.html: ${(page.length / 1024 / 1024).toFixed(2)} MB`);
