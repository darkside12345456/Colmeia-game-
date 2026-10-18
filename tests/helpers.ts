import type { LevelData, PieceDef } from '../src/core/types';

let nextId = 1;

/** Cria uma peça para testes: p(cor, número, extras). */
export function p(c: number, n: number, extra: Partial<PieceDef> = {}): PieceDef {
  return { id: extra.id ?? nextId++, c, n, ...extra };
}

export function makeLevel(grid: string[], columns: PieceDef[][], extra: Partial<LevelData> = {}): LevelData {
  const maxColor = Math.max(
    ...grid.join('').split('').filter((ch) => ch !== '.').map((ch) => parseInt(ch, 36)),
  );
  const colors = ['verde', 'azul', 'rosa', 'sol', 'violeta', 'turquesa'].slice(0, maxColor + 1);
  while (columns.length < 4) columns.push([]);
  return {
    id: 999,
    seed: 1,
    difficulty: 'normal',
    w: grid[0].length,
    h: grid.length,
    colors,
    grid,
    columns,
    ...extra,
  };
}
