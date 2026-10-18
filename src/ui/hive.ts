// A colmeia do jogador (Construir a Colmeia): cada etapa completa acrescenta uma decoração.
import Phaser from 'phaser';
import { ellipse, LINE, rr, shade, strokeFill, type Ctx } from '../art/canvas';
import { ensureTexture } from '../art/textures';

function flower(ctx: Ctx, x: number, y: number, r: number, petal: string): void {
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    ellipse(ctx, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.45, r * 0.45);
    strokeFill(ctx, petal, 2.5);
  }
  ellipse(ctx, x, y, r * 0.38, r * 0.38);
  strokeFill(ctx, '#F7C531', 2.5);
}

function textures(scene: Phaser.Scene): void {
  ensureTexture(scene, 'hive_body', 300, 300, (ctx) => {
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const w = 130 + i * 30 - (i === bands - 1 ? 24 : 0);
      const y = 40 + i * 46;
      rr(ctx, 150 - w / 2, y, w, 56, 28);
      const g = ctx.createLinearGradient(0, y, 0, y + 56);
      const c = i % 2 === 0 ? '#F7B92E' : '#E3A126';
      g.addColorStop(0, shade(c, 0.3));
      g.addColorStop(1, shade(c, -0.12));
      strokeFill(ctx, g, 5);
    }
    ellipse(ctx, 150, 225, 30, 26);
    strokeFill(ctx, '#3A2610', 5);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ellipse(ctx, 105, 70, 18, 8, -0.4);
    ctx.fill();
  });
  ensureTexture(scene, 'hive_base', 360, 90, (ctx) => {
    for (let i = 0; i < 7; i++) {
      const x = 30 + i * 50;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        ctx.lineTo(x + Math.cos(a) * 28, 45 + Math.sin(a) * 28);
      }
      ctx.closePath();
      strokeFill(ctx, i % 2 ? '#F7C960' : '#E8B04A', 4);
    }
  });
  ensureTexture(scene, 'hive_doorflowers', 200, 80, (ctx) => {
    flower(ctx, 30, 50, 22, '#FF4FA3');
    flower(ctx, 170, 50, 22, '#F7A8CF');
    flower(ctx, 100, 22, 16, '#FFFFFF');
  });
  ensureTexture(scene, 'hive_roof', 260, 110, (ctx) => {
    for (const [x, y, rot] of [
      [60, 70, -0.8],
      [110, 50, -0.3],
      [150, 50, 0.3],
      [200, 70, 0.8],
      [130, 30, 0],
    ] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ellipse(ctx, 0, 0, 22, 44);
      strokeFill(ctx, '#22C98A', 4);
      ctx.beginPath();
      ctx.moveTo(0, -38);
      ctx.lineTo(0, 38);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = LINE;
      ctx.stroke();
      ctx.restore();
    }
  });
  ensureTexture(scene, 'hive_garden', 520, 140, (ctx) => {
    const cols = ['#FF4FA3', '#4F7BFF', '#8B5CF6', '#F7A8CF', '#FFFFFF', '#FFB020'];
    for (let i = 0; i < 9; i++) {
      const x = 30 + i * 58 + (i > 3 ? 70 : 0) - (i > 3 ? 70 : 0);
      if (i === 4) continue;
      ctx.beginPath();
      ctx.moveTo(x, 135);
      ctx.lineTo(x, 70 + (i % 3) * 12);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#3E8F33';
      ctx.stroke();
      flower(ctx, x, 62 + (i % 3) * 12, 20, cols[i % cols.length]);
    }
  });
  ensureTexture(scene, 'hive_flag', 120, 170, (ctx) => {
    rr(ctx, 20, 10, 10, 158, 4);
    strokeFill(ctx, '#7A4A22', 3);
    ctx.beginPath();
    ctx.moveTo(30, 14);
    ctx.lineTo(112, 34);
    ctx.lineTo(30, 62);
    ctx.closePath();
    strokeFill(ctx, '#FF4FA3', 4);
    ctx.beginPath();
    ctx.moveTo(48, 30);
    ctx.lineTo(56, 22);
    ctx.lineTo(64, 30);
    ctx.lineTo(72, 22);
    ctx.lineTo(80, 32);
    ctx.lineTo(48, 42);
    ctx.closePath();
    strokeFill(ctx, '#F7C531', 2);
  });
}

/** Desenha a colmeia com as decorações das etapas já concluídas. */
export function hiveView(scene: Phaser.Scene, x: number, y: number, stage: number, scale = 1): Phaser.GameObjects.Container {
  textures(scene);
  const c = scene.add.container(x, y);
  if (stage >= 4) c.add(scene.add.image(0, 110, 'hive_garden'));
  if (stage >= 1) c.add(scene.add.image(0, 140, 'hive_base'));
  c.add(scene.add.image(0, 0, 'hive_body'));
  if (stage >= 3) c.add(scene.add.image(0, -122, 'hive_roof'));
  if (stage >= 2) c.add(scene.add.image(0, 112, 'hive_doorflowers'));
  if (stage >= 5) c.add(scene.add.image(36, -200, 'hive_flag'));
  c.setScale(scale);
  return c;
}
