// Abelhas originais: redondas, fofas, olhos grandes e brilhantes.
// Mel (amarela, protagonista), Lila (rosa), Azu (azul), Menta (verde) e a Rainha Doce.
import { ellipse, INK, shade, type Ctx } from './canvas';

export type BeeChar = 'mel' | 'lila' | 'azu' | 'menta' | 'rainha';
export type BeeExpr = 'happy' | 'celebrate' | 'sad' | 'focused' | 'blink';

export const BEE_COLORS: Record<BeeChar, { body: string; stripe: string; cheek: string }> = {
  mel: { body: '#FFC23D', stripe: '#2A1C3D', cheek: '#FF8FB8' },
  lila: { body: '#FF9CCB', stripe: '#7A1F5C', cheek: '#FF5FA2' },
  azu: { body: '#8EC5FF', stripe: '#24357A', cheek: '#FF9CCB' },
  menta: { body: '#8FF0C4', stripe: '#1E5B4A', cheek: '#FF9CCB' },
  rainha: { body: '#FFB627', stripe: '#3B1F52', cheek: '#FF8FB8' },
};

/**
 * Desenha uma abelha centrada em (cx, cy) com "tamanho" s (largura aproximada do corpo).
 * wing: 0..1 posição das asas (para animar o bater de asas).
 */
