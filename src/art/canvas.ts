// Utilitários de desenho em canvas 2D (gradientes, brilho, contornos) para o estilo
// "quase 3D" fofo do jogo.
export type Ctx = CanvasRenderingContext2D;

/** Tinta escura (olhos, detalhes). Não é usada para contornos grossos. */
export const INK = '#1B1433';
/** Traço suave para contornos de ícones e formas. */
export const LINE = 'rgba(20,12,45,0.32)';

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

/** Gema/vidro com brilho: usada nos blocos, peças e botões quadrados. Sem contorno preto. */
export function glossyTile(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, color: string, outline = false): void {
  // sombra suave por baixo
  ctx.save();
  ctx.shadowColor = 'rgba(8,4,24,0.45)';
  ctx.shadowBlur = w * 0.14;
  ctx.shadowOffsetY = h * 0.06;
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = shade(color, -0.3);
  ctx.fill();
  ctx.restore();
  // corpo com gradiente diagonal
  const g = ctx.createLinearGradient(x, y, x + w * 0.35, y + h);
  g.addColorStop(0, shade(color, 0.38));
  g.addColorStop(0.45, color);
  g.addColorStop(1, shade(color, -0.25));
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  // sombra interior em baixo
  const b = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  b.addColorStop(0, 'rgba(0,0,0,0)');
  b.addColorStop(1, 'rgba(10,0,30,0.22)');
  ctx.fillStyle = b;
  ctx.fillRect(x, y, w, h);
  // reflexo de vidro em cima
  const gl = ctx.createLinearGradient(0, y, 0, y + h * 0.5);
  gl.addColorStop(0, 'rgba(255,255,255,0.62)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  rr(ctx, x + w * 0.09, y + h * 0.06, w * 0.82, h * 0.4, r * 0.75);
  ctx.fill();
  // brilho pontual
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ellipse(ctx, x + w * 0.27, y + h * 0.19, w * 0.08, h * 0.05, -0.6);
  ctx.fill();
  ctx.restore();
  // aresta de luz fina
  rr(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r);
  ctx.lineWidth = Math.max(1, w * 0.025);
  ctx.strokeStyle = outline ? LINE : 'rgba(255,255,255,0.35)';
  ctx.stroke();
}

/** Círculo brilhante (moedas, botões redondos, ícones). */
export function glossyCircle(ctx: Ctx, cx: number, cy: number, r: number, color: string, outline: string | null = null): void {
  ctx.save();
  ctx.shadowColor = 'rgba(8,4,24,0.4)';
  ctx.shadowBlur = r * 0.25;
  ctx.shadowOffsetY = r * 0.1;
  ctx.fillStyle = shade(color, -0.3);
  ellipse(ctx, cx, cy + r * 0.04, r, r);
  ctx.fill();
  ctx.restore();
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, shade(color, 0.45));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.12));
  ctx.fillStyle = g;
  ellipse(ctx, cx, cy, r, r);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ellipse(ctx, cx - r * 0.35, cy - r * 0.42, r * 0.28, r * 0.16, -0.6);
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.strokeStyle = outline ?? 'rgba(255,255,255,0.35)';
  ellipse(ctx, cx, cy, r - 0.5, r - 0.5);
  ctx.stroke();
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

export function strokeFill(ctx: Ctx, fill: string | CanvasGradient, lw: number, stroke = LINE): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}
