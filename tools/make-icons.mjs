// Gera o ícone da app, o ecrã de arranque (splash) e as imagens da loja a partir da arte
// procedural do jogo (a Mel). Usa o Chromium (Playwright) para desenhar em canvas.
// Uso: node tools/make-icons.mjs
import { mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';

const RES = 'android/app/src/main/res';
const STORE = 'store';
mkdirSync(STORE, { recursive: true });

const server = await createServer({ server: { port: 5194, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: existsSync(exe) ? exe : undefined });
const page = await browser.newPage();
await page.goto(server.resolvedUrls.local[0]);
await page.waitForFunction(() => window.__game, null, { timeout: 30000 });

/** Desenha no browser e devolve o PNG (base64). kind: icon | iconRound | foreground | splash | feature */
async function render(kind, w, h) {
  const b64 = await page.evaluate(
    async ({ kind, w, h }) => {
      const { drawBee } = await import('/src/art/bee.ts');
      const { rr, glossyTile } = await import('/src/art/canvas.ts');
      await document.fonts.load('700 80px "Outfit"');
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      // fundo noturno índigo/ameixa com brilho cor de mel (mesmo estilo do jogo)
      const nightBg = (x, y, ww, hh, gx = 0.5, gy = 0.5) => {
        const g = ctx.createLinearGradient(0, y, 0, y + hh);
        g.addColorStop(0, '#120D2E');
        g.addColorStop(0.55, '#26154A');
        g.addColorStop(1, '#43205A');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, ww, hh);
        const glow = (cx, cy, r, rgb, a) => {
          const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          rg.addColorStop(0, `rgba(${rgb},${a})`);
          rg.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = rg;
          ctx.fillRect(x, y, ww, hh);
        };
        const m = Math.max(ww, hh);
        glow(x + ww * gx, y + hh * gy, m * 0.55, '255,182,39', 0.42);
        glow(x + ww * 0.05, y + hh * 0.1, m * 0.5, '91,124,255', 0.25);
        glow(x + ww * 0.95, y + hh * 0.9, m * 0.5, '255,95,162', 0.22);
      };
      const title = (text, x, y, size) => {
        ctx.font = `700 ${size}px "Outfit"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.shadowColor = 'rgba(8,4,24,0.7)';
        ctx.shadowBlur = size * 0.25;
        ctx.shadowOffsetY = size * 0.05;
        const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
        g.addColorStop(0, '#FFFFFF');
        g.addColorStop(1, '#FFD98A');
        ctx.fillStyle = g;
        ctx.fillText(text, x, y);
        ctx.restore();
      };
      if (kind === 'icon' || kind === 'iconRound' || kind === 'store') {
        ctx.save();
        if (kind === 'icon') {
          rr(ctx, 0, 0, w, h, w * 0.2);
          ctx.clip();
        } else if (kind === 'iconRound') {
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
          ctx.clip();
        }
        nightBg(0, 0, w, h, 0.5, 0.55);
        drawBee(ctx, w / 2, h * 0.56, w * 0.66, 'mel', 'happy');
        ctx.restore();
      } else if (kind === 'foreground') {
        // ícone adaptativo: só a abelha, dentro da zona segura (66 de 108)
        drawBee(ctx, w / 2, h * 0.54, w * 0.46, 'mel', 'happy');
      } else if (kind === 'splash') {
        nightBg(0, 0, w, h, 0.5, 0.45);
        const m = Math.min(w, h);
        drawBee(ctx, w / 2, h / 2 - m * 0.08, m * 0.36, 'mel', 'happy');
        title('Colmeia Doce', w / 2, h / 2 + m * 0.24, m * 0.1);
      } else if (kind === 'feature') {
        nightBg(0, 0, w, h, 0.3, 0.55);
        // quadro de blocos (coração) em gemas
        const heart = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
        const cs = 36;
        heart.forEach((row, j) =>
          row.split('').forEach((v, i) => {
            if (v === '1') glossyTile(ctx, 590 + i * cs, 70 + j * cs, cs - 5, cs - 5, 9, '#FF4FA3');
            else glossyTile(ctx, 590 + i * cs + 8, 70 + j * cs + 8, cs - 21, cs - 21, 5, '#463C82');
          }),
        );
        drawBee(ctx, 260, 260, 280, 'mel', 'celebrate');
        drawBee(ctx, 520, 100, 80, 'lila', 'happy');
        drawBee(ctx, 950, 150, 90, 'azu', 'happy');
        title('Colmeia Doce', 715, 400, 76);
      }
      return c.toDataURL('image/png').split(',')[1];
    },
    { kind, w, h },
  );
  return Buffer.from(b64, 'base64');
}

const write = (path, buf) => {
  writeFileSync(path, buf);
  console.log('gravado', path);
};

// ícones Android
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(dens)) {
  write(join(RES, `mipmap-${d}`, 'ic_launcher.png'), await render('icon', 48 * k, 48 * k));
  write(join(RES, `mipmap-${d}`, 'ic_launcher_round.png'), await render('iconRound', 48 * k, 48 * k));
  write(join(RES, `mipmap-${d}`, 'ic_launcher_foreground.png'), await render('foreground', 108 * k, 108 * k));
}
// ecrãs de arranque: mesmas dimensões dos ficheiros do modelo
for (const dir of readdirSync(RES).filter((x) => x.startsWith('drawable'))) {
  const f = join(RES, dir, 'splash.png');
  if (!existsSync(f)) continue;
  const { width, height } = PNG.sync.read(readFileSync(f));
  write(f, await render('splash', width, height));
}
// loja
write(join(STORE, 'icon-512.png'), await render('store', 512, 512));
write(join(STORE, 'feature-1024x500.png'), await render('feature', 1024, 500));

await browser.close();
await server.close();
