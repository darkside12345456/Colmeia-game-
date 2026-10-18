// Testes automáticos dos 300 níveis: todos resolúveis com 5 ranhuras e invariante de contagem certa.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classify } from '../src/core/generator';
import { countBlocks, countPieces, validateLevel } from '../src/core/level';
import { clearsWithAllPieces, replay } from '../src/core/solver';
import type { LevelData } from '../src/core/types';

const files = readdirSync('levels').filter((f) => /^level_\d{4}\.json$/.test(f)).sort();
const levels: LevelData[] = files.map((f) => JSON.parse(readFileSync(`levels/${f}`, 'utf8')));

describe('níveis', () => {
  it('existem 300 níveis numerados de 1 a 300', () => {
    expect(levels.length).toBe(300);
    levels.forEach((l, i) => expect(l.id).toBe(i + 1));
  });

  it('estrutura válida e invariante de contagem (peças = blocos, por cor)', () => {
    for (const l of levels) {
      expect(validateLevel(l)).toEqual([]);
      expect(countPieces(l)).toEqual(countBlocks(l));
    }
  });

  it('tamanhos, cores e peças dentro das regras', () => {
    for (const l of levels) {
      expect(l.w).toBeGreaterThanOrEqual(16);
      expect(l.w).toBeLessThanOrEqual(40);
      expect(l.h).toBeLessThanOrEqual(44);
      expect(l.colors.length).toBeLessThanOrEqual(9);
      for (const p of l.columns.flat()) {
        expect(p.n).toBeGreaterThanOrEqual(5);
        expect(p.n).toBeLessThanOrEqual(50);
      }
    }
  });

  it('todos resolúveis com 5 ranhuras (a solução guardada ganha)', () => {
    for (const l of levels) {
      expect(l.solution, `nível ${l.id}`).toBeDefined();
      expect(replay(l, l.solution!), `nível ${l.id}`).toBe(true);
    }
  });

  it('pedras e flores nunca bloqueiam o quadro para sempre', () => {
    for (const l of levels.filter((x) => x.stones || x.flowers)) expect(clearsWithAllPieces(l), `nível ${l.id}`).toBe(true);
  });

  it('a etiqueta de dificuldade corresponde às medições do solver', () => {
    for (const l of levels) expect(classify(l.stats!.greedyWins, l.stats!.lossRate), `nível ${l.id}`).toBe(l.difficulty);
  });

  it('obstáculos só aparecem a partir do nível certo', () => {
    for (const l of levels) {
      const pieces = l.columns.flat();
      if (l.id < 11) expect(pieces.some((p) => p.twin !== undefined)).toBe(false);
      if (l.id < 21) expect(pieces.some((p) => p.tube !== undefined)).toBe(false);
      if (l.id < 31) expect(l.stones).toBeUndefined();
      if (l.id < 41) expect(pieces.some((p) => p.hidden)).toBe(false);
      if (l.id < 61) expect(l.flowers).toBeUndefined();
    }
  });
});
