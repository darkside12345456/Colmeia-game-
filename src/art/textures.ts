// Gera todas as texturas do jogo por código. Se uma imagem com o mesmo nome já tiver sido
// carregada a partir de um PNG (assets/manifest.json), a versão desenhada não é criada.
import Phaser from 'phaser';
import { PALETTE } from '../core/palette';
import { BEE_COLORS, drawBee, type BeeChar } from './bee';
import { BEE_CHARS, BEE_EXPRS } from './keys';
import { ellipse, glossyCircle, glossyTile, INK, rr, shade, star, strokeFill, type Ctx } from './canvas';
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
    ensureTexture(scene, `block_${c.id}`, 64, 64, (ctx) => glossyTile(ctx, 2, 2, 60, 60, 12, c.hex));
    ensureTexture(scene, `piece_${c.id}`, 128, 128, (ctx) => glossyTile(ctx, 4, 4, 120, 120, 26, c.hex));
    ensureTexture(scene, `bud_${c.id}`, 64, 64, (ctx) => drawBud(ctx, c.hex));
  }
  ensureTexture(scene, 'ic_speed_badge', 128, 128, (ctx) => {
    glossyCircle(ctx, 64, 64, 56, '#0293F2');
    ctx.save();
    ctx.translate(26, 26);
    ICONS.speed(ctx, 76);
    ctx.restore();
  });
  ensureTexture(scene, 'stone', 64, 64, drawStone);
  ensureTexture(scene, 'piece_hidden', 128, 128, (ctx) => glossyTile(ctx, 4, 4, 120, 120, 26, '#9AA3AD'));
  ensureTexture(scene, 'slot', 120, 120, drawSlot);
  ensureTexture(scene, 'hive_door', 220, 120, drawHiveDoor);
  ensureTexture(scene, 'cloud', 256, 128, drawCloud);
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
    g.addColorStop(0, 'rgba(255,240,170,1)');
    g.addColorStop(0.5, 'rgba(247,197,49,0.8)');
    g.addColorStop(1, 'rgba(247,197,49,0)');
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
  // flor fechada: botão com pétalas fechadas da cor do bloco, sobre fundo verde
  glossyTile(ctx, 2, 2, 60, 60, 12, '#3E8F33');
  ctx.save();
  ctx.translate(32, 34);
  for (const [rot, sc] of [
    [-0.45, 0.9],
    [0.45, 0.9],
    [0, 1],
  ] as const) {
    ctx.save();
    ctx.rotate(rot);
    ellipse(ctx, 0, -4, 11 * sc, 19 * sc);
    strokeFill(ctx, shade(hex, rot === 0 ? 0.15 : -0.1), 2.4);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ellipse(ctx, -3, -12, 3, 6);
  ctx.fill();
  ctx.restore();
}

function drawStone(ctx: Ctx): void {
  glossyTile(ctx, 2, 2, 60, 60, 12, '#5B4A3A');
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, 16);
  ctx.lineTo(24, 24);
  ctx.lineTo(20, 34);
  ctx.moveTo(44, 12);
  ctx.lineTo(40, 22);
  ctx.moveTo(46, 44);
  ctx.lineTo(38, 40);
  ctx.stroke();
}

function drawSlot(ctx: Ctx): void {
  rr(ctx, 4, 6, 112, 110, 26);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fill();
  rr(ctx, 4, 2, 112, 110, 26);
  const g = ctx.createLinearGradient(0, 2, 0, 112);
  g.addColorStop(0, '#E9E2CF');
  g.addColorStop(0.25, '#FFFFFF');
  g.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(46,36,18,0.25)';
  ctx.stroke();
}

function drawHiveDoor(ctx: Ctx): void {
  // entrada da colmeia: arco de cera com buraco escuro
  ellipse(ctx, 110, 70, 104, 46);
  const g = ctx.createLinearGradient(0, 24, 0, 116);
  g.addColorStop(0, '#FFD66B');
  g.addColorStop(1, '#D1992C');
  strokeFill(ctx, g, 5);
  ellipse(ctx, 110, 74, 62, 30);
  const h = ctx.createRadialGradient(110, 80, 5, 110, 74, 62);
  h.addColorStop(0, '#120C04');
  h.addColorStop(1, '#4A3416');
  strokeFill(ctx, h, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ellipse(ctx, 50, 50, 22, 8, -0.3);
  ctx.fill();
}

function drawCloud(ctx: Ctx): void {
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  for (const [x, y, r] of [
    [70, 80, 40],
    [120, 62, 52],
    [175, 78, 40],
    [205, 92, 26],
    [42, 96, 24],
  ] as const) {
    ellipse(ctx, x, y, r, r * 0.86);
    ctx.fill();
  }
  ctx.fillRect(40, 92, 170, 24);
}

/** Botão com relevo (aresta inferior mais escura). */
export function buttonTexture(scene: Phaser.Scene, w: number, h: number, color: string): string {
  return ensureTexture(scene, `btn_${color}_${w}x${h}`, w, h + 10, (ctx) => {
    const r = Math.min(h / 2, 30);
    rr(ctx, 2, 10, w - 4, h - 4, r);
    ctx.fillStyle = shade(color, -0.4);
    ctx.fill();
    rr(ctx, 2, 2, w - 4, h - 6, r);
    const g = ctx.createLinearGradient(0, 2, 0, h - 4);
    g.addColorStop(0, shade(color, 0.3));
    g.addColorStop(0.5, color);
    g.addColorStop(1, shade(color, -0.1));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    rr(ctx, 2, 2, w - 4, h - 6, r);
    ctx.clip();
    rr(ctx, 10, 6, w - 20, (h - 6) * 0.42, r * 0.8);
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fill();
    ctx.restore();
    rr(ctx, 2, 2, w - 4, h + 4, r);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
  });
}

/** Painel creme das janelas. */
export function panelTexture(scene: Phaser.Scene, w: number, h: number): string {
  return ensureTexture(scene, `panel_${w}x${h}`, w, h, (ctx) => {
    rr(ctx, 3, 12, w - 6, h - 15, 40);
    ctx.fillStyle = '#C9B489';
    ctx.fill();
    rr(ctx, 3, 3, w - 6, h - 15, 40);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#FFFDF6');
    g.addColorStop(1, '#F2EAD3');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    rr(ctx, 3, 3, w - 6, h - 6, 40);
    ctx.stroke();
  });
}

/** Cartão interior (linhas da loja, prémios). */
export function cardTexture(scene: Phaser.Scene, w: number, h: number, color = '#FFFFFF'): string {
  return ensureTexture(scene, `card_${color}_${w}x${h}`, w, h, (ctx) => {
    rr(ctx, 2, 6, w - 4, h - 8, 22);
    ctx.fillStyle = 'rgba(46,36,18,0.18)';
    ctx.fill();
    rr(ctx, 2, 2, w - 4, h - 8, 22);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, shade(color, 0.3));
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(46,36,18,0.45)';
    ctx.stroke();
  });
}

