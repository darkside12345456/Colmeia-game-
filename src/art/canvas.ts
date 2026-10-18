// Utilitários de desenho em canvas 2D (gradientes, brilho, contornos) para o estilo
// "quase 3D" fofo do jogo.
export type Ctx = CanvasRenderingContext2D;

export const INK = '#2E2412';

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Clareia (amt > 0) ou escurece (amt < 0) uma cor. */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}

/** Bloco/peça com relevo: base mais escura em baixo, topo com gradiente e brilho. */
export function glossyTile(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, color: string, outline = true): void {
  const depth = Math.max(2, h * 0.1);
  // base (aresta inferior mais escura)
  rr(ctx, x, y + depth * 0.5, w, h - depth * 0.5, r);
  ctx.fillStyle = shade(color, -0.35);
  ctx.fill();
  // face
  const g = ctx.createLinearGradient(0, y, 0, y + h - depth);
  g.addColorStop(0, shade(color, 0.28));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -0.08));
  rr(ctx, x, y, w, h - depth, r);
  ctx.fillStyle = g;
  ctx.fill();
  // brilho
  ctx.save();
  rr(ctx, x, y, w, h - depth, r);
  ctx.clip();
  const gl = ctx.createLinearGradient(0, y, 0, y + (h - depth) * 0.5);
  gl.addColorStop(0, 'rgba(255,255,255,0.55)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  rr(ctx, x + w * 0.08, y + h * 0.06, w * 0.84, (h - depth) * 0.42, r * 0.7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ellipse(ctx, x + w * 0.24, y + h * 0.2, w * 0.09, h * 0.06, -0.5);
  ctx.fill();
  ctx.restore();
  if (outline) {
    rr(ctx, x, y, w, h, r);
    ctx.lineWidth = Math.max(1.5, w * 0.045);
    ctx.strokeStyle = rgba('#2E2412', 0.55);
    ctx.stroke();
  }
}

/** Círculo brilhante (moedas, botões redondos, ícones). */
export function glossyCircle(ctx: Ctx, cx: number, cy: number, r: number, color: string, outline = INK): void {
  ctx.fillStyle = shade(color, -0.35);
  ellipse(ctx, cx, cy + r * 0.08, r, r);
  ctx.fill();
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, shade(color, 0.45));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.12));
  ctx.fillStyle = g;
  ellipse(ctx, cx, cy, r * 0.97, r * 0.92);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ellipse(ctx, cx - r * 0.35, cy - r * 0.42, r * 0.28, r * 0.16, -0.6);
  ctx.fill();
  if (outline) {
    ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.strokeStyle = outline;
    ellipse(ctx, cx, cy + r * 0.04, r, r * 0.98);
    ctx.stroke();
  }
}

export function star(ctx: Ctx, cx: number, cy: number, r: number, points = 5, inner = 0.5): void {
  ctx.beginPath();
  for (let k = 0; k < points * 2; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / points;
    const rr2 = k % 2 === 0 ? r : r * inner;
    const px = cx + Math.cos(a) * rr2;
    const py = cy + Math.sin(a) * rr2;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function heartPath(ctx: Ctx, cx: number, cy: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.75);
  ctx.bezierCurveTo(cx - s * 1.2, cy - s * 0.1, cx - s * 0.6, cy - s * 0.95, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.6, cy - s * 0.95, cx + s * 1.2, cy - s * 0.1, cx, cy + s * 0.75);
  ctx.closePath();
}

export function strokeFill(ctx: Ctx, fill: string | CanvasGradient, lw: number, stroke = INK): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}
