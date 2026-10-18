// Gera todas as texturas do jogo por código. Se uma imagem com o mesmo nome já tiver sido
// carregada a partir de um PNG (assets/manifest.json), a versão desenhada não é criada.
// Estilo: gemas/vidro com brilho, janelas de vidro fosco, sem contornos pretos grossos.
import Phaser from 'phaser';
import { PALETTE } from '../core/palette';
import { THEME } from '../ui/theme';
import { BEE_COLORS, drawBee, type BeeChar } from './bee';
import { BEE_CHARS, BEE_EXPRS } from './keys';
import { ellipse, glossyCircle, glossyTile, rgba, rr, shade, star, strokeFill, type Ctx } from './canvas';
import { ICONS } from './icons';

export function ensureTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, Math.ceil(w), Math.ceil(h));
  if (!tex) return key;
  const ctx = tex.getContext();
  draw(ctx);
  tex.refresh();
  return key;
}

export function buildTextures(scene: Phaser.Scene): void {
  for (const [name, fn] of Object.entries(ICONS)) {
    ensureTexture(scene, `ic_${name}`, 128, 128, (ctx) => fn(ctx, 128));
  }
  for (const c of PALETTE) {
    // gemas com um pequeno espaço à volta (os blocos ficam separados, como contas de vidro)
    ensureTexture(scene, `block_${c.id}`, 64, 64, (ctx) => glossyTile(ctx, 5, 4, 54, 54, 15, c.hex));
    ensureTexture(scene, `piece_${c.id}`, 128, 128, (ctx) => glossyTile(ctx, 10, 8, 108, 108, 32, c.hex));
    ensureTexture(scene, `bud_${c.id}`, 64, 64, (ctx) => drawBud(ctx, c.hex));
  }
  ensureTexture(scene, 'ic_speed_badge', 128, 128, (ctx) => {
    glossyCircle(ctx, 64, 64, 54, THEME.glowBlue);
    ctx.save();
    ctx.translate(26, 26);
    ICONS.speed(ctx, 76);
    ctx.restore();
  });
  ensureTexture(scene, 'stone', 64, 64, drawStone);
  ensureTexture(scene, 'piece_hidden', 128, 128, (ctx) => glossyTile(ctx, 10, 8, 108, 108, 32, '#6E6894'));
  ensureTexture(scene, 'slot', 120, 120, drawSlot);
  ensureTexture(scene, 'hive_door', 220, 120, drawHiveDoor);
  ensureTexture(scene, 'cloud', 256, 256, drawBokeh);
  ensureTexture(scene, 'leaf', 48, 48, (ctx) => ICONS.folha(ctx, 48));
  ensureTexture(scene, 'px_dot', 24, 24, (ctx) => {
    const g = ctx.createRadialGradient(12, 12, 1, 12, 12, 12);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 24, 24);
  });
  ensureTexture(scene, 'px_confetti', 14, 9, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, 0, 0, 14, 9, 2);
    ctx.fill();
  });
  ensureTexture(scene, 'px_star', 32, 32, (ctx) => {
    star(ctx, 16, 16, 15, 4, 0.35);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  });
  ensureTexture(scene, 'px_pollen', 20, 20, (ctx) => {
    const g = ctx.createRadialGradient(10, 10, 1, 10, 10, 10);
    g.addColorStop(0, 'rgba(255,240,190,1)');
    g.addColorStop(0.5, 'rgba(255,194,61,0.7)');
    g.addColorStop(1, 'rgba(255,194,61,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 20, 20);
  });
  for (const ch of BEE_CHARS) {
    for (const ex of BEE_EXPRS) {
      ensureTexture(scene, `bee_${ch}_${ex}`, 256, 256, (ctx) => drawBee(ctx, 128, 140, 190, ch, ex, 0.5));
    }
  }
  // abelha pequena do enxame, de lado, 3 posições das asas
  [0, 0.5, 1].forEach((wing, i) => ensureTexture(scene, `bee_fly_${i}`, 72, 72, (ctx) => drawBee(ctx, 36, 40, 46, 'mel', 'happy', wing, true)));
}

