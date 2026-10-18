// Quantizador: converte uma imagem (RGBA) numa grelha com as cores da paleta do jogo,
// com no máximo N cores por nível e sem cores demasiado parecidas.
import { colorChar, EMPTY_CHAR } from './types';
import { hexToRgb, PALETTE } from './palette';

export interface QuantizeOptions {
  maxColors?: number;
  /** Cores com menos blocos do que isto são juntadas à cor mais parecida */
  minCount?: number;
  /** Distância mínima entre duas cores do mesmo nível (0-765 aprox.) */
  minDistance?: number;
  /** Ids da paleta permitidos (por defeito todos) */
  allowed?: string[];
}

export interface QuantizeResult {
  colors: string[];
  grid: string[];
}

const RGB = new Map(PALETTE.map((c) => [c.id, hexToRgb(c.hex)]));

/** Distância de cor "redmean" (aproxima a perceção humana sem converter para Lab). */
export function colorDistance(a: readonly number[], b: readonly number[]): number {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

function nearest(rgb: readonly number[], ids: string[]): string {
  let best = ids[0];
  let bd = Infinity;
  for (const id of ids) {
    const d = colorDistance(rgb, RGB.get(id)!);
    if (d < bd) {
      bd = d;
      best = id;
    }
  }
  return best;
}

export function quantize(w: number, h: number, rgba: Uint8Array | Buffer, opts: QuantizeOptions = {}): QuantizeResult {
  const maxColors = opts.maxColors ?? 9;
  const minCount = opts.minCount ?? 8;
  const minDistance = opts.minDistance ?? 70;
  const allowed = opts.allowed ?? PALETTE.map((c) => c.id);

  // 1) cada píxel opaco -> cor da paleta mais próxima
  const cell: (string | null)[] = new Array(w * h).fill(null);
  for (let i = 0; i < w * h; i++) {
    if (rgba[i * 4 + 3] < 128) continue;
    cell[i] = nearest([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]], allowed);
  }

  // 2) juntar cores raras, parecidas ou em excesso à cor mais próxima (mais frequente primeiro)
  for (;;) {
    const counts = new Map<string, number>();
    for (const c of cell) if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    const ids = [...counts.keys()].sort((a, b) => counts.get(a)! - counts.get(b)! || a.localeCompare(b));
    if (ids.length <= 1) break;
    let victim: string | null = null;
    if (ids.length > maxColors) victim = ids[0];
    else if (counts.get(ids[0])! < minCount) victim = ids[0];
    else {
      // par de cores mais parecido abaixo do limite: junta a menos frequente
      let bestD = Infinity;
      for (let a = 0; a < ids.length; a++) {
        for (let b = a + 1; b < ids.length; b++) {
          const d = colorDistance(RGB.get(ids[a])!, RGB.get(ids[b])!);
          if (d < minDistance && d < bestD) {
            bestD = d;
            victim = ids[a]; // ids ordenados por frequência crescente
          }
        }
      }
    }
    if (!victim) break;
    const target = nearest(RGB.get(victim)!, ids.filter((x) => x !== victim));
    for (let i = 0; i < cell.length; i++) if (cell[i] === victim) cell[i] = target;
  }

  // 3) cores do nível ordenadas por frequência (mais usada = índice 0)
  const counts = new Map<string, number>();
  for (const c of cell) if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  const colors = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b));
  const index = new Map(colors.map((c, i) => [c, i]));
  const grid: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const c = cell[y * w + x];
      row += c ? colorChar(index.get(c)!) : EMPTY_CHAR;
    }
    grid.push(row);
  }
  return { colors, grid };
}
