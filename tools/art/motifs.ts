// Motivos originais de pixel art (temas: flores, frutos, animais, a colmeia, estações, doces).
// Desenhados com formas simples; o tools/make-art.ts grava-os em PNG em vários tamanhos.
import type { Pix } from './raster';

export interface Motif {
  key: string;
  theme: 'flores' | 'frutos' | 'animais' | 'colmeia' | 'estacoes' | 'doces';
  draw(p: Pix): void;
}

export const MOTIFS: Motif[] = [
  // ------------------------------------------------------------- flores
  {
    key: 'malmequer',
    theme: 'flores',
    draw: (p) => {
      p.fill('ceu');
      p.rect(0, 0.82, 1, 1, 'verde');
      p.line(0.5, 0.55, 0.5, 0.95, 0.07, 'verde');
      p.ellipse(0.65, 0.78, 0.13, 0.05, 'lima', -0.5);
      p.petals(0.5, 0.36, 8, 0.2, 0.12, 0.07, 'creme');
      p.circle(0.5, 0.36, 0.12, 'sol');
      p.circle(0.47, 0.33, 0.04, 'mel');
    },
  },
  {
    key: 'tulipa',
    theme: 'flores',
    draw: (p) => {
      p.fill('menta');
      p.line(0.5, 0.45, 0.5, 0.97, 0.07, 'verde');
      p.ellipse(0.36, 0.72, 0.14, 0.06, 'verde', 0.8);
      p.ellipse(0.5, 0.36, 0.2, 0.22, 'rosa');
      p.poly([[0.3, 0.2], [0.4, 0.38], [0.5, 0.2], [0.6, 0.38], [0.7, 0.2], [0.7, 0.4], [0.3, 0.4]], 'rosa');
      p.ellipse(0.43, 0.35, 0.05, 0.12, 'rosado');
    },
  },
  {
    key: 'girassol',
    theme: 'flores',
    draw: (p) => {
      p.fill('ceu');
      p.line(0.5, 0.6, 0.5, 1, 0.08, 'verde');
      p.ellipse(0.66, 0.82, 0.14, 0.06, 'verde', -0.6);
      p.petals(0.5, 0.38, 12, 0.24, 0.11, 0.06, 'sol');
      p.circle(0.5, 0.38, 0.19, 'castanho');
      p.circle(0.5, 0.38, 0.11, 'ambar');
    },
  },
  {
    key: 'rosa',
    theme: 'flores',
    draw: (p) => {
      p.fill('creme');
      p.line(0.5, 0.55, 0.52, 0.97, 0.07, 'verde');
      p.ellipse(0.66, 0.75, 0.12, 0.06, 'verde', -0.5);
      p.circle(0.5, 0.38, 0.27, 'cereja');
      p.ring(0.5, 0.38, 0.12, 0.16, 'rosa');
      p.ring(0.5, 0.38, 0.2, 0.23, 'rosa');
      p.circle(0.5, 0.38, 0.06, 'rosa');
    },
  },
  {
    key: 'vaso',
    theme: 'flores',
    draw: (p) => {
      p.fill('lilas');
      p.poly([[0.25, 0.62], [0.75, 0.62], [0.67, 0.97], [0.33, 0.97]], 'ambar');
      p.rect(0.22, 0.58, 0.78, 0.66, 'castanho');
      p.line(0.5, 0.58, 0.5, 0.35, 0.05, 'verde');
      p.line(0.5, 0.5, 0.3, 0.3, 0.05, 'verde');
      p.line(0.5, 0.5, 0.7, 0.3, 0.05, 'verde');
      p.petals(0.5, 0.26, 5, 0.08, 0.07, 0.05, 'magenta');
      p.petals(0.28, 0.27, 5, 0.07, 0.06, 0.04, 'azul');
      p.petals(0.72, 0.27, 5, 0.07, 0.06, 0.04, 'sol');
      p.circle(0.5, 0.26, 0.04, 'sol');
      p.circle(0.28, 0.27, 0.035, 'creme');
      p.circle(0.72, 0.27, 0.035, 'creme');
    },
  },
  {
    key: 'lotus',
    theme: 'flores',
    draw: (p) => {
      p.fill('lagoa');
      p.ellipse(0.5, 0.78, 0.45, 0.12, 'verde');
      p.ellipse(0.5, 0.55, 0.1, 0.25, 'rosado');
      p.ellipse(0.35, 0.6, 0.09, 0.22, 'rosado', -0.6);
      p.ellipse(0.65, 0.6, 0.09, 0.22, 'rosado', 0.6);
      p.ellipse(0.24, 0.66, 0.07, 0.16, 'rosa', -1.1);
      p.ellipse(0.76, 0.66, 0.07, 0.16, 'rosa', 1.1);
      p.circle(0.5, 0.62, 0.06, 'sol');
    },
  },
  {
    key: 'lavanda',
    theme: 'flores',
    draw: (p) => {
      p.fill('creme');
      for (const x of [0.3, 0.5, 0.7]) {
        p.line(x, 0.95, x, 0.3, 0.04, 'verde');
        for (let y = 0.15; y < 0.55; y += 0.07) p.ellipse(x, y, 0.06, 0.04, 'violeta');
        p.ellipse(x, 0.12, 0.04, 0.04, 'lilas');
      }
      p.rect(0, 0.88, 1, 1, 'lima');
    },
  },
  // ------------------------------------------------------------- frutos
  {
    key: 'maca',
    theme: 'frutos',
    draw: (p) => {
      p.fill('creme');
      p.circle(0.37, 0.58, 0.28, 'cereja');
      p.circle(0.63, 0.58, 0.28, 'cereja');
      p.circle(0.5, 0.68, 0.3, 'cereja');
      p.ellipse(0.32, 0.5, 0.06, 0.12, 'rosado', -0.4);
      p.line(0.5, 0.35, 0.53, 0.14, 0.05, 'castanho');
      p.ellipse(0.65, 0.2, 0.13, 0.06, 'verde', -0.4);
    },
  },
  {
    key: 'cerejas',
    theme: 'frutos',
    draw: (p) => {
      p.fill('menta');
      p.line(0.32, 0.65, 0.55, 0.15, 0.04, 'verde');
      p.line(0.68, 0.7, 0.55, 0.15, 0.04, 'verde');
      p.ellipse(0.66, 0.16, 0.14, 0.06, 'verde', 0.3);
      p.circle(0.32, 0.7, 0.18, 'cereja');
      p.circle(0.68, 0.75, 0.18, 'cereja');
      p.circle(0.27, 0.65, 0.05, 'rosado');
      p.circle(0.63, 0.7, 0.05, 'rosado');
    },
  },
  {
    key: 'morango',
    theme: 'frutos',
    draw: (p) => {
      p.fill('creme');
      p.poly([[0.15, 0.32], [0.85, 0.32], [0.75, 0.62], [0.5, 0.95], [0.25, 0.62]], 'cereja');
      p.circle(0.5, 0.4, 0.33, 'cereja');
      for (const [x, y] of [[0.35, 0.45], [0.5, 0.52], [0.65, 0.45], [0.42, 0.65], [0.58, 0.65], [0.5, 0.8], [0.3, 0.32], [0.7, 0.32]] as const)
        p.ellipse(x, y, 0.02, 0.03, 'sol');
      p.petals(0.5, 0.15, 5, 0.1, 0.1, 0.04, 'verde', -Math.PI / 2);
    },
  },
  {
    key: 'laranja',
    theme: 'frutos',
    draw: (p) => {
      p.fill('ceu');
      p.circle(0.5, 0.52, 0.4, 'laranja');
      p.circle(0.5, 0.52, 0.34, 'sol');
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        p.line(0.5, 0.52, 0.5 + Math.cos(a) * 0.32, 0.52 + Math.sin(a) * 0.32 * p.ar, 0.03, 'creme');
      }
      p.circle(0.5, 0.52, 0.05, 'creme');
    },
  },
  {
    key: 'pera',
    theme: 'frutos',
    draw: (p) => {
      p.fill('lilas');
      p.circle(0.5, 0.68, 0.3, 'lima');
      p.circle(0.5, 0.38, 0.18, 'lima');
      p.ellipse(0.4, 0.62, 0.06, 0.12, 'menta', -0.3);
      p.line(0.5, 0.22, 0.54, 0.06, 0.05, 'castanho');
      p.ellipse(0.66, 0.14, 0.11, 0.05, 'verde', -0.4);
    },
  },
  {
    key: 'melancia',
    theme: 'frutos',
    draw: (p) => {
      p.fill('creme');
      p.poly([[0.05, 0.35], [0.95, 0.35], [0.5, 0.95]], 'verde');
      p.poly([[0.12, 0.38], [0.88, 0.38], [0.5, 0.88]], 'menta');
      p.poly([[0.17, 0.4], [0.83, 0.4], [0.5, 0.83]], 'cereja');
      for (const [x, y] of [[0.35, 0.5], [0.5, 0.55], [0.65, 0.5], [0.45, 0.68], [0.55, 0.68]] as const)
        p.ellipse(x, y, 0.02, 0.03, 'castanho');
    },
  },
  {
    key: 'uvas',
    theme: 'frutos',
    draw: (p) => {
      p.fill('menta');
      const r = 0.1;
      for (const [x, y] of [[0.3, 0.35], [0.5, 0.35], [0.7, 0.35], [0.4, 0.52], [0.6, 0.52], [0.5, 0.69], [0.3, 0.52], [0.7, 0.52], [0.4, 0.85]] as const)
        p.circle(x, y, r, 'ameixa');
      p.circle(0.27, 0.32, 0.03, 'lilas');
      p.circle(0.47, 0.32, 0.03, 'lilas');
      p.line(0.5, 0.25, 0.5, 0.05, 0.04, 'castanho');
      p.ellipse(0.68, 0.15, 0.14, 0.06, 'verde', -0.3);
    },
  },
  {
    key: 'limao',
    theme: 'frutos',
    draw: (p) => {
      p.fill('azul');
      p.ellipse(0.5, 0.52, 0.42, 0.28, 'sol', -0.3);
      p.ellipse(0.45, 0.45, 0.15, 0.06, 'creme', -0.3);
      p.ellipse(0.82, 0.3, 0.1, 0.05, 'verde', -0.8);
    },
  },
  {
    key: 'ananas',
    theme: 'frutos',
    draw: (p) => {
      p.fill('rosado');
      p.poly([[0.5, 0.02], [0.4, 0.3], [0.6, 0.3]], 'verde');
      p.poly([[0.3, 0.08], [0.42, 0.32], [0.5, 0.3]], 'verde');
      p.poly([[0.7, 0.08], [0.58, 0.32], [0.5, 0.3]], 'verde');
      p.ellipse(0.5, 0.62, 0.27, 0.33, 'mel');
      for (let y = 0.4; y < 0.9; y += 0.12) for (let x = 0.32; x < 0.7; x += 0.12) p.circle(x + ((y * 10) % 2 ? 0.06 : 0), y, 0.02, 'castanho');
    },
  },
  // ------------------------------------------------------------- animais
  {
    key: 'abelha',
    theme: 'animais',
    draw: (p) => {
      p.fill('ceu');
      p.ellipse(0.4, 0.28, 0.13, 0.17, 'creme', -0.5);
      p.ellipse(0.62, 0.26, 0.13, 0.17, 'creme', 0.5);
      p.ellipse(0.5, 0.6, 0.33, 0.27, 'sol');
      p.rect(0.4, 0.37, 0.46, 0.84, 'castanho');
      p.rect(0.58, 0.37, 0.64, 0.84, 'castanho');
      p.circle(0.27, 0.56, 0.06, 'creme');
      p.circle(0.27, 0.56, 0.03, 'oceano');
      p.ellipse(0.2, 0.68, 0.04, 0.03, 'rosado');
    },
  },
  {
    key: 'joaninha',
    theme: 'animais',
    draw: (p) => {
      p.fill('verde');
      p.circle(0.5, 0.25, 0.16, 'oceano');
      p.circle(0.5, 0.58, 0.36, 'cereja');
      p.line(0.5, 0.25, 0.5, 0.94, 0.04, 'oceano');
      for (const [x, y] of [[0.33, 0.48], [0.67, 0.48], [0.3, 0.7], [0.7, 0.7], [0.44, 0.82], [0.56, 0.82]] as const) p.circle(x, y, 0.06, 'oceano');
      p.circle(0.44, 0.22, 0.035, 'creme');
      p.circle(0.56, 0.22, 0.035, 'creme');
    },
  },
  {
    key: 'borboleta',
    theme: 'animais',
    draw: (p) => {
      p.fill('menta');
      p.ellipse(0.3, 0.35, 0.22, 0.2, 'magenta', -0.4);
      p.ellipse(0.7, 0.35, 0.22, 0.2, 'magenta', 0.4);
      p.ellipse(0.32, 0.68, 0.16, 0.14, 'violeta', 0.4);
      p.ellipse(0.68, 0.68, 0.16, 0.14, 'violeta', -0.4);
      p.circle(0.3, 0.35, 0.07, 'sol');
      p.circle(0.7, 0.35, 0.07, 'sol');
      p.ellipse(0.5, 0.52, 0.05, 0.3, 'oceano');
      p.line(0.5, 0.25, 0.4, 0.08, 0.025, 'oceano');
      p.line(0.5, 0.25, 0.6, 0.08, 0.025, 'oceano');
    },
  },
  {
    key: 'caracol',
    theme: 'animais',
    draw: (p) => {
      p.fill('ceu');
      p.rect(0, 0.85, 1, 1, 'verde');
      p.ellipse(0.5, 0.8, 0.42, 0.07, 'areia');
      p.line(0.82, 0.78, 0.86, 0.5, 0.08, 'areia');
      p.circle(0.86, 0.48, 0.05, 'areia');
      p.circle(0.45, 0.55, 0.3, 'ambar');
      p.ring(0.45, 0.55, 0.17, 0.22, 'mel');
      p.ring(0.45, 0.55, 0.06, 0.1, 'mel');
    },
  },
  {
    key: 'peixe',
    theme: 'animais',
    draw: (p) => {
      p.fill('azul');
      p.ellipse(0.45, 0.5, 0.33, 0.22, 'laranja');
      p.poly([[0.72, 0.5], [0.95, 0.28], [0.95, 0.72]], 'laranja');
      p.poly([[0.4, 0.3], [0.55, 0.2], [0.58, 0.33]], 'sol');
      p.ellipse(0.48, 0.5, 0.04, 0.2, 'creme');
      p.circle(0.25, 0.45, 0.05, 'creme');
      p.circle(0.25, 0.45, 0.025, 'oceano');
      p.circle(0.2, 0.15, 0.04, 'agua');
      p.circle(0.12, 0.28, 0.03, 'agua');
    },
  },
  {
    key: 'gato',
    theme: 'animais',
    draw: (p) => {
      p.fill('rosado');
      p.poly([[0.2, 0.1], [0.42, 0.32], [0.2, 0.4]], 'laranja');
      p.poly([[0.8, 0.1], [0.58, 0.32], [0.8, 0.4]], 'laranja');
      p.circle(0.5, 0.56, 0.35, 'laranja');
      p.ellipse(0.5, 0.7, 0.16, 0.12, 'creme');
      p.circle(0.37, 0.5, 0.06, 'oceano');
      p.circle(0.63, 0.5, 0.06, 'oceano');
      p.circle(0.5, 0.64, 0.03, 'rosa');
    },
  },
  {
    key: 'passaro',
    theme: 'animais',
    draw: (p) => {
      p.fill('creme');
      p.line(0.05, 0.85, 0.95, 0.85, 0.05, 'castanho');
      p.circle(0.5, 0.52, 0.3, 'azul');
      p.ellipse(0.55, 0.62, 0.17, 0.15, 'ceu');
      p.ellipse(0.38, 0.55, 0.15, 0.1, 'oceano', 0.5);
      p.poly([[0.72, 0.45], [0.92, 0.5], [0.72, 0.55]], 'sol');
      p.circle(0.62, 0.42, 0.04, 'oceano');
    },
  },
  {
    key: 'sapo',
    theme: 'animais',
    draw: (p) => {
      p.fill('agua');
      p.ellipse(0.5, 0.88, 0.45, 0.1, 'verde');
      p.ellipse(0.5, 0.6, 0.38, 0.27, 'lima');
      p.circle(0.32, 0.36, 0.12, 'lima');
      p.circle(0.68, 0.36, 0.12, 'lima');
      p.circle(0.32, 0.36, 0.06, 'creme');
      p.circle(0.68, 0.36, 0.06, 'creme');
      p.circle(0.32, 0.36, 0.03, 'oceano');
      p.circle(0.68, 0.36, 0.03, 'oceano');
      p.line(0.36, 0.65, 0.64, 0.65, 0.025, 'verde');
    },
  },
  {
    key: 'mocho',
    theme: 'animais',
    draw: (p) => {
      p.fill('oceano');
      p.circle(0.85, 0.15, 0.08, 'creme');
      p.ellipse(0.5, 0.58, 0.32, 0.36, 'ambar');
      p.poly([[0.2, 0.2], [0.35, 0.3], [0.25, 0.38]], 'ambar');
      p.poly([[0.8, 0.2], [0.65, 0.3], [0.75, 0.38]], 'ambar');
      p.ellipse(0.5, 0.72, 0.17, 0.18, 'areia');
      p.circle(0.38, 0.42, 0.1, 'creme');
      p.circle(0.62, 0.42, 0.1, 'creme');
      p.circle(0.38, 0.42, 0.05, 'castanho');
      p.circle(0.62, 0.42, 0.05, 'castanho');
      p.poly([[0.46, 0.5], [0.54, 0.5], [0.5, 0.58]], 'sol');
    },
  },
  // ------------------------------------------------------------- colmeia
  {
    key: 'colmeia',
    theme: 'colmeia',
    draw: (p) => {
      p.fill('ceu');
      p.rect(0, 0.88, 1, 1, 'verde');
      p.ellipse(0.5, 0.25, 0.22, 0.1, 'sol');
      p.ellipse(0.5, 0.38, 0.3, 0.1, 'mel');
      p.ellipse(0.5, 0.52, 0.36, 0.11, 'sol');
      p.ellipse(0.5, 0.66, 0.38, 0.11, 'mel');
      p.ellipse(0.5, 0.79, 0.34, 0.1, 'sol');
      p.circle(0.5, 0.7, 0.08, 'castanho');
      p.line(0.5, 0.05, 0.5, 0.17, 0.04, 'castanho');
    },
  },
  {
    key: 'favos',
    theme: 'colmeia',
    draw: (p) => {
      p.fill('ambar');
      const s = 0.16;
      for (let row = -1; row < 8; row++) {
        for (let col = -1; col < 8; col++) {
          const cx = col * s * 0.87 * 2 * 0.62 + (row % 2 ? s * 0.54 : 0);
          const cy = row * s * 0.9;
          const pts: [number, number][] = [];
          for (let k = 0; k < 6; k++) {
            const a = Math.PI / 6 + (k * Math.PI) / 3;
            pts.push([cx + Math.cos(a) * s * 0.52, cy + Math.sin(a) * s * 0.52 * p.ar]);
          }
          p.poly(pts, (row + col) % 3 === 0 ? 'mel' : 'sol');
        }
      }
    },
  },
  {
    key: 'pote-mel',
    theme: 'colmeia',
    draw: (p) => {
      p.fill('rosado');
      p.ellipse(0.5, 0.62, 0.36, 0.32, 'sol');
      p.rect(0.28, 0.2, 0.72, 0.36, 'mel');
      p.rect(0.24, 0.16, 0.76, 0.24, 'cereja');
      p.rect(0.2, 0.52, 0.8, 0.7, 'creme');
      p.ellipse(0.32, 0.75, 0.05, 0.1, 'mel');
      p.circle(0.5, 0.61, 0.05, 'ambar');
    },
  },
  {
    key: 'cabana',
    theme: 'colmeia',
    draw: (p) => {
      p.fill('ceu');
      p.rect(0, 0.85, 1, 1, 'verde');
      p.poly([[0.1, 0.42], [0.5, 0.1], [0.9, 0.42]], 'cereja');
      p.rect(0.18, 0.42, 0.82, 0.86, 'areia');
      p.circle(0.5, 0.6, 0.08, 'castanho');
      p.rect(0.48, 0.68, 0.52, 0.86, 'castanho');
      p.circle(0.3, 0.55, 0.06, 'sol');
      p.circle(0.72, 0.72, 0.05, 'sol');
    },
  },
  // ------------------------------------------------------------- estações
  {
    key: 'sol',
    theme: 'estacoes',
    draw: (p) => {
      p.fill('azul');
      p.star(0.5, 0.5, 0.45, 'laranja', 12, 0.7);
      p.circle(0.5, 0.5, 0.28, 'sol');
      p.circle(0.4, 0.45, 0.04, 'castanho');
      p.circle(0.6, 0.45, 0.04, 'castanho');
      p.ellipse(0.5, 0.6, 0.08, 0.03, 'castanho');
      p.circle(0.33, 0.56, 0.04, 'rosado');
      p.circle(0.67, 0.56, 0.04, 'rosado');
    },
  },
  {
    key: 'boneco-neve',
    theme: 'estacoes',
    draw: (p) => {
      p.fill('oceano');
      for (const [x, y] of [[0.1, 0.1], [0.85, 0.2], [0.2, 0.5], [0.9, 0.6], [0.12, 0.8]] as const) p.circle(x, y, 0.025, 'creme');
      p.circle(0.5, 0.72, 0.26, 'creme');
      p.circle(0.5, 0.36, 0.18, 'creme');
      p.rect(0.36, 0.1, 0.64, 0.2, 'cereja');
      p.rect(0.3, 0.19, 0.7, 0.22, 'cereja');
      p.poly([[0.5, 0.38], [0.66, 0.41], [0.5, 0.43]], 'laranja');
      p.circle(0.43, 0.33, 0.025, 'castanho');
      p.circle(0.57, 0.33, 0.025, 'castanho');
      p.rect(0.32, 0.5, 0.68, 0.55, 'azul');
    },
  },
  {
    key: 'folha-outono',
    theme: 'estacoes',
    draw: (p) => {
      p.fill('areia');
      p.ellipse(0.5, 0.5, 0.42, 0.25, 'laranja', -0.7);
      p.ellipse(0.42, 0.58, 0.2, 0.12, 'ambar', -0.7);
      p.line(0.18, 0.84, 0.8, 0.18, 0.03, 'castanho');
    },
  },
  {
    key: 'chapeu-chuva',
    theme: 'estacoes',
    draw: (p) => {
      p.fill('ceu');
      for (const [x, y] of [[0.12, 0.12], [0.3, 0.06], [0.75, 0.08], [0.9, 0.2], [0.08, 0.75], [0.92, 0.8]] as const) p.ellipse(x, y, 0.015, 0.04, 'azul');
      p.ellipse(0.5, 0.52, 0.44, 0.38, 'violeta');
      p.ellipse(0.5, 0.52, 0.15, 0.38, 'lilas');
      p.rect(0, 0.52, 1, 1, 'ceu');
      for (const x of [0.17, 0.39, 0.61, 0.83]) p.circle(x, 0.53, 0.06, 'ceu');
      p.line(0.5, 0.12, 0.5, 0.86, 0.045, 'castanho');
      p.ring(0.6, 0.86, 0.05, 0.1, 'castanho');
      p.rect(0.5, 0.74, 0.72, 0.86, 'ceu');
      p.rect(0, 0.92, 1, 1, 'verde');
    },
  },
  {
    key: 'arvore',
    theme: 'estacoes',
    draw: (p) => {
      p.fill('ceu');
      p.rect(0, 0.88, 1, 1, 'verde');
      p.rect(0.43, 0.55, 0.57, 0.9, 'castanho');
      p.circle(0.5, 0.35, 0.3, 'verde');
      p.circle(0.3, 0.5, 0.18, 'verde');
      p.circle(0.7, 0.5, 0.18, 'verde');
      for (const [x, y] of [[0.4, 0.3], [0.6, 0.25], [0.3, 0.5], [0.7, 0.45], [0.52, 0.48]] as const) p.circle(x, y, 0.04, 'rosado');
    },
  },
  {
    key: 'cogumelo',
    theme: 'estacoes',
    draw: (p) => {
      p.fill('menta');
      p.rect(0, 0.88, 1, 1, 'verde');
      p.rect(0.38, 0.45, 0.62, 0.9, 'creme');
      p.ellipse(0.5, 0.45, 0.42, 0.3, 'cereja');
      p.rect(0.05, 0.47, 0.95, 0.75, null);
      p.rect(0.05, 0.47, 0.95, 0.75, 'menta');
      p.rect(0.38, 0.47, 0.62, 0.9, 'creme');
      for (const [x, y] of [[0.32, 0.3], [0.55, 0.22], [0.72, 0.36], [0.45, 0.4]] as const) p.circle(x, y, 0.05, 'creme');
    },
  },
  {
    key: 'arco-iris',
    theme: 'estacoes',
    draw: (p) => {
      p.fill('ceu');
      const cols = ['cereja', 'laranja', 'sol', 'verde', 'azul', 'violeta'];
      cols.forEach((c, k) => p.ring(0.5, 0.8, 0.42 - k * 0.055, 0.47 - k * 0.055, c));
      p.rect(0, 0.8, 1, 1, 'ceu');
      p.rect(0, 0.92, 1, 1, 'verde');
      p.circle(0.15, 0.82, 0.1, 'creme');
      p.circle(0.85, 0.82, 0.1, 'creme');
      p.circle(0.24, 0.85, 0.07, 'creme');
      p.circle(0.76, 0.85, 0.07, 'creme');
    },
  },
  {
    key: 'lua',
    theme: 'estacoes',
    draw: (p) => {
      p.fill('oceano');
      p.circle(0.45, 0.5, 0.3, 'sol');
      p.circle(0.6, 0.42, 0.26, 'oceano');
      p.star(0.78, 0.7, 0.08, 'creme');
      p.star(0.8, 0.2, 0.06, 'creme');
      p.star(0.2, 0.15, 0.05, 'creme');
    },
  },
  {
    key: 'floco',
    theme: 'estacoes',
    draw: (p) => {
      p.fill('azul');
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const ex = 0.5 + Math.cos(a) * 0.4;
        const ey = 0.5 + Math.sin(a) * 0.4 * p.ar;
        p.line(0.5, 0.5, ex, ey, 0.05, 'creme');
        const mx = 0.5 + Math.cos(a) * 0.25;
        const my = 0.5 + Math.sin(a) * 0.25 * p.ar;
        p.line(mx, my, mx + Math.cos(a + 0.8) * 0.1, my + Math.sin(a + 0.8) * 0.1 * p.ar, 0.04, 'ceu');
        p.line(mx, my, mx + Math.cos(a - 0.8) * 0.1, my + Math.sin(a - 0.8) * 0.1 * p.ar, 0.04, 'ceu');
      }
      p.circle(0.5, 0.5, 0.07, 'ceu');
    },
  },
  // ------------------------------------------------------------- doces
  {
    key: 'queque',
    theme: 'doces',
    draw: (p) => {
      p.fill('menta');
      p.poly([[0.22, 0.55], [0.78, 0.55], [0.7, 0.95], [0.3, 0.95]], 'azul');
      for (const x of [0.35, 0.5, 0.65]) p.line(x, 0.57, x - 0.02, 0.93, 0.025, 'ceu');
      p.circle(0.5, 0.45, 0.25, 'rosado');
      p.circle(0.32, 0.53, 0.12, 'rosado');
      p.circle(0.68, 0.53, 0.12, 'rosado');
      p.circle(0.5, 0.18, 0.08, 'cereja');
      for (const [x, y] of [[0.4, 0.4], [0.6, 0.38], [0.5, 0.5], [0.35, 0.52], [0.66, 0.52]] as const) p.ellipse(x, y, 0.02, 0.012, 'sol');
    },
  },
  {
    key: 'gelado',
    theme: 'doces',
    draw: (p) => {
      p.fill('lilas');
      p.poly([[0.3, 0.5], [0.7, 0.5], [0.5, 0.97]], 'areia');
      p.line(0.36, 0.6, 0.6, 0.8, 0.02, 'ambar');
      p.line(0.64, 0.6, 0.4, 0.8, 0.02, 'ambar');
      p.circle(0.5, 0.42, 0.22, 'rosado');
      p.circle(0.5, 0.22, 0.17, 'menta');
      p.circle(0.5, 0.06, 0.05, 'cereja');
    },
  },
  {
    key: 'chupa',
    theme: 'doces',
    draw: (p) => {
      p.fill('agua');
      p.line(0.5, 0.55, 0.5, 0.98, 0.05, 'creme');
      p.circle(0.5, 0.36, 0.3, 'rosa');
      p.ring(0.5, 0.36, 0.08, 0.14, 'creme');
      p.ring(0.5, 0.36, 0.2, 0.25, 'creme');
      p.circle(0.5, 0.36, 0.04, 'creme');
    },
  },
  {
    key: 'donut',
    theme: 'doces',
    draw: (p) => {
      p.fill('ceu');
      p.circle(0.5, 0.52, 0.42, 'ambar');
      p.circle(0.5, 0.48, 0.38, 'magenta');
      p.circle(0.5, 0.5, 0.13, 'ceu');
      for (const [x, y, c] of [[0.3, 0.35, 'sol'], [0.62, 0.28, 'agua'], [0.72, 0.55, 'sol'], [0.35, 0.65, 'agua'], [0.55, 0.72, 'creme'], [0.25, 0.5, 'creme']] as const)
        p.ellipse(x, y, 0.035, 0.015, c, 0.6);
    },
  },
  {
    key: 'rebucado',
    theme: 'doces',
    draw: (p) => {
      p.fill('creme');
      p.poly([[0.05, 0.3], [0.3, 0.5], [0.05, 0.7]], 'turquesa');
      p.poly([[0.95, 0.3], [0.7, 0.5], [0.95, 0.7]], 'turquesa');
      p.ellipse(0.5, 0.5, 0.25, 0.18, 'violeta');
      p.line(0.38, 0.38, 0.5, 0.65, 0.05, 'lilas');
      p.line(0.55, 0.36, 0.65, 0.6, 0.05, 'lilas');
    },
  },
  {
    key: 'bolo',
    theme: 'doces',
    draw: (p) => {
      p.fill('rosado');
      p.rect(0.15, 0.5, 0.85, 0.9, 'areia');
      p.rect(0.15, 0.62, 0.85, 0.68, 'cereja');
      p.rect(0.15, 0.76, 0.85, 0.82, 'cereja');
      p.rect(0.15, 0.42, 0.85, 0.52, 'creme');
      for (const x of [0.22, 0.38, 0.54, 0.7]) p.circle(x + 0.04, 0.52, 0.04, 'creme');
      p.rect(0.47, 0.22, 0.53, 0.42, 'azul');
      p.ellipse(0.5, 0.17, 0.03, 0.05, 'sol');
    },
  },
  {
    key: 'bolacha',
    theme: 'doces',
    draw: (p) => {
      p.fill('turquesa');
      p.circle(0.5, 0.5, 0.42, 'mel');
      p.circle(0.5, 0.5, 0.36, 'sol');
      for (const [x, y] of [[0.35, 0.35], [0.6, 0.3], [0.68, 0.55], [0.4, 0.62], [0.55, 0.72], [0.5, 0.48]] as const) p.circle(x, y, 0.05, 'castanho');
    },
  },
];