function drawBud(ctx: Ctx, hex: string): void {
  // flor fechada: botão com pétalas fechadas da cor do bloco, sobre uma gema verde-escura
  glossyTile(ctx, 5, 4, 54, 54, 15, '#2F6B4F');
  ctx.save();
  ctx.translate(32, 32);
  for (const [rot, sc] of [
    [-0.45, 0.85],
    [0.45, 0.85],
    [0, 0.95],
  ] as const) {
    ctx.save();
    ctx.rotate(rot);
    ellipse(ctx, 0, -3, 10 * sc, 17 * sc);
    strokeFill(ctx, shade(hex, rot === 0 ? 0.2 : -0.05), 1.5, 'rgba(255,255,255,0.35)');
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ellipse(ctx, -3, -11, 2.5, 5);
  ctx.fill();
  ctx.restore();
}

function drawStone(ctx: Ctx): void {
  glossyTile(ctx, 5, 4, 54, 54, 15, '#4A4560');
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(16, 18);
  ctx.lineTo(25, 25);
  ctx.lineTo(21, 34);
  ctx.moveTo(44, 14);
  ctx.lineTo(40, 23);
  ctx.moveTo(46, 44);
  ctx.lineTo(39, 40);
  ctx.stroke();
}

function drawSlot(ctx: Ctx): void {
  // poço de vidro escuro com sombra interior
  rr(ctx, 6, 6, 108, 108, 30);
  ctx.fillStyle = 'rgba(8,4,24,0.45)';
  ctx.fill();
  ctx.save();
  rr(ctx, 6, 6, 108, 108, 30);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 6, 0, 114);
  g.addColorStop(0, 'rgba(0,0,0,0.35)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.03)');
  g.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 120, 120);
  ctx.restore();
  rr(ctx, 6.5, 6.5, 107, 107, 30);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.stroke();
}

function drawHiveDoor(ctx: Ctx): void {
  // entrada da colmeia: portal hexagonal dourado com brilho
  const glow = ctx.createRadialGradient(110, 64, 10, 110, 64, 105);
  glow.addColorStop(0, rgba(THEME.accent, 0.45));
  glow.addColorStop(1, rgba(THEME.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 220, 120);
  const hexPath = (r: number, sy: number) => {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      ctx.lineTo(110 + Math.cos(a) * r, 62 + Math.sin(a) * r * sy);
    }
    ctx.closePath();
  };
  hexPath(78, 0.62);
  const ring = ctx.createLinearGradient(0, 14, 0, 110);
  ring.addColorStop(0, '#FFE08A');
  ring.addColorStop(1, '#E8961E');
  ctx.fillStyle = ring;
  ctx.fill();
  hexPath(58, 0.6);
  const hole = ctx.createRadialGradient(110, 70, 4, 110, 62, 60);
  hole.addColorStop(0, '#05030E');
  hole.addColorStop(1, '#2A1A3E');
  ctx.fillStyle = hole;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ellipse(ctx, 70, 34, 16, 4, -0.3);
  ctx.fill();
}

/** Luz desfocada (bokeh) para o ambiente. */
function drawBokeh(ctx: Ctx): void {
  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
}