export function drawBee(ctx: Ctx, cx: number, cy: number, s: number, char: BeeChar, expr: BeeExpr, wing = 0.5, side = false): void {
  const c = BEE_COLORS[char];
  const lw = Math.max(1.2, s * 0.024);
  const rim = shade(c.body, -0.45);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // asas (atrás do corpo)
  const wingLift = (wing - 0.5) * 0.5;
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.translate(cx + dir * s * 0.18, cy - s * 0.28);
    ctx.rotate(dir * (0.55 + wingLift));
    ellipse(ctx, dir * s * 0.12, -s * 0.18, s * 0.17, s * 0.27);
    const wg = ctx.createLinearGradient(0, -s * 0.45, 0, s * 0.05);
    wg.addColorStop(0, 'rgba(255,255,255,0.92)');
    wg.addColorStop(0.6, 'rgba(200,225,255,0.72)');
    wg.addColorStop(1, 'rgba(230,200,255,0.6)');
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = 'rgba(120,110,190,0.55)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ellipse(ctx, dir * s * 0.08, -s * 0.26, s * 0.05, s * 0.09);
    ctx.fill();
    ctx.restore();
  }

  // ferrão
  ctx.beginPath();
  if (side) {
    ctx.moveTo(cx - s * 0.5, cy + s * 0.02);
    ctx.lineTo(cx - s * 0.62, cy + s * 0.08);
    ctx.lineTo(cx - s * 0.48, cy + s * 0.14);
  } else {
    ctx.moveTo(cx - s * 0.06, cy + s * 0.4);
    ctx.lineTo(cx, cy + s * 0.52);
    ctx.lineTo(cx + s * 0.06, cy + s * 0.4);
  }
  ctx.fillStyle = c.stripe;
  ctx.fill();

  // antenas
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * s * 0.12, cy - s * 0.36);
    ctx.quadraticCurveTo(cx + dir * s * 0.16, cy - s * 0.58, cx + dir * s * 0.28, cy - s * 0.62);
    ctx.lineWidth = lw * 1.3;
    ctx.strokeStyle = c.stripe;
    ctx.stroke();
    ellipse(ctx, cx + dir * s * 0.29, cy - s * 0.63, s * 0.06, s * 0.06);
    ctx.fillStyle = c.stripe;
    ctx.fill();
  }

  // corpo
  const rx = s * 0.47;
  const ry = s * 0.42;
  const g = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.45, s * 0.05, cx, cy, rx * 1.05);
  g.addColorStop(0, shade(c.body, 0.5));
  g.addColorStop(0.55, c.body);
  g.addColorStop(1, shade(c.body, -0.18));
  ellipse(ctx, cx, cy, rx, ry);
  ctx.fillStyle = g;
  ctx.fill();
  // riscas
  ctx.save();
  ellipse(ctx, cx, cy, rx, ry);
  ctx.clip();
  ctx.fillStyle = c.stripe;
  if (side) {
    for (const k of [-0.15, 0.15]) {
      ctx.beginPath();
      ctx.ellipse(cx - rx * (0.45 - k), cy, s * 0.06, ry * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (const k of [0.38, 0.68]) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * k + s * 0.02, rx * 1.1, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // brilho
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ellipse(ctx, cx - rx * 0.42, cy - ry * 0.5, rx * 0.22, ry * 0.13, -0.5);
  ctx.fill();
  ctx.restore();
  ellipse(ctx, cx, cy, rx, ry);
  ctx.lineWidth = lw * 1.2;
  ctx.strokeStyle = rim;
  ctx.stroke();

  // cara
  const fx = side ? cx + s * 0.16 : cx;
  const fy = cy - s * 0.05;
  const ex = side ? s * 0.11 : s * 0.15;
  drawFace(ctx, fx, fy, s, ex, expr, c.cheek, lw);

  if (char === 'rainha') drawCrown(ctx, cx, cy - ry * 0.98, s * 0.34, lw);
  ctx.restore();
}

function drawFace(ctx: Ctx, fx: number, fy: number, s: number, ex: number, expr: BeeExpr, cheek: string, lw: number): void {
  const eyeR = s * 0.085;
  // bochechas
  ctx.fillStyle = cheek;
  ctx.globalAlpha = 0.75;
  for (const dir of [-1, 1]) {
    ellipse(ctx, fx + dir * ex * 1.55, fy + s * 0.1, s * 0.06, s * 0.04);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const dir of [-1, 1]) {
    const x = fx + dir * ex;
    if (expr === 'blink' || expr === 'celebrate') {
      // olhos fechados: arco feliz
      ctx.beginPath();
      if (expr === 'celebrate') ctx.arc(x, fy + eyeR * 0.3, eyeR * 0.75, Math.PI * 1.1, Math.PI * 1.9);
      else ctx.arc(x, fy - eyeR * 0.2, eyeR * 0.75, Math.PI * 0.15, Math.PI * 0.85);
      ctx.lineWidth = lw * 2.4;
      ctx.strokeStyle = INK;
      ctx.stroke();
      continue;
    }
    ellipse(ctx, x, fy, eyeR * 0.82, eyeR);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ellipse(ctx, x - eyeR * 0.28, fy - eyeR * 0.38, eyeR * 0.32, eyeR * 0.34);
    ctx.fill();
    ellipse(ctx, x + eyeR * 0.3, fy + eyeR * 0.35, eyeR * 0.14, eyeR * 0.14);
    ctx.fill();
    if (expr === 'sad' || expr === 'focused') {
      // sobrancelhas
      ctx.beginPath();
      const up = expr === 'sad' ? 1 : -1;
      ctx.moveTo(x - dir * eyeR * 0.9, fy - eyeR * 1.45 + up * eyeR * 0.35 * -1);
      ctx.lineTo(x + dir * eyeR * 0.7, fy - eyeR * 1.45 - up * eyeR * 0.35 * -1);
      ctx.lineWidth = lw * 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  }

  // boca
  ctx.beginPath();
  const my = fy + s * 0.13;
  ctx.lineWidth = lw * 2;
  ctx.strokeStyle = INK;
  if (expr === 'celebrate') {
    ctx.moveTo(fx - s * 0.08, my - s * 0.01);
    ctx.quadraticCurveTo(fx, my + s * 0.14, fx + s * 0.08, my - s * 0.01);
    ctx.closePath();
    ctx.fillStyle = '#C2185B';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F7A8CF';
    ellipse(ctx, fx, my + s * 0.05, s * 0.035, s * 0.02);
    ctx.fill();
  } else if (expr === 'sad') {
    ctx.arc(fx, my + s * 0.06, s * 0.05, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (expr === 'focused') {
    ctx.moveTo(fx - s * 0.04, my + s * 0.01);
    ctx.lineTo(fx + s * 0.04, my);
    ctx.stroke();
  } else {
    ctx.arc(fx, my - s * 0.02, s * 0.055, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
}

function drawCrown(ctx: Ctx, cx: number, cy: number, w: number, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.lineTo(cx - w / 2, cy - w * 0.45);
  ctx.lineTo(cx - w / 4, cy - w * 0.2);
  ctx.lineTo(cx, cy - w * 0.55);
  ctx.lineTo(cx + w / 4, cy - w * 0.2);
  ctx.lineTo(cx + w / 2, cy - w * 0.45);
  ctx.lineTo(cx + w / 2, cy);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, cy - w * 0.55, 0, cy);
  g.addColorStop(0, '#FFE58A');
  g.addColorStop(1, '#E8A317');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = 'rgba(150,90,10,0.6)';
  ctx.stroke();
  ctx.fillStyle = '#FF5FA2';
  ellipse(ctx, cx, cy - w * 0.18, w * 0.07, w * 0.07);
  ctx.fill();
}