/** Fita do título das janelas. */
export function ribbonTexture(scene: Phaser.Scene, w: number, color = '#F2AB27'): string {
  const h = 92;
  return ensureTexture(scene, `ribbon_${color}_${w}`, w, h, (ctx) => {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      const x0 = dir < 0 ? 4 : w - 4;
      ctx.moveTo(x0, 24);
      ctx.lineTo(x0 - dir * 60, 24);
      ctx.lineTo(x0 - dir * 60, 82);
      ctx.lineTo(x0, 82);
      ctx.lineTo(x0 - dir * 22, 53);
      ctx.closePath();
      strokeFill(ctx, shade(color, -0.3), 5);
    }
    rr(ctx, 34, 6, w - 68, 70, 18);
    const g = ctx.createLinearGradient(0, 6, 0, 76);
    g.addColorStop(0, shade(color, 0.3));
    g.addColorStop(1, shade(color, -0.05));
    strokeFill(ctx, g, 5);
  });
}

/** Moldura do quadro (madeira de mel) com o tamanho exato do nível. */
export function frameTexture(scene: Phaser.Scene, w: number, h: number): string {
  return ensureTexture(scene, `frame_${w}x${h}`, w, h, (ctx) => {
    rr(ctx, 2, 8, w - 4, h - 10, 34);
    ctx.fillStyle = '#8A5A22';
    ctx.fill();
    rr(ctx, 2, 2, w - 4, h - 10, 34);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#F7C960');
    g.addColorStop(1, '#D1992C');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    rr(ctx, 2, 2, w - 4, h - 4, 34);
    ctx.stroke();
    rr(ctx, 18, 18, w - 36, h - 40, 18);
    ctx.fillStyle = '#FBF6EA';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(46,36,18,0.5)';
    ctx.stroke();
  });
}

/** Fundo de jardim do ecrã inicial (céu, sol, colinas). */
export function gardenTexture(scene: Phaser.Scene, w: number, h: number): string {
  return ensureTexture(scene, `garden_${w}x${h}`, w, h, (ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#7CC8F7');
    sky.addColorStop(0.55, '#CDEBFA');
    sky.addColorStop(1, '#FBF6EA');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const sun = ctx.createRadialGradient(w * 0.85, h * 0.12, 10, w * 0.85, h * 0.12, w * 0.4);
    sun.addColorStop(0, 'rgba(255,240,170,0.9)');
    sun.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    const hill = (y: number, amp: number, col: string, ph: number) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 10) ctx.lineTo(x, y + Math.sin(x / w * Math.PI * 2 + ph) * amp);
      ctx.lineTo(w, h);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, y - amp, 0, h);
      g.addColorStop(0, shade(col, 0.15));
      g.addColorStop(1, shade(col, -0.15));
      ctx.fillStyle = g;
      ctx.fill();
    };
    hill(h * 0.62, 30, '#8ED46F', 0.5);
    hill(h * 0.7, 26, '#6CC24F', 2.2);
    hill(h * 0.8, 18, '#54C143', 4);
    // flores no relvado
    const cols = ['#F2059F', '#F7A8CF', '#F2AB27', '#FFFFFF', '#8302D2', '#0293F2'];
    for (let i = 0; i < 70; i++) {
      const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const y = (Math.sin(i * 78.233) * 12543.1234) % 1;
      const px = Math.abs(x) * w;
      const py = h * 0.66 + Math.abs(y) * h * 0.34;
      const r = 4 + (i % 4);
      ctx.fillStyle = cols[i % cols.length];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ellipse(ctx, px + Math.cos(a) * r, py + Math.sin(a) * r, r * 0.7, r * 0.7);
        ctx.fill();
      }
      ctx.fillStyle = '#F7C531';
      ellipse(ctx, px, py, r * 0.55, r * 0.55);
      ctx.fill();
    }
  });
}

/** Avatar redondo com a cara da Mel. */
export function avatarTexture(scene: Phaser.Scene): string {
  return ensureTexture(scene, 'avatar_mel', 128, 128, (ctx) => {
    glossyCircle(ctx, 64, 64, 58, '#FFF3D6');
    ctx.save();
    ctx.beginPath();
    ctx.arc(64, 64, 54, 0, Math.PI * 2);
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
