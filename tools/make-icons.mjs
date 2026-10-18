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
      const { rr, shade } = await import('/src/art/canvas.ts');
      await document.fonts.load('800 80px "Baloo 2"');
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      const honeyBg = (x, y, ww, hh) => {
        const g = ctx.createRadialGradient(x + ww * 0.35, y + hh * 0.3, 10, x + ww / 2, y + hh / 2, Math.max(ww, hh) * 0.75);
        g.addColorStop(0, '#FFE08A');
        g.addColorStop(0.6, '#F7B92E');
        g.addColorStop(1, '#E39B1E');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, ww, hh);
        // favos subtis
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = Math.max(2, ww / 160);
        const s = ww / 7;
        for (let row = -1; row < 9; row++)
          for (let col = -1; col < 9; col++) {
            const cx = x + col * s * 1.5;
            const cy = y + row * s * 0.87 * 2 + (col % 2 ? s * 0.87 : 0);
            ctx.beginPath();
            for (let k = 0; k < 6; k++) ctx.lineTo(cx + Math.cos((k * Math.PI) / 3) * s * 0.9, cy + Math.sin((k * Math.PI) / 3) * s * 0.9);
            ctx.closePath();
            ctx.stroke();
          }
      };
      const title = (text, x, y, size) => {
        ctx.font = `800 ${size}px "Baloo 2"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = size * 0.18;
        ctx.strokeStyle = '#2E2412';
        ctx.fillStyle = '#2E2412';
        ctx.fillText(text, x, y + size * 0.07);
        ctx.strokeText(text, x, y + size * 0.07);
        ctx.strokeText(text, x, y);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, x, y);
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
        honeyBg(0, 0, w, h);
        drawBee(ctx, w / 2, h * 0.56, w * 0.66, 'mel', 'happy');
        ctx.restore();
      } else if (kind === 'foreground') {
        // ícone adaptativo: só a abelha, dentro da zona segura (66 de 108)
        drawBee(ctx, w / 2, h * 0.54, w * 0.46, 'mel', 'happy');
      } else if (kind === 'splash') {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#CDEBFA');
        g.addColorStop(1, '#FBF6EA');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        const m = Math.min(w, h);
        drawBee(ctx, w / 2, h / 2 - m * 0.08, m * 0.36, 'mel', 'happy');
        title('Colmeia Doce', w / 2, h / 2 + m * 0.24, m * 0.1);
      } else if (kind === 'feature') {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#7CC8F7');
        g.addColorStop(1, '#CDEBFA');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#54C143';
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * 0.78 + Math.sin(x / 90) * 14);
        ctx.lineTo(w, h);
        ctx.fill();
        // quadro de blocos (coração)
        const heart = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
        const cs = 34;
        heart.forEach((row, j) =>
          row.split('').forEach((v, i) => {
            const color = v === '1' ? '#F2059F' : '#FBF6EA';
            const bx = 560 + i * cs;
            const by = 90 + j * cs;
            rr(ctx, bx, by, cs - 3, cs - 3, 7);
            ctx.fillStyle = shade(color, -0.3);
            ctx.fill();
            rr(ctx, bx, by, cs - 3, cs - 6, 7);
            ctx.fillStyle = color;
            ctx.fill();
          }),
        );
        drawBee(ctx, 240, 270, 280, 'mel', 'celebrate');
        drawBee(ctx, 520, 90, 80, 'lila', 'happy');
        drawBee(ctx, 920, 170, 100, 'azu', 'happy');
        title('Colmeia Doce', 700, 400, 76);
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
