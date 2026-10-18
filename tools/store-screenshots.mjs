// Capturas para a ficha da Google Play (1080x1920) e teste de ecrã pequeno (360x640).
// Uso: node tools/store-screenshots.mjs   -> store/screenshots/*.png
import { existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const OUT = 'store/screenshots';
mkdirSync(OUT, { recursive: true });
const server = await createServer({ server: { port: 5193, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: existsSync(exe) ? exe : undefined });
const errors = [];
for (const lang of ['pt-PT', 'en']) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: lang });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => window.__game?.scene?.isActive('Home'), null, { timeout: 30000 });
  const prep = async (level) =>
    page.evaluate(async (level) => {
      const s = window.__app.save;
      s.level = level;
      s.coins = 2450;
      for (const k of ['slot', 'shuffle', 'tweezers', 'magnet']) {
        s.boostersIntroduced[k] = true;
        s.boosters[k] = 3;
      }
      for (const k of ['twins', 'tubes', 'stones', 'hidden', 'flowers', 'boxes', 'locks']) s.seen['obs_' + k] = true;
      s.seen.tut_tap = true;
      s.seen.tut_tray = true;
      s.purchases.starterPackSeen = true;
      s.daily.lastClaimDay = 'x';
      // sem o banner de teste nas capturas da loja
      const { applyRemoteConfig } = await import('/src/meta/config.ts');
      applyRemoteConfig({ ads: { bannerEnabled: false } });
    }, level);
  await prep(37);
  await page.evaluate(() => window.__game.scene.getScene('Home').scene.restart());
  await page.waitForTimeout(1800);
  await page.evaluate(async () => {
    const { closeTopModal } = await import('/src/ui/Modal.ts');
    while (closeTopModal(window.__game.scene.getScene('Home')));
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${lang}-1-inicio.png` });
  for (const [n, name] of [
    [44, '2-jogo'],
    [96, '3-jogo-grande'],
  ]) {
    await page.evaluate(async (n) => {
      const { loadLevel } = await import('/src/levels.ts');
      window.__game.scene.getScenes(true)[0].scene.start('Game', { level: await loadLevel(n) });
    }, n);
    await page.waitForFunction(() => window.__game.scene.getScene('Game')?.state === 'play', null, { timeout: 30000 });
    await page.evaluate(() => {
      const g = window.__game.scene.getScene('Game');
      const e = g.engine;
      for (let i = 0; i < 3; i++) {
        const l = e.legalTaps().filter((c) => e.countReachable(e.pieces.get(e.columns[c][0]).color) > 0);
        if (l.length) e.tap(l[0]);
      }
      g.handleEvents(e.flush());
      g.renderColumns(true);
    });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}/${lang}-${name}.png` });
  }
  await page.evaluate(async () => {
    const g = window.__game.scene.getScene('Game');
    const { speedModal } = await import('/src/scenes/modals.ts');
    speedModal(g);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${lang}-4-acelerar.png` });
  await page.evaluate(async () => {
    const { passModal } = await import('/src/scenes/eventModals.ts');
    const { closeTopModal } = await import('/src/ui/Modal.ts');
    const g = window.__game.scene.getScene('Game');
    while (closeTopModal(g));
    window.__app.save.pass.tickets = 14;
    passModal(g);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${lang}-5-passe.png` });
  await page.close();
}
await browser.close();
await server.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('capturas em', OUT);
