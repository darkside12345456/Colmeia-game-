// Arranque da app: fontes, gravação, serviços e jogo Phaser.
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import Phaser from 'phaser';
import { app } from './app';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HomeScene } from './scenes/HomeScene';
import { computeLayout, L } from './ui/core';

async function loadFonts(): Promise<void> {
  const fonts = ['800 40px "Baloo 2"', '700 40px "Baloo 2"', '700 20px "Nunito"', '800 20px "Nunito"'];
  const timeout = new Promise((r) => setTimeout(r, 3000));
  await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))), timeout]);
}

async function start(): Promise<void> {
  await Promise.all([loadFonts(), app.init()]);
  computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#FBF6EA',
    width: Math.round(L.W * L.K),
    height: Math.round(L.H * L.K),
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60 },
    disableContextMenu: true,
    banner: false,
    scene: [BootScene, HomeScene, GameScene],
  });
  game.events.once(Phaser.Core.Events.READY, () => document.getElementById('loading')?.remove());
  // O som só pode começar depois de um toque (regra dos browsers e do Android)
  const unlock = () => app.audio.unlock();
  window.addEventListener('pointerdown', unlock);
  app.startServices();
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game; __app: typeof app }).__game = game;
  if (import.meta.env.DEV) (window as unknown as { __app: typeof app }).__app = app;
}

void start();
