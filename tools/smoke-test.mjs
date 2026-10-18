// Smoke test: abre o jogo num Chromium em modo telemóvel (390x844), joga o nível 1 com a
// solução guardada, abre as janelas principais e falha se houver erros na consola.
// Uso: npm run test:e2e   (no Windows, uma vez: npx playwright install chromium)
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const OUT = process.env.SMOKE_OUT ?? 'test-results';
mkdirSync(OUT, { recursive: true });
const errors = [];

const server = await createServer({ server: { port: 5199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];

const exe = process.env.PLAYWRIGHT_CHROMIUM ?? (process.platform === 'linux' ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
let browser;
try {
  browser = await chromium.launch({ executablePath: exe && (await import('node:fs')).existsSync(exe) ? exe : undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
} catch (e) {
  console.error('Não consegui abrir o Chromium. No Windows corre uma vez: npx playwright install chromium');
  throw e;
}
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-PT' });
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`consola: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`erro: ${e.message}`));

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);
/** toque num ponto em coordenadas do jogo (0..720 x 0..H) */
async function tapAt(x, y) {
  const box = await page.locator('canvas').boundingBox();
  const k = box.width / 720;
  await page.mouse.click(box.x + x * k, box.y + y * k);
}
const L = () => page.evaluate(() => ({ W: 720, H: window.__game.scale.height / (window.__game.scale.width / 720) }));

async function step(name, fn) {
  try {
    await fn();
    console.log(`ok  ${name}`);
  } catch (e) {
    errors.push(`${name}: ${e.message}`);
    console.log(`ERRO ${name}: ${e.message}`);
  }
}

try {
  await page.goto(url);
  await page.waitForFunction(() => window.__game?.scene?.isActive('Home'), null, { timeout: 30000 });
  await wait(1500);
  const { H } = await L();
  await step('ecrã inicial', async () => shot('01-inicio'));

  await step('jogar nível 1', async () => {
    await tapAt(360, H - 300);
    await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 10000 });
    await wait(1500);
    await shot('02-nivel1-tutorial');
  });

  await step('ganhar o nível 1 com a solução', async () => {
    const solution = JSON.parse(readFileSync('levels/level_0001.json', 'utf8')).solution;
    for (const col of solution) {
      await page.waitForFunction(() => {
        const g = window.__game.scene.getScene('Game');
        return g.engine.isQuiescent() && g.state === 'play';
      }, null, { timeout: 60000 });
      const pos = await page.evaluate((c) => {
        const g = window.__game.scene.getScene('Game');
        return { x: g.colX[c], y: g.rowY[0] };
      }, col);
      await tapAt(pos.x, pos.y);
      await wait(250);
      if (col === solution[0]) await shot('03-abelhas-a-trabalhar');
    }
    await page.waitForFunction(() => window.__game.scene.getScene('Game').state === 'won', null, { timeout: 60000 });
    await wait(2600);
    await shot('04-vitoria');
  });

  await step('voltar ao início', async () => {
    const { H: h } = await L();
    await tapAt(360, h / 2 + 260);
    await page.waitForFunction(() => window.__game.scene.isActive('Home'), null, { timeout: 15000 });
    await wait(1200);
    await shot('05-inicio-nivel2');
  });

  await step('loja', async () => {
    await page.evaluate(async () => {
      const home = window.__game.scene.getScene('Home');
      const { shopModal } = await import('/src/scenes/menus.ts');
      shopModal(home);
    });
    await wait(900);
    await shot('06-loja');
    await page.evaluate(async () => {
      const { closeTopModal } = await import('/src/ui/Modal.ts');
      closeTopModal(window.__game.scene.getScene('Home'));
    });
    await wait(400);
  });

  await step('definições', async () => {
    await page.evaluate(async () => {
      const home = window.__game.scene.getScene('Home');
      const { settingsModal } = await import('/src/scenes/menus.ts');
      settingsModal(home, () => {});
    });
    await wait(800);
    await shot('07-definicoes');
    await page.evaluate(async () => {
      const { closeTopModal } = await import('/src/ui/Modal.ts');
      closeTopModal(window.__game.scene.getScene('Home'));
    });
    await wait(400);
  });

  await step('eventos (nível 30 simulado)', async () => {
    await page.evaluate(async () => {
      window.__app.save.level = 30;
      const home = window.__game.scene.getScene('Home');
      const m = await import('/src/scenes/eventModals.ts');
      window.__ev = m;
      m.dailyModal(home, () => {});
    });
    await wait(900);
    await shot('08-premio-diario');
    for (const [name, fn] of [
      ['09-passe', 'passModal'],
      ['10-tesouro', 'treasureModal'],
      ['11-corrida', 'raceModal'],
      ['12-girassol', 'sunflowerModal'],
      ['13-colmeia', 'hiveModal'],
    ]) {
      await page.evaluate(async (f) => {
        const home = window.__game.scene.getScene('Home');
        const { closeTopModal } = await import('/src/ui/Modal.ts');
        while (closeTopModal(home));
        window.__ev[f](home, () => {});
      }, fn);
      await wait(900);
      await shot(name);
    }
    await page.evaluate(async () => {
      const { closeTopModal } = await import('/src/ui/Modal.ts');
      const home = window.__game.scene.getScene('Home');
      while (closeTopModal(home));
    });
  });

  await step('acelerar 2x e jogo grande (nível 280)', async () => {
    await page.evaluate(async () => {
      const { loadLevel } = await import('/src/levels.ts');
      window.__app.save.level = 280;
      const level = await loadLevel(280);
      window.__game.scene.getScene('Home').scene.start('Game', { level });
    });
    await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 10000 });
    await wait(1500);
    await page.evaluate(async () => {
      const { speedModal } = await import('/src/scenes/modals.ts');
      speedModal(window.__game.scene.getScene('Game'));
    });
    await wait(800);
    await shot('14-acelerar-2x');
    await page.evaluate(async () => {
      const { closeTopModal } = await import('/src/ui/Modal.ts');
      const g = window.__game.scene.getScene('Game');
      while (closeTopModal(g));
      const { recordLongSpeedAd } = await import('/src/meta/economy.ts');
      recordLongSpeedAd(window.__app.save, window.__app.now());
      g.refreshSpeed();
      // joga 6 toques possíveis
      for (let i = 0; i < 6; i++) {
        g.engine.runToQuiescence();
        const legal = g.engine.legalTaps();
        if (!legal.length) break;
        g.engine.tap(legal[0]);
      }
      g.renderColumns(true);
    });
    await wait(1500);
    await shot('15-nivel-grande-2x');
    const fps = await page.evaluate(() => window.__game.loop.actualFps);
    console.log(`fps (Chromium por software, sem GPU): ${fps.toFixed(1)}`);
  });
} finally {
  await browser.close();
  await server.close();
}

if (errors.length) {
  console.error(`\n${errors.length} problema(s):\n` + errors.join('\n'));
  process.exit(1);
}
console.log(`\nSmoke test OK - capturas em ${OUT}/`);
