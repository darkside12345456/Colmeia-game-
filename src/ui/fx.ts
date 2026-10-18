// Efeitos: confetes, partículas, moedas a voar, pólen a flutuar, mão do tutorial.
import Phaser from 'phaser';
import { app } from '../app';
import { dur, L } from './core';

const CONFETTI_TINTS = [0xf2059f, 0x0293f2, 0x54c143, 0xf2ab27, 0x8302d2, 0x0fbf9f, 0xffffff];

export function confetti(scene: Phaser.Scene, x: number, y: number, count = 60, depth = 3000): void {
  const n = app.reducedMotion() ? Math.round(count / 3) : count;
  const em = scene.add.particles(x, y, 'px_confetti', {
    speed: { min: 260, max: 720 },
    angle: { min: 200, max: 340 },
    gravityY: 900,
    lifespan: 2200,
    rotate: { start: 0, end: 720 },
    scale: { min: 0.8, max: 1.4 },
    tint: CONFETTI_TINTS,
    emitting: false,
  });
  em.setDepth(depth);
  em.explode(n);
  scene.time.delayedCall(2600, () => em.destroy());
}

/** Explosão de partículas da cor de uma peça (quando chega a 0). */
export function burst(scene: Phaser.Scene, x: number, y: number, color: number, count = 18, depth = 600): void {
  const em = scene.add.particles(x, y, 'px_dot', {
    speed: { min: 120, max: 380 },
    lifespan: 520,
    scale: { start: 1.1, end: 0 },
    tint: [color, 0xffffff],
    emitting: false,
  });
  em.setDepth(depth);
  em.explode(app.reducedMotion() ? Math.round(count / 2) : count);
  const st = scene.add.particles(x, y, 'px_star', {
    speed: { min: 60, max: 220 },
    lifespan: 600,
    scale: { start: 0.7, end: 0 },
    rotate: { start: 0, end: 180 },
    emitting: false,
  });
  st.setDepth(depth + 1);
  st.explode(6);
  scene.time.delayedCall(800, () => {
    em.destroy();
    st.destroy();
  });
}

/** Ícones (moedas, prémios) a voar em arco até um destino. */
export function flyIcons(
  scene: Phaser.Scene,
  texture: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  n: number,
  onEach?: (i: number) => void,
  size = 56,
  depth = 4000,
): void {
  const count = Math.min(n, app.reducedMotion() ? 4 : 12);
  for (let i = 0; i < count; i++) {
    const img = scene.add.image(from.x, from.y, texture).setDisplaySize(size, size).setDepth(depth);
    const sx = from.x + Phaser.Math.Between(-80, 80);
    const sy = from.y + Phaser.Math.Between(-90, 30);
    const ctrl = { x: (sx + to.x) / 2 + Phaser.Math.Between(-120, 120), y: Math.min(sy, to.y) - 160 };
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(sx, sy), new Phaser.Math.Vector2(ctrl.x, ctrl.y), new Phaser.Math.Vector2(to.x, to.y));
    const o = { t: 0 };
    scene.tweens.add({ targets: img, x: sx, y: sy, duration: dur(180), ease: 'Quad.easeOut' });
    scene.tweens.add({
      targets: o,
      t: 1,
      delay: dur(200 + i * 55),
      duration: dur(620),
      ease: 'Quad.easeIn',
      onUpdate: () => {
        const p = curve.getPoint(o.t);
        img.setPosition(p.x, p.y);
      },
      onComplete: () => {
        img.destroy();
        onEach?.(i);
        if (i % 2 === 0) app.audio.play('coins');
      },
    });
  }
}

/** Pólen a flutuar (ecrã inicial). */
export function pollen(scene: Phaser.Scene, depth = 5): Phaser.GameObjects.Particles.ParticleEmitter {
  const em = scene.add.particles(0, 0, 'px_pollen', {
    x: { min: 0, max: L.W },
    y: { min: L.H * 0.2, max: L.H },
    lifespan: 6000,
    speedY: { min: -30, max: -10 },
    speedX: { min: -15, max: 15 },
    scale: { start: 0.4, end: 1.3 },
    alpha: { start: 0.9, end: 0 },
    frequency: app.reducedMotion() ? 900 : 260,
  });
  em.setDepth(depth);
  return em;
}

/** Brilho rápido (quadro a brilhar na vitória). */
export function flash(scene: Phaser.Scene, x: number, y: number, w: number, h: number, depth = 500): void {
  const r = scene.add.rectangle(x, y, w, h, 0xffffff, 0.75).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: r, alpha: 0, duration: dur(600), onComplete: () => r.destroy() });
}

/** Mão a apontar + escurecimento do resto (tutorial). Devolve função para remover. */
export function tutorialHand(scene: Phaser.Scene, x: number, y: number, hole: { x: number; y: number; w: number; h: number }, text?: string, textY?: number): () => void {
  const items: Phaser.GameObjects.GameObject[] = [];
  const dim = scene.add.graphics().setDepth(2000);
  dim.fillStyle(0x1a1206, 0.55);
  // escurece tudo menos o "buraco"
  dim.fillRect(0, 0, L.W, hole.y - hole.h / 2);
  dim.fillRect(0, hole.y + hole.h / 2, L.W, L.H - (hole.y + hole.h / 2));
  dim.fillRect(0, hole.y - hole.h / 2, hole.x - hole.w / 2, hole.h);
  dim.fillRect(hole.x + hole.w / 2, hole.y - hole.h / 2, L.W - (hole.x + hole.w / 2), hole.h);
  dim.lineStyle(6, 0xffffff, 0.9).strokeRoundedRect(hole.x - hole.w / 2, hole.y - hole.h / 2, hole.w, hole.h, 20);
  items.push(dim);
  const hand = scene.add.image(x + 40, y + 50, 'ic_hand').setDisplaySize(110, 110).setDepth(2002);
  scene.tweens.add({ targets: hand, x: x + 20, y: y + 30, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  items.push(hand);
  if (text) {
    const ty = textY ?? hole.y - hole.h / 2 - 80;
    const label = scene.add
      .text(L.W / 2, ty, text, {
        fontFamily: '"Baloo 2", sans-serif',
        fontSize: '36px',
        fontStyle: '800',
        color: '#FFFFFF',
        stroke: '#2E2412',
        strokeThickness: 7,
        align: 'center',
        wordWrap: { width: 620, useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setResolution(L.K)
      .setDepth(2002);
    items.push(label);
  }
  return () => items.forEach((i) => i.destroy());
}
