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

describe('chave escondida no quadro', () => {
  // 5 verdes em cima (a chave está no do meio), 5 azuis em baixo
  const grid = ['00000', '11111'];
  const mk = () => makeLevel(grid, [[p(1, 5)], [p(0, 5)], [], []], { locks: [{ c: 1, x: 2, y: 0 }] });

  it('o cadeado abre quando uma abelha apanha o bloco com a chave', () => {
    expect(validateLevel(mk())).toEqual([]);
    const e = new GameEngine(mk());
    expect(e.checkTap(0)).toBe('locked');
    expect(e.keyNeed(0)).toBe(1);
    e.tap(1);
    const ev = e.runToQuiescence();
    expect(ev.some((x) => x.type === 'lockOpen')).toBe(true);
    expect(e.keyProgress(0)).toBe(1);
    expect(e.checkTap(0)).toBe('ok');
  });

  it('a chave não pode estar num bloco da cor fechada', () => {
    const bad = makeLevel(grid, [[p(1, 5)], [p(0, 5)], [], []], { locks: [{ c: 1, x: 2, y: 1 }] });
    expect(validateLevel(bad).join()).toContain('própria cor fechada');
  });
});

describe('gelo, corrente e a dormir', () => {
  const grid = ['0000011111', '2222233333'];

  it('gelo: a peça só se toca depois de completar N peças', () => {
    const level = makeLevel(grid, [[p(0, 5)], [p(1, 5, { ice: 2 })], [p(2, 5)], [p(3, 5)]]);
    expect(validateLevel(level)).toEqual([]);
    const e = new GameEngine(level);
    expect(e.checkTap(1)).toBe('frozen');
    expect(e.iceLeft(e.pieces.get(e.columns[1][0])!)).toBe(2);
    e.tap(0);
    e.runToQuiescence();
    expect(e.checkTap(1)).toBe('frozen');
    e.tap(2);
    e.runToQuiescence();
    expect(e.piecesDone).toBe(2);
    expect(e.checkTap(1)).toBe('ok');
  });

  it('corrente: a peça só se toca depois de a peça ligada entrar na bandeja', () => {
    const a = p(0, 5);
    const level = makeLevel(grid, [[a], [p(1, 5, { chain: a.id })], [p(2, 5)], [p(3, 5)]]);
    expect(validateLevel(level)).toEqual([]);
    const e = new GameEngine(level);
    expect(e.checkTap(1)).toBe('chained');
    e.tap(0);
    expect(e.checkTap(1)).toBe('ok');
  });

  it('corrente na mesma coluna ou em ciclo é recusada', () => {
    const a = p(0, 5);
    const b = p(1, 5);
    const same = makeLevel(grid, [[{ ...a, chain: b.id }, b], [], [p(2, 5)], [p(3, 5)]]);
    expect(validateLevel(same).join()).toContain('mesma coluna');
    const c1 = p(0, 5);
    const c2 = p(1, 5);
    c1.chain = c2.id;
    c2.chain = c1.id;
    const cycle = makeLevel(grid, [[c1], [c2], [p(2, 5)], [p(3, 5)]]);
    expect(validateLevel(cycle).join()).toContain('ciclo');
  });

  it('a dormir: a peça só acorda quando a cor indicada é toda recolhida', () => {
    const level = makeLevel(grid, [[p(0, 5)], [p(1, 5, { wait: 0 })], [p(2, 5)], [p(3, 5)]]);
    expect(validateLevel(level)).toEqual([]);
    const e = new GameEngine(level);
    expect(e.checkTap(1)).toBe('asleep');
    e.tap(0);
    e.runToQuiescence();
    expect(e.checkTap(1)).toBe('ok');
    const s = solve(level);
    expect(s.status).toBe('solved');
  });

  it('o Baralhar não mexe em peças com gelo, corrente ou a dormir', () => {
    const a = p(0, 5);
    const level = makeLevel(grid, [[a, p(2, 3)], [p(1, 5, { chain: a.id })], [p(2, 2), p(3, 2, { ice: 1 })], [p(3, 3)]]);
    const e = new GameEngine(level);
    const before = e.columns.map((c) => c.slice());
    for (let k = 0; k < 10; k++) e.shuffleColumns();
    expect(e.columns[1][0]).toBe(before[1][0]);
    expect(e.columns[0][0]).toBe(before[0][0]);
    expect(e.columns[2][1]).toBe(before[2][1]);
  });
});
