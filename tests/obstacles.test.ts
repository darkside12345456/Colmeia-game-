// Caixas e cadeados (cores bloqueadas com chave).
import { describe, expect, it } from 'vitest';
import { GameEngine, KIND_BLOCK, KIND_BOX } from '../src/core/engine';
import { validateLevel } from '../src/core/level';
import { replay, solve } from '../src/core/solver';
import { makeLevel, p } from './helpers';

describe('caixas', () => {
  // linha de cima verde (5), por baixo: verde, azul (caixa 1x1 no meio), verde...
  const grid = ['00000', '00100', '00000'];
  const level = () => makeLevel(grid, [[p(0, 14)], [p(1, 1)]], { boxes: [{ x: 2, y: 1, w: 1, h: 1, n: 3 }] });

  it('a caixa tapa o bloco até se recolherem N blocos ao lado dela', () => {
    expect(validateLevel(level())).toEqual([]);
    const e = new GameEngine(level());
    expect(e.kind[7]).toBe(KIND_BOX);
    expect(e.isReachable(7)).toBe(false);
    expect(e.checkTap(1)).toBe('ok');
    e.tap(1); // peça azul fica à espera: o bloco azul está tapado
    e.runToQuiescence();
    expect(e.blocksLeft).toBe(15);
    e.tap(0); // verdes: vão partindo a caixa
    const ev = e.runToQuiescence();
    const hits = ev.filter((x) => x.type === 'boxHit');
    expect(hits.length).toBe(3);
    expect(ev.some((x) => x.type === 'boxOpen')).toBe(true);
    expect(e.kind[7] === KIND_BLOCK || e.kind[7] === 0).toBe(true);
    expect(e.isWon()).toBe(true);
  });

  it('a validação recusa caixas impossíveis de partir', () => {
    const bad = makeLevel(grid, [[p(0, 14)], [p(1, 1)]], { boxes: [{ x: 2, y: 1, w: 1, h: 1, n: 5 }] });
    expect(validateLevel(bad).join()).toContain('só tem 4 à volta');
  });
});

describe('cadeados', () => {
  // 10 verdes + 6 azuis; o azul só abre depois de recolher 4 verdes
  const grid = ['0000011111', '0000011111'];
  const mk = (n = 4) =>
    makeLevel(grid, [[p(1, 10)], [p(0, 10)], [], []], { locks: [{ c: 1, key: 0, n }] });

  it('peças da cor fechada não se podem tocar até ganhar a chave', () => {
    const level = mk();
    expect(validateLevel(level)).toEqual([]);
    const e = new GameEngine(level);
    expect(e.checkTap(0)).toBe('locked');
    expect(e.legalTaps()).toEqual([1]);
    e.tap(1);
    const ev = e.runToQuiescence();
    expect(ev.some((x) => x.type === 'lockOpen')).toBe(true);
    expect(e.keyProgress(0)).toBe(4);
    expect(e.checkTap(0)).toBe('ok');
    e.tap(0);
    e.runToQuiescence();
    expect(e.isWon()).toBe(true);
  });

  it('a pinça também respeita o cadeado', () => {
    const e = new GameEngine(mk());
    const lockedId = e.columns[0][0];
    expect(e.canTweezers(lockedId)).toBe(false);
  });

  it('o solver encontra a ordem certa e a validação recusa chaves impossíveis', () => {
    const level = mk();
    const s = solve(level);
    expect(s.status).toBe('solved');
    if (s.status === 'solved') expect(replay(level, s.taps)).toBe(true);
    expect(validateLevel(mk(11)).join()).toContain('cadeado pede 11');
  });
});