/** Botão em pílula com gradiente, brilho de vidro e sombra colorida suave. */
export function buttonTexture(scene: Phaser.Scene, w: number, h: number, color: string): string {
  return ensureTexture(scene, `btn_${color}_${w}x${h}`, w, h + 10, (ctx) => {
    const r = Math.min(h / 2, 34);
    ctx.save();
    ctx.shadowColor = rgba(color, 0.55);
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    rr(ctx, 6, 4, w - 12, h - 10, r);
    ctx.fillStyle = shade(color, -0.15);
    ctx.fill();
    ctx.restore();
    rr(ctx, 6, 4, w - 12, h - 10, r);
    const g = ctx.createLinearGradient(0, 4, 0, h - 6);
    g.addColorStop(0, shade(color, 0.28));
    g.addColorStop(1, shade(color, -0.12));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    rr(ctx, 6, 4, w - 12, h - 10, r);
    ctx.clip();
    const gl = ctx.createLinearGradient(0, 4, 0, h * 0.5);
    gl.addColorStop(0, 'rgba(255,255,255,0.38)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl;
    rr(ctx, 12, 7, w - 24, (h - 10) * 0.45, r * 0.8);
    ctx.fill();
    ctx.restore();
    rr(ctx, 6.75, 4.75, w - 13.5, h - 11.5, r);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();
  });
}

/** Janela de vidro fosco escuro. */
export function panelTexture(scene: Phaser.Scene, w: number, h: number): string {
  return ensureTexture(scene, `panel_${w}x${h}`, w, h, (ctx) => {
    const r = 44;
    ctx.save();
    ctx.shadowColor = THEME.shadow;
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    rr(ctx, 14, 10, w - 28, h - 30, r);
    ctx.fillStyle = THEME.panelBottom;
    ctx.fill();
    ctx.restore();
    rr(ctx, 14, 10, w - 28, h - 30, r);
    const g = ctx.createLinearGradient(0, 10, 0, h - 20);
    g.addColorStop(0, THEME.panelTop);
    g.addColorStop(1, THEME.panelBottom);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    rr(ctx, 14, 10, w - 28, h - 30, r);
    ctx.clip();
    const glow = ctx.createRadialGradient(w * 0.3, 0, 10, w * 0.3, 0, w * 0.9);
    glow.addColorStop(0, rgba(THEME.accent, 0.16));
    glow.addColorStop(1, rgba(THEME.accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    rr(ctx, 14.75, 10.75, w - 29.5, h - 31.5, r);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.stroke();
  });
}

/** Cartão interior (linhas da loja, prémios): vidro mais claro, com tinta opcional. */
export function cardTexture(scene: Phaser.Scene, w: number, h: number, color: string = THEME.card): string {
  return ensureTexture(scene, `card_${color}_${w}x${h}`, w, h, (ctx) => {
    const tint = color !== THEME.card;
    rr(ctx, 2, 2, w - 4, h - 6, 24);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, tint ? rgba(color, 0.32) : THEME.cardHi);
    g.addColorStop(1, tint ? rgba(color, 0.14) : THEME.card);
    ctx.fillStyle = g;
    ctx.fill();
    rr(ctx, 2.75, 2.75, w - 5.5, h - 7.5, 24);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = tint ? rgba(color, 0.55) : 'rgba(255,255,255,0.12)';
    ctx.stroke();
  });
}

/** Bandeja de vidro escuro onde fica o quadro de blocos. */
export function frameTexture(scene: Phaser.Scene, w: number, h: number): string {
  return ensureTexture(scene, `frame_${w}x${h}`, w, h, (ctx) => {
    ctx.save();
    ctx.shadowColor = THEME.shadow;
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 8;
    rr(ctx, 10, 6, w - 20, h - 22, 34);
    ctx.fillStyle = 'rgba(16,10,40,0.75)';
    ctx.fill();
    ctx.restore();
    rr(ctx, 10, 6, w - 20, h - 22, 34);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.09)');
    g.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.stroke();
  });
}

/** Fundo da app: noite índigo/ameixa com brilhos cor de mel e favos muito subtis. */
export function backgroundTexture(scene: Phaser.Scene, w: number, h: number): string {
  return ensureTexture(scene, `bg_${w}x${h}`, w, h, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, THEME.bgTop);
    g.addColorStop(0.55, THEME.bgMid);
    g.addColorStop(1, THEME.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const glow = (x: number, y: number, r: number, c: string, a: number) => {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, rgba(c, a));
      rg.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    };
    glow(w * 0.5, h * 0.42, w * 0.75, THEME.glowHoney, 0.2);
    glow(w * 0.05, h * 0.12, w * 0.6, THEME.glowBlue, 0.22);
    glow(w * 0.95, h * 0.85, w * 0.7, THEME.glowPink, 0.18);
    // favos muito subtis
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 2;
    const s = 46;
    for (let row = -1; row < h / (s * 1.5) + 1; row++) {
      for (let col = -1; col < w / (s * 1.73) + 1; col++) {
        const cx = col * s * 1.73 + (row % 2 ? s * 0.866 : 0);
        const cy = row * s * 1.5;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + (k * Math.PI) / 3;
          ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  });
}

/** Avatar redondo com a cara da Mel. */
export function avatarTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'avatar_mel', 128, 128, (ctx) => {
    glossyCircle(ctx, 64, 64, 56, '#3A2F72');
    ctx.save();
    ctx.beginPath();
    ctx.arc(64, 64, 53, 0, Math.PI * 2);
    ctx.clip();
    drawBee(ctx, 64, 84, 112, 'mel', 'happy');
    ctx.restore();
  });
}

/** Abelha de uma cor qualquer (rivais da corrida). */
export function rivalTexture(scene: Phaser.Scene, idx: number): string {
  const chars: BeeChar[] = ['lila', 'azu', 'menta', 'rainha'];
  const ch = chars[idx % chars.length];
  return ensureTexture(scene, `rival_${idx}`, 96, 96, (ctx) => drawBee(ctx, 48, 54, 70, ch, 'focused'));
}

export { BEE_COLORS };
