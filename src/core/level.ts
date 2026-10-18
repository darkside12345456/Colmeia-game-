// Validação estrutural de um nível (inclui a invariante de contagem por cor).
import { PALETTE_BY_ID } from './palette';
import { charColor, type LevelData } from './types';

export const COLUMN_COUNT = 4;

/** Conta os blocos de cada cor no quadro (inclui os que estão por baixo de pedras e flores). */
export function countBlocks(level: LevelData): number[] {
  const counts = new Array(level.colors.length).fill(0);
  for (const row of level.grid) {
    for (const ch of row) {
      const c = charColor(ch);
      if (c >= 0) counts[c]++;
    }
  }
  return counts;
}

/** Soma dos números das peças de cada cor. */
export function countPieces(level: LevelData): number[] {
  const counts = new Array(level.colors.length).fill(0);
  for (const col of level.columns) for (const p of col) counts[p.c] += p.n;
  return counts;
}

/** Devolve a lista de problemas encontrados (vazia = nível válido). */
export function validateLevel(level: LevelData): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(`Nível ${level.id}: ${m}`);
  if (level.columns.length !== COLUMN_COUNT) err(`tem ${level.columns.length} colunas (esperado ${COLUMN_COUNT})`);
  if (level.grid.length !== level.h) err('altura da grelha errada');
  if (level.grid.some((r) => r.length !== level.w)) err('largura da grelha errada');
  for (const id of level.colors) if (!PALETTE_BY_ID.has(id)) err(`cor fora da paleta: ${id}`);
  if (new Set(level.colors).size !== level.colors.length) err('cores repetidas');

  const blocks = countBlocks(level);
  const pieces = countPieces(level);
  blocks.forEach((b, c) => {
    if (b !== pieces[c]) err(`invariante falhou na cor ${level.colors[c]}: ${b} blocos vs ${pieces[c]} nas peças`);
    if (b === 0) err(`cor ${level.colors[c]} sem blocos`);
  });

  const ids = new Map<number, { col: number; idx: number }>();
  level.columns.forEach((col, ci) =>
    col.forEach((p, pi) => {
      if (ids.has(p.id)) err(`id de peça repetido ${p.id}`);
      ids.set(p.id, { col: ci, idx: pi });
      if (p.n <= 0) err(`peça ${p.id} com número inválido`);
      if (p.c < 0 || p.c >= level.colors.length) err(`peça ${p.id} com cor inválida`);
    }),
  );
  level.columns.forEach((col, ci) =>
    col.forEach((p, pi) => {
      if (p.twin !== undefined) {
        const t = ids.get(p.twin);
        const tp = t ? level.columns[t.col][t.idx] : undefined;
        if (!t || !tp || tp.twin !== p.id) err(`gémea ${p.id} mal ligada`);
        else if (t.col === ci) err(`gémeas ${p.id} na mesma coluna`);
      }
      if (p.tube !== undefined) {
        const next = col[pi + 1];
        if (!next || next.id !== p.tube) err(`tubo da peça ${p.id} tem de ligar à peça logo atrás`);
        if (next?.twin !== undefined || p.twin !== undefined) err(`tubo ${p.id} com gémeas não suportado`);
      }
    }),
  );
  const cellAt = (x: number, y: number) => charColor(level.grid[y]?.[x] ?? '.');
  for (const s of level.stones ?? []) {
    if (cellAt(s.x, s.y) < 0) err(`pedra em célula vazia (${s.x},${s.y})`);
    if (s.n <= 0) err('pedra com número inválido');
  }
  const lockColors = new Set((level.flowers ?? []).map((f) => f.lock));
  for (const f of level.flowers ?? []) {
    const c = cellAt(f.x, f.y);
    if (c < 0) err(`flor em célula vazia (${f.x},${f.y})`);
    if (c === f.lock) err('flor fechada pela própria cor');
    if (lockColors.has(c)) err('flor de uma cor que também fecha flores (pode bloquear)');
  }
  return errors;
}
