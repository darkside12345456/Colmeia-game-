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
  // caixas: só sobre blocos normais, sem se tocarem, e com vizinhos suficientes para partir
  const special = new Set([...(level.stones ?? []), ...(level.flowers ?? [])].map((o) => `${o.x},${o.y}`));
  const boxAt = new Map<string, number>();
  (level.boxes ?? []).forEach((b, k) => {
    if (b.w < 1 || b.h < 1 || b.x < 0 || b.y < 0 || b.x + b.w > level.w || b.y + b.h > level.h) err(`caixa ${k} fora do quadro`);
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) {
        if (cellAt(x, y) < 0) err(`caixa ${k} sobre célula vazia (${x},${y})`);
        if (special.has(`${x},${y}`)) err(`caixa ${k} sobre pedra ou flor`);
        if (boxAt.has(`${x},${y}`)) err(`caixas ${boxAt.get(`${x},${y}`)} e ${k} sobrepostas`);
        boxAt.set(`${x},${y}`, k);
      }
  });
  (level.boxes ?? []).forEach((b, k) => {
    let around = 0;
    for (let y = b.y - 1; y <= b.y + b.h; y++)
      for (let x = b.x - 1; x <= b.x + b.w; x++) {
        const inside = x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
        const side = (x >= b.x && x < b.x + b.w) || (y >= b.y && y < b.y + b.h);
        if (inside || !side) continue;
        const other = boxAt.get(`${x},${y}`);
        if (other !== undefined) err(`caixas ${k} e ${other} encostadas (podem bloquear-se)`);
        else if (cellAt(x, y) >= 0) around++;
      }
    if (b.n <= 0 || b.n > around) err(`caixa ${k} pede ${b.n} blocos mas só tem ${around} à volta`);
  });
  // cadeados: cor válida, chave de outra cor, sem cadeias, e peças da cor sem gémeas/tubos
  const locked = new Set<number>();
  const childOf = new Set(level.columns.flat().filter((p) => p.tube !== undefined).map((p) => p.tube));
  for (const l of level.locks ?? []) {
    if (l.c < 0 || l.c >= level.colors.length || l.key < 0 || l.key >= level.colors.length) err('cadeado com cor inválida');
    if (l.c === l.key) err('cadeado aberto pela própria cor');
    if (locked.has(l.c)) err('duas fechaduras na mesma cor');
    locked.add(l.c);
    if (l.n <= 0 || l.n > (blocks[l.key] ?? 0)) err(`cadeado pede ${l.n} blocos da chave mas só há ${blocks[l.key]}`);
    for (const p of level.columns.flat())
      if (p.c === l.c && (p.twin !== undefined || p.tube !== undefined || childOf.has(p.id))) err(`peça ${p.id} com cadeado não pode ser gémea nem tubo`);
  }
  for (const l of level.locks ?? []) if (locked.has(l.key)) err('a cor da chave também está fechada (cadeia de cadeados)');
  return errors;
}
