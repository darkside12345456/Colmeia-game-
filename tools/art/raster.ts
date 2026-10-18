// Pequeno "pincel" de pixel art: desenha formas em coordenadas normalizadas (0..1)
// numa grelha de W x H píxeis, cada píxel com um id de cor da paleta (ou vazio).
export type Pt = [number, number];

export class Pix {
  readonly data: (string | null)[];
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Array(w * h).fill(null);
  }

  private each(test: (x: number, y: number) => boolean, c: string | null): this {
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const x = (i + 0.5) / this.w;
        const y = (j + 0.5) / this.h;
        if (test(x, y)) this.data[j * this.w + i] = c;
      }
    }
    return this;
  }

  /** Fator para círculos parecerem redondos em grelhas não quadradas. */
  get ar(): number {
    return this.w / this.h;
  }

  fill(c: string | null): this {
    return this.each(() => true, c);
  }
  rect(x0: number, y0: number, x1: number, y1: number, c: string | null): this {
    return this.each((x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1, c);
  }
  /** Círculo com raio em unidades da largura. */
  circle(cx: number, cy: number, r: number, c: string | null): this {
    const ry = r * this.ar;
    return this.each((x, y) => ((x - cx) / r) ** 2 + ((y - cy) / ry) ** 2 <= 1, c);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string | null, rot = 0): this {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    return this.each((x, y) => {
      const dx = x - cx;
      const dy = (y - cy) / this.ar;
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      return (u / rx) ** 2 + (v / (ry / this.ar)) ** 2 <= 1;
    }, c);
  }
  ring(cx: number, cy: number, r0: number, r1: number, c: string | null): this {
    return this.each((x, y) => {
      const d = Math.hypot(x - cx, (y - cy) / this.ar);
      return d >= r0 && d <= r1;
    }, c);
  }
  poly(pts: Pt[], c: string | null): this {
    return this.each((x, y) => inPoly(x, y, pts), c);
  }
  line(x0: number, y0: number, x1: number, y1: number, thick: number, c: string | null): this {
    return this.each((x, y) => distSeg(x, y / this.ar, x0, y0 / this.ar, x1, y1 / this.ar) <= thick / 2, c);
  }
  /** Pétalas à volta de um centro. */
  petals(cx: number, cy: number, n: number, dist: number, rx: number, ry: number, c: string, rot0 = 0): this {
    for (let k = 0; k < n; k++) {
      const a = rot0 + (k / n) * Math.PI * 2;
      this.ellipse(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * this.ar, rx, ry, c, a);
    }
    return this;
  }
  star(cx: number, cy: number, r: number, c: string, points = 5, inner = 0.45): this {
    const pts: Pt[] = [];
    for (let k = 0; k < points * 2; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / points;
      const rr = k % 2 === 0 ? r : r * inner;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * this.ar]);
    }
    return this.poly(pts, c);
  }
  heart(cx: number, cy: number, s: number, c: string): this {
    return this.each((x, y) => {
      const u = (x - cx) / s;
      const v = -(y - cy) / (s * this.ar);
      return (u * u + v * v - 1) ** 3 - u * u * v * v * v <= 0;
    }, c);
  }
  /** Contorno: píxeis vazios/fundo que tocam em cores do conjunto passam a ter a cor c. */
  outline(c: string, bg: string | null, only?: string[]): this {
    const copy = this.data.slice();
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const k = j * this.w + i;
        if (copy[k] !== bg) continue;
        const nb = [
          [i - 1, j],
          [i + 1, j],
          [i, j - 1],
          [i, j + 1],
        ];
        for (const [a, b] of nb) {
          if (a < 0 || b < 0 || a >= this.w || b >= this.h) continue;
          const v = copy[b * this.w + a];
          if (v !== bg && v !== c && (!only || only.includes(v as string))) {
            this.data[k] = c;
            break;
          }
        }
      }
    }
    return this;
  }
  /** Espelha na horizontal. */
  mirror(): this {
    for (let j = 0; j < this.h; j++) {
      const row = this.data.slice(j * this.w, (j + 1) * this.w).reverse();
      for (let i = 0; i < this.w; i++) this.data[j * this.w + i] = row[i];
    }
    return this;
  }
}

function inPoly(x: number, y: number, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distSeg(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x0) * dx + (py - y0) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}
