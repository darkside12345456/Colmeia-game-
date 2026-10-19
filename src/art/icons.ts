// Ícones desenhados por código (estilo cartoon com contorno escuro e brilho).
import { ellipse, glossyCircle, glossyTile, heartPath, rr, shade, star, strokeFill, type Ctx } from './canvas';

/** Traço dos ícones: suave, sem contorno preto grosso. */
const INK = 'rgba(20,12,45,0.38)';

type IconFn = (ctx: Ctx, s: number) => void;

const lwOf = (s: number) => Math.max(1.2, s * 0.028);

function lg(ctx: Ctx, y0: number, y1: number, c: string): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, shade(c, 0.35));
  g.addColorStop(1, shade(c, -0.1));
  return g;
}

function hexagon(ctx: Ctx, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + (k * Math.PI) / 3;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function petalFlower(ctx: Ctx, cx: number, cy: number, r: number, petal: string, center: string, lw: number): void {
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
    ellipse(ctx, cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.42, r * 0.3, a);
    strokeFill(ctx, petal, lw);
  }
  ellipse(ctx, cx, cy, r * 0.36, r * 0.36);
  strokeFill(ctx, center, lw);
}

export const ICONS: Record<string, IconFn> = {
  coin: (ctx, s) => {
    glossyCircle(ctx, s / 2, s / 2, s * 0.42, '#F7B92E');
    hexagon(ctx, s / 2, s / 2, s * 0.2);
    ctx.fillStyle = shade('#F7B92E', -0.25);
    ctx.fill();
    hexagon(ctx, s / 2 - s * 0.02, s / 2 - s * 0.02, s * 0.13);
    ctx.fillStyle = '#FFE08A';
    ctx.fill();
  },
  heart: (ctx, s) => {
    heartPath(ctx, s / 2, s * 0.52, s * 0.42);
    strokeFill(ctx, lg(ctx, s * 0.1, s * 0.9, '#FF4D6D'), lwOf(s));
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ellipse(ctx, s * 0.33, s * 0.36, s * 0.08, s * 0.05, -0.6);
    ctx.fill();
  },
  gear: (ctx, s) => {
    const c = s / 2;
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const r = k % 2 === 0 ? s * 0.44 : s * 0.34;
      ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    }
    ctx.closePath();
    strokeFill(ctx, lg(ctx, 0, s, '#B9C2CC'), lwOf(s));
    ellipse(ctx, c, c, s * 0.14, s * 0.14);
    strokeFill(ctx, '#6E7883', lwOf(s));
  },
  pause: (ctx, s) => {
    for (const x of [0.28, 0.58]) {
      rr(ctx, s * x, s * 0.22, s * 0.16, s * 0.56, s * 0.06);
      strokeFill(ctx, '#FFFFFF', lwOf(s));
    }
  },
  play: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.32, s * 0.2);
    ctx.lineTo(s * 0.8, s * 0.5);
    ctx.lineTo(s * 0.32, s * 0.8);
    ctx.closePath();
    strokeFill(ctx, '#FFFFFF', lwOf(s));
  },
  close: (ctx, s) => {
    ctx.lineCap = 'round';
    for (const [a, b, c, d] of [
      [0.28, 0.28, 0.72, 0.72],
      [0.72, 0.28, 0.28, 0.72],
    ]) {
      ctx.beginPath();
      ctx.moveTo(s * a, s * b);
      ctx.lineTo(s * c, s * d);
      ctx.lineWidth = s * 0.2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.lineWidth = s * 0.11;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }
  },
  info: (ctx, s) => {
    glossyCircle(ctx, s / 2, s / 2, s * 0.4, '#4F7BFF');
    ctx.fillStyle = '#FFFFFF';
    ellipse(ctx, s / 2, s * 0.31, s * 0.06, s * 0.06);
    ctx.fill();
    rr(ctx, s * 0.44, s * 0.42, s * 0.12, s * 0.32, s * 0.05);
    ctx.fill();
  },
  video: (ctx, s) => {
    rr(ctx, s * 0.12, s * 0.24, s * 0.56, s * 0.52, s * 0.1);
    strokeFill(ctx, lg(ctx, s * 0.2, s * 0.8, '#FFFFFF'), lwOf(s));
    ctx.beginPath();
    ctx.moveTo(s * 0.68, s * 0.42);
    ctx.lineTo(s * 0.9, s * 0.3);
    ctx.lineTo(s * 0.9, s * 0.7);
    ctx.lineTo(s * 0.68, s * 0.58);
    ctx.closePath();
    strokeFill(ctx, '#FFFFFF', lwOf(s));
    ctx.beginPath();
    ctx.moveTo(s * 0.33, s * 0.38);
    ctx.lineTo(s * 0.5, s * 0.5);
    ctx.lineTo(s * 0.33, s * 0.62);
    ctx.closePath();
    ctx.fillStyle = '#FF4D6D';
    ctx.fill();
  },
  lock: (ctx, s) => {
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.42, s * 0.18, Math.PI, 0);
    ctx.lineWidth = s * 0.16;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = s * 0.08;
    ctx.strokeStyle = '#B9C2CC';
    ctx.stroke();
    rr(ctx, s * 0.22, s * 0.42, s * 0.56, s * 0.42, s * 0.08);
    strokeFill(ctx, lg(ctx, s * 0.42, s * 0.84, '#FFB020'), lwOf(s));
    ellipse(ctx, s / 2, s * 0.6, s * 0.05, s * 0.06);
    ctx.fillStyle = INK;
    ctx.fill();
  },
  key: (ctx, s) => {
    // chave dourada na diagonal: argola + haste + dentes
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.translate(-s / 2, -s / 2);
    const gold = lg(ctx, s * 0.2, s * 0.8, '#FFC23D');
    ctx.beginPath();
    ctx.arc(s * 0.3, s * 0.5, s * 0.19, 0, Math.PI * 2);
    ctx.moveTo(s * 0.3 + s * 0.08, s * 0.5);
    ctx.arc(s * 0.3, s * 0.5, s * 0.08, 0, Math.PI * 2, true);
    strokeFill(ctx, gold, lwOf(s));
    rr(ctx, s * 0.46, s * 0.45, s * 0.42, s * 0.1, s * 0.03);
    strokeFill(ctx, gold, lwOf(s));
    rr(ctx, s * 0.7, s * 0.53, s * 0.07, s * 0.14, s * 0.02);
    strokeFill(ctx, gold, lwOf(s));
    rr(ctx, s * 0.81, s * 0.53, s * 0.07, s * 0.1, s * 0.02);
    strokeFill(ctx, gold, lwOf(s));
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ellipse(ctx, s * 0.24, s * 0.38, s * 0.05, s * 0.025, -0.6);
    ctx.fill();
    ctx.restore();
  },
  snow: (ctx, s) => {
    // floco de neve: 3 eixos com ramos, sobre um círculo de gelo
    glossyCircle(ctx, s / 2, s / 2, s * 0.44, '#7CC6FF');
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.06;
    for (let k = 0; k < 3; k++) {
      ctx.save();
      ctx.rotate((k * Math.PI) / 3);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.lineTo(0, s * 0.3);
      for (const d of [-1, 1]) {
        ctx.moveTo(0, d * s * 0.17);
        ctx.lineTo(s * 0.08, d * s * 0.25);
        ctx.moveTo(0, d * s * 0.17);
        ctx.lineTo(-s * 0.08, d * s * 0.25);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
  chain: (ctx, s) => {
    // dois elos de corrente prateados entrelaçados
    const link = (cx: number, cy: number, rot: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      rr(ctx, -s * 0.2, -s * 0.11, s * 0.4, s * 0.22, s * 0.11);
      ctx.lineWidth = s * 0.11;
      ctx.strokeStyle = 'rgba(20,12,45,0.45)';
      ctx.stroke();
      ctx.lineWidth = s * 0.07;
      ctx.strokeStyle = '#DCE3EC';
      ctx.stroke();
      ctx.restore();
    };
    link(s * 0.36, s * 0.6, -Math.PI / 4);
    link(s * 0.64, s * 0.4, -Math.PI / 4);
  },
  moon: (ctx, s) => {
    // lua em quarto crescente (peça a dormir)
    ctx.save();
    ctx.beginPath();
    ctx.arc(s * 0.48, s * 0.52, s * 0.34, 0, Math.PI * 2);
    ctx.arc(s * 0.62, s * 0.4, s * 0.28, 0, Math.PI * 2, true);
    strokeFill(ctx, lg(ctx, s * 0.18, s * 0.86, '#FFE08A'), lwOf(s));
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    star(ctx, s * 0.78, s * 0.24, s * 0.08, 4, 0.4);
    ctx.fill();
  },
  check: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.52);
    ctx.lineTo(s * 0.42, s * 0.74);
    ctx.lineTo(s * 0.8, s * 0.28);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = s * 0.2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = s * 0.11;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  },
  plus: (ctx, s) => {
    rr(ctx, s * 0.4, s * 0.16, s * 0.2, s * 0.68, s * 0.06);
    strokeFill(ctx, '#FFFFFF', lwOf(s));
    rr(ctx, s * 0.16, s * 0.4, s * 0.68, s * 0.2, s * 0.06);
    strokeFill(ctx, '#FFFFFF', lwOf(s));
    rr(ctx, s * 0.42, s * 0.42, s * 0.16, s * 0.16, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  },
  speed: (ctx, s) => {
    for (const x of [0.12, 0.44]) {
      ctx.beginPath();
      ctx.moveTo(s * x, s * 0.22);
      ctx.lineTo(s * (x + 0.38), s * 0.5);
      ctx.lineTo(s * x, s * 0.78);
      ctx.closePath();
      strokeFill(ctx, lg(ctx, s * 0.2, s * 0.8, '#FFFFFF'), lwOf(s));
    }
  },
  slot: (ctx, s) => {
    glossyTile(ctx, s * 0.1, s * 0.16, s * 0.62, s * 0.66, s * 0.14, '#FFFFFF');
    ellipse(ctx, s * 0.72, s * 0.7, s * 0.22, s * 0.22);
    strokeFill(ctx, '#22C98A', lwOf(s));
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, s * 0.69, s * 0.57, s * 0.06, s * 0.26, s * 0.02);
    ctx.fill();
    rr(ctx, s * 0.59, s * 0.67, s * 0.26, s * 0.06, s * 0.02);
    ctx.fill();
  },
  shuffle: (ctx, s) => {
    const arrow = (y0: number, y1: number, col: string) => {
      ctx.beginPath();
      ctx.moveTo(s * 0.12, s * y0);
      ctx.bezierCurveTo(s * 0.45, s * y0, s * 0.45, s * y1, s * 0.72, s * y1);
      ctx.lineCap = 'round';
      ctx.lineWidth = s * 0.17;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.lineWidth = s * 0.09;
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.68, s * (y1 - 0.13));
      ctx.lineTo(s * 0.9, s * y1);
      ctx.lineTo(s * 0.68, s * (y1 + 0.13));
      ctx.closePath();
      strokeFill(ctx, col, lwOf(s));
    };
    arrow(0.3, 0.7, '#4F7BFF');
    arrow(0.7, 0.3, '#FF4FA3');
  },
  tweezers: (ctx, s) => {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.12);
      ctx.quadraticCurveTo(s * (0.5 + dir * 0.3), s * 0.45, s * (0.5 + dir * 0.06), s * 0.88);
      ctx.lineCap = 'round';
      ctx.lineWidth = s * 0.15;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.lineWidth = s * 0.08;
      ctx.strokeStyle = '#C9D1D9';
      ctx.stroke();
    }
    glossyTile(ctx, s * 0.38, s * 0.72, s * 0.24, s * 0.22, s * 0.05, '#FF4FA3');
  },
  magnet: (ctx, s) => {
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.46, s * 0.28, Math.PI, 0, true);
    ctx.lineWidth = s * 0.24;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = s * 0.15;
    ctx.strokeStyle = '#FF4D6D';
    ctx.stroke();
    for (const x of [0.22, 0.78]) {
      rr(ctx, s * x - s * 0.09, s * 0.16, s * 0.18, s * 0.16, s * 0.03);
      strokeFill(ctx, '#E6EBF0', lwOf(s) * 0.8);
    }
    petalFlower(ctx, s / 2, s * 0.62, s * 0.2, '#F7A8CF', '#FFB020', lwOf(s) * 0.7);
  },
  gift: (ctx, s) => {
    rr(ctx, s * 0.14, s * 0.4, s * 0.72, s * 0.48, s * 0.06);
    strokeFill(ctx, lg(ctx, s * 0.4, s * 0.9, '#4F7BFF'), lwOf(s));
    rr(ctx, s * 0.1, s * 0.28, s * 0.8, s * 0.16, s * 0.05);
    strokeFill(ctx, lg(ctx, s * 0.28, s * 0.44, '#14C8B4'), lwOf(s));
    rr(ctx, s * 0.43, s * 0.28, s * 0.14, s * 0.6, 0);
    strokeFill(ctx, '#FF4FA3', lwOf(s) * 0.7);
    for (const dir of [-1, 1]) {
      ellipse(ctx, s * (0.5 + dir * 0.13), s * 0.2, s * 0.13, s * 0.08, dir * 0.4);
      strokeFill(ctx, '#FF4FA3', lwOf(s));
    }
  },
  chest: (ctx, s) => {
    rr(ctx, s * 0.1, s * 0.42, s * 0.8, s * 0.44, s * 0.06);
    strokeFill(ctx, lg(ctx, s * 0.42, s * 0.86, '#B5651D'), lwOf(s));
    ctx.beginPath();
    ctx.moveTo(s * 0.1, s * 0.44);
    ctx.quadraticCurveTo(s * 0.5, s * 0.1, s * 0.9, s * 0.44);
    ctx.closePath();
    strokeFill(ctx, lg(ctx, s * 0.2, s * 0.44, '#D1822C'), lwOf(s));
    rr(ctx, s * 0.1, s * 0.4, s * 0.8, s * 0.08, 0);
    strokeFill(ctx, '#FFB020', lwOf(s) * 0.7);
    rr(ctx, s * 0.42, s * 0.42, s * 0.16, s * 0.18, s * 0.03);
    strokeFill(ctx, '#F7D154', lwOf(s) * 0.7);
  },
  ticket: (ctx, s) => {
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.rotate(-0.35);
    rr(ctx, -s * 0.38, -s * 0.22, s * 0.76, s * 0.44, s * 0.06);
    strokeFill(ctx, lg(ctx, -s * 0.22, s * 0.22, '#FFB020'), lwOf(s));
    ctx.setLineDash([s * 0.05, s * 0.05]);
    ctx.beginPath();
    ctx.moveTo(s * 0.14, -s * 0.2);
    ctx.lineTo(s * 0.14, s * 0.2);
    ctx.lineWidth = lwOf(s) * 0.6;
    ctx.stroke();
    ctx.setLineDash([]);
    star(ctx, -s * 0.1, 0, s * 0.13);
    strokeFill(ctx, '#FFFFFF', lwOf(s) * 0.6);
    ctx.restore();
  },
  race: (ctx, s) => {
    rr(ctx, s * 0.2, s * 0.1, s * 0.07, s * 0.82, s * 0.03);
    strokeFill(ctx, '#7A4A22', lwOf(s) * 0.7);
    rr(ctx, s * 0.27, s * 0.14, s * 0.56, s * 0.38, s * 0.04);
    strokeFill(ctx, '#FFFFFF', lwOf(s));
    ctx.fillStyle = INK;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) ctx.fillRect(s * (0.29 + i * 0.13), s * (0.16 + j * 0.115), s * 0.13, s * 0.115);
    petalFlower(ctx, s * 0.72, s * 0.75, s * 0.16, '#FF4FA3', '#FFB020', lwOf(s) * 0.6);
  },
  sunflower: (ctx, s) => {
    rr(ctx, s * 0.47, s * 0.5, s * 0.06, s * 0.45, s * 0.03);
    strokeFill(ctx, '#22C98A', lwOf(s) * 0.6);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ellipse(ctx, s / 2 + Math.cos(a) * s * 0.24, s * 0.4 + Math.sin(a) * s * 0.24, s * 0.12, s * 0.06, a);
      strokeFill(ctx, '#F7C531', lwOf(s) * 0.6);
    }
    ellipse(ctx, s / 2, s * 0.4, s * 0.17, s * 0.17);
    strokeFill(ctx, '#7A4A22', lwOf(s) * 0.7);
  },
  hive: (ctx, s) => {
    const bands = ['#F7B92E', '#D1992C', '#F7B92E', '#D1992C'];
    bands.forEach((c, i) => {
      const w = s * (0.44 + i * 0.12);
      rr(ctx, s / 2 - w / 2, s * (0.2 + i * 0.16), w, s * 0.18, s * 0.09);
      strokeFill(ctx, lg(ctx, s * (0.2 + i * 0.16), s * (0.38 + i * 0.16), c), lwOf(s) * 0.8);
    });
    ellipse(ctx, s / 2, s * 0.72, s * 0.08, s * 0.08);
    ctx.fillStyle = INK;
    ctx.fill();
  },
  crown: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.14, s * 0.76);
    ctx.lineTo(s * 0.1, s * 0.3);
    ctx.lineTo(s * 0.32, s * 0.5);
    ctx.lineTo(s * 0.5, s * 0.18);
    ctx.lineTo(s * 0.68, s * 0.5);
    ctx.lineTo(s * 0.9, s * 0.3);
    ctx.lineTo(s * 0.86, s * 0.76);
    ctx.closePath();
    strokeFill(ctx, lg(ctx, s * 0.18, s * 0.76, '#F7C531'), lwOf(s));
    ellipse(ctx, s / 2, s * 0.6, s * 0.07, s * 0.07);
    strokeFill(ctx, '#FF4FA3', lwOf(s) * 0.5);
  },
  shop: (ctx, s) => {
    rr(ctx, s * 0.16, s * 0.34, s * 0.68, s * 0.54, s * 0.08);
    strokeFill(ctx, lg(ctx, s * 0.34, s * 0.88, '#FF4FA3'), lwOf(s));
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.36, s * 0.16, Math.PI, 0);
    ctx.lineWidth = s * 0.09;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.save();
    ctx.translate(s * 0.3, s * 0.42);
    ICONS.coin(ctx, s * 0.4);
    ctx.restore();
  },
  ranking: (ctx, s) => {
    const cols: [number, number, string][] = [
      [0.12, 0.5, '#B9C2CC'],
      [0.38, 0.3, '#F7C531'],
      [0.64, 0.6, '#D1822C'],
    ];
    for (const [x, y, c] of cols) {
      rr(ctx, s * x, s * y, s * 0.26, s * (0.88 - y), s * 0.04);
      strokeFill(ctx, lg(ctx, s * y, s * 0.88, c), lwOf(s));
    }
    star(ctx, s * 0.51, s * 0.17, s * 0.12);
    strokeFill(ctx, '#F7C531', lwOf(s) * 0.7);
  },
  home: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.08, s * 0.5);
    ctx.lineTo(s * 0.5, s * 0.12);
    ctx.lineTo(s * 0.92, s * 0.5);
    ctx.closePath();
    strokeFill(ctx, lg(ctx, s * 0.12, s * 0.5, '#FF4D6D'), lwOf(s));
    rr(ctx, s * 0.2, s * 0.48, s * 0.6, s * 0.4, s * 0.04);
    strokeFill(ctx, lg(ctx, s * 0.48, s * 0.88, '#F7D9A0'), lwOf(s));
    rr(ctx, s * 0.42, s * 0.62, s * 0.16, s * 0.26, s * 0.04);
    strokeFill(ctx, '#7A4A22', lwOf(s) * 0.7);
  },
  team: (ctx, s) => {
    for (const [x, y, r, c] of [
      [0.3, 0.42, 0.14, '#8FD3FF'],
      [0.7, 0.42, 0.14, '#ABF9A4'],
      [0.5, 0.52, 0.18, '#F7B92E'],
    ] as const) {
      ellipse(ctx, s * x, s * (y + r * 1.6), s * r * 1.2, s * r * 0.9);
      strokeFill(ctx, c, lwOf(s) * 0.8);
      ellipse(ctx, s * x, s * y, s * r, s * r);
      strokeFill(ctx, c, lwOf(s) * 0.8);
    }
  },
  collection: (ctx, s) => {
    for (const [rot, c] of [
      [-0.3, '#4F7BFF'],
      [0, '#22C98A'],
      [0.3, '#FF4FA3'],
    ] as const) {
      ctx.save();
      ctx.translate(s / 2, s * 0.8);
      ctx.rotate(rot);
      rr(ctx, -s * 0.18, -s * 0.66, s * 0.36, s * 0.52, s * 0.05);
      strokeFill(ctx, lg(ctx, -s * 0.66, -s * 0.14, c), lwOf(s) * 0.8);
      ctx.restore();
    }
    star(ctx, s / 2, s * 0.42, s * 0.1);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  },
  star: (ctx, s) => {
    star(ctx, s / 2, s * 0.53, s * 0.42);
    strokeFill(ctx, lg(ctx, s * 0.1, s * 0.9, '#F7C531'), lwOf(s));
  },
  hand: (ctx, s) => {
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.rotate(-0.4);
    rr(ctx, -s * 0.07, -s * 0.44, s * 0.14, s * 0.4, s * 0.07);
    strokeFill(ctx, '#FFFFFF', lwOf(s));
    rr(ctx, -s * 0.2, -s * 0.1, s * 0.4, s * 0.4, s * 0.14);
    strokeFill(ctx, '#FFFFFF', lwOf(s));
    rr(ctx, -s * 0.16, s * 0.26, s * 0.32, s * 0.16, s * 0.04);
    strokeFill(ctx, '#4F7BFF', lwOf(s));
    ctx.restore();
  },
  infinite: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s / 2, s / 2);
    ctx.bezierCurveTo(s * 0.7, s * 0.2, s * 0.95, s * 0.35, s * 0.88, s * 0.55);
    ctx.bezierCurveTo(s * 0.8, s * 0.78, s * 0.62, s * 0.7, s / 2, s / 2);
    ctx.bezierCurveTo(s * 0.38, s * 0.3, s * 0.2, s * 0.22, s * 0.12, s * 0.45);
    ctx.bezierCurveTo(s * 0.05, s * 0.65, s * 0.3, s * 0.8, s / 2, s / 2);
    ctx.lineWidth = s * 0.16;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = s * 0.08;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  },
  restore: (ctx, s) => {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.3, -0.3, Math.PI * 1.5);
    ctx.lineWidth = s * 0.16;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = s * 0.08;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.06);
    ctx.lineTo(s * 0.72, s * 0.2);
    ctx.lineTo(s * 0.5, s * 0.34);
    ctx.closePath();
    strokeFill(ctx, '#FFFFFF', lwOf(s) * 0.8);
  },
  sound: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.14, s * 0.38);
    ctx.lineTo(s * 0.3, s * 0.38);
    ctx.lineTo(s * 0.5, s * 0.2);
    ctx.lineTo(s * 0.5, s * 0.8);
    ctx.lineTo(s * 0.3, s * 0.62);
    ctx.lineTo(s * 0.14, s * 0.62);
    ctx.closePath();
    strokeFill(ctx, '#FFFFFF', lwOf(s));
    for (const r of [0.16, 0.28]) {
      ctx.beginPath();
      ctx.arc(s * 0.5, s / 2, s * r, -0.8, 0.8);
      ctx.lineWidth = lwOf(s) * 1.4;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }
  },
  music: (ctx, s) => {
    rr(ctx, s * 0.36, s * 0.18, s * 0.08, s * 0.5, 0);
    strokeFill(ctx, '#FFFFFF', lwOf(s) * 0.6);
    rr(ctx, s * 0.66, s * 0.12, s * 0.08, s * 0.5, 0);
    strokeFill(ctx, '#FFFFFF', lwOf(s) * 0.6);
    ctx.beginPath();
    ctx.moveTo(s * 0.36, s * 0.18);
    ctx.lineTo(s * 0.74, s * 0.12);
    ctx.lineTo(s * 0.74, s * 0.24);
    ctx.lineTo(s * 0.36, s * 0.3);
    ctx.closePath();
    strokeFill(ctx, '#FFFFFF', lwOf(s) * 0.6);
    ellipse(ctx, s * 0.3, s * 0.7, s * 0.12, s * 0.1, -0.3);
    strokeFill(ctx, '#FFFFFF', lwOf(s) * 0.8);
    ellipse(ctx, s * 0.6, s * 0.64, s * 0.12, s * 0.1, -0.3);
    strokeFill(ctx, '#FFFFFF', lwOf(s) * 0.8);
  },
  vibration: (ctx, s) => {
    rr(ctx, s * 0.32, s * 0.14, s * 0.36, s * 0.72, s * 0.08);
    strokeFill(ctx, '#FFFFFF', lwOf(s));
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * (0.5 + dir * 0.28), s * 0.3);
      ctx.lineTo(s * (0.5 + dir * 0.36), s * 0.4);
      ctx.lineTo(s * (0.5 + dir * 0.28), s * 0.5);
      ctx.lineTo(s * (0.5 + dir * 0.36), s * 0.6);
      ctx.lineTo(s * (0.5 + dir * 0.28), s * 0.7);
      ctx.lineWidth = lwOf(s);
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }
  },
  globe: (ctx, s) => {
    ellipse(ctx, s / 2, s / 2, s * 0.36, s * 0.36);
    strokeFill(ctx, '#FFFFFF', lwOf(s));
    ctx.lineWidth = lwOf(s) * 0.7;
    ctx.strokeStyle = INK;
    ellipse(ctx, s / 2, s / 2, s * 0.15, s * 0.36);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.14, s / 2);
    ctx.lineTo(s * 0.86, s / 2);
    ctx.stroke();
  },
  shield: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s / 2, s * 0.1);
    ctx.lineTo(s * 0.84, s * 0.24);
    ctx.quadraticCurveTo(s * 0.82, s * 0.7, s / 2, s * 0.9);
    ctx.quadraticCurveTo(s * 0.18, s * 0.7, s * 0.16, s * 0.24);
    ctx.closePath();
    strokeFill(ctx, '#FFFFFF', lwOf(s));
    ctx.save();
    ctx.translate(s * 0.2, s * 0.2);
    ICONS.check(ctx, s * 0.6);
    ctx.restore();
  },
  doc: (ctx, s) => {
    rr(ctx, s * 0.22, s * 0.12, s * 0.56, s * 0.76, s * 0.06);
    strokeFill(ctx, '#FFFFFF', lwOf(s));
    ctx.lineWidth = lwOf(s) * 0.7;
    ctx.strokeStyle = INK;
    for (const y of [0.32, 0.46, 0.6, 0.74]) {
      ctx.beginPath();
      ctx.moveTo(s * 0.32, s * y);
      ctx.lineTo(s * 0.68, s * y);
      ctx.stroke();
    }
  },
  mail: (ctx, s) => {
    rr(ctx, s * 0.12, s * 0.24, s * 0.76, s * 0.52, s * 0.06);
    strokeFill(ctx, '#FFFFFF', lwOf(s));
    ctx.beginPath();
    ctx.moveTo(s * 0.14, s * 0.27);
    ctx.lineTo(s / 2, s * 0.54);
    ctx.lineTo(s * 0.86, s * 0.27);
    ctx.lineWidth = lwOf(s);
    ctx.strokeStyle = INK;
    ctx.stroke();
  },
  motion: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.1, s / 2);
    ctx.bezierCurveTo(s * 0.3, s * 0.2, s * 0.4, s * 0.8, s * 0.6, s / 2);
    ctx.bezierCurveTo(s * 0.7, s * 0.35, s * 0.8, s * 0.35, s * 0.9, s / 2);
    ctx.lineWidth = s * 0.14;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = s * 0.07;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  },
  cera: (ctx, s) => {
    hexagon(ctx, s / 2, s / 2, s * 0.38);
    strokeFill(ctx, lg(ctx, s * 0.12, s * 0.88, '#F7C531'), lwOf(s));
    hexagon(ctx, s / 2, s / 2, s * 0.18);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();
  },
  petala: (ctx, s) => {
    ellipse(ctx, s / 2, s / 2, s * 0.22, s * 0.36, 0.5);
    strokeFill(ctx, lg(ctx, s * 0.14, s * 0.86, '#F7A8CF'), lwOf(s));
  },
  galho: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.15, s * 0.8);
    ctx.lineTo(s * 0.85, s * 0.2);
    ctx.moveTo(s * 0.5, s * 0.5);
    ctx.lineTo(s * 0.62, s * 0.78);
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.16;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = s * 0.09;
    ctx.strokeStyle = '#A0672E';
    ctx.stroke();
  },
  folha: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.15, s * 0.85);
    ctx.quadraticCurveTo(s * 0.1, s * 0.15, s * 0.85, s * 0.15);
    ctx.quadraticCurveTo(s * 0.85, s * 0.85, s * 0.15, s * 0.85);
    ctx.closePath();
    strokeFill(ctx, lg(ctx, s * 0.15, s * 0.85, '#22C98A'), lwOf(s));
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.8);
    ctx.lineTo(s * 0.7, s * 0.3);
    ctx.lineWidth = lwOf(s) * 0.6;
    ctx.stroke();
  },
  avatar: (ctx, s) => {
    glossyCircle(ctx, s / 2, s / 2, s * 0.44, '#FFF3D6');
  },
  flower: (ctx, s) => petalFlower(ctx, s / 2, s / 2, s * 0.34, '#F7A8CF', '#FFB020', lwOf(s) * 0.8),
};
