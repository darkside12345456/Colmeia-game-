import { describe, expect, it } from 'vitest';
import { GameEngine, KIND_BLOCK, KIND_STONE } from '../src/core/engine';
import { validateLevel } from '../src/core/level';
import { Rng } from '../src/core/rng';
import { clearsWithAllPieces, playGreedy, replay, solve } from '../src/core/solver';
import { makeLevel, p } from './helpers';

/** Anel exterior verde (16) + interior 3x3 azul (9). */
function ringLevel() {
  const grid = ['00000', '01110', '01110', '01110', '00000'];
  return makeLevel(grid, [[p(1, 2), p(1, 1), p(0, 16)], [p(1, 2)], [p(1, 2)], [p(1, 2)]]);
}

describe('alcance (blocos alcançáveis)', () => {
  it('no início só a borda está acessível', () => {
    const e = new GameEngine(ringLevel());
    const reach: number[] = [];
    for (let i = 0; i < 25; i++) if (e.isReachable(i)) reach.push(i);
    expect(reach.length).toBe(16);
    expect(e.isReachable(12)).toBe(false); // centro
    expect(e.isReachable(6)).toBe(false); // interior
  });

  it('um buraco fechado no meio não conta como exterior', () => {
    const level = makeLevel(['00000', '01110', '01.10', '01110', '00000'], [[p(0, 16), p(1, 8)]]);
    const e = new GameEngine(level);
    expect(e.ext[12]).toBe(0);
    expect(e.isReachable(7)).toBe(false); // vizinho do buraco mas o buraco está fechado
  });

  it('um buraco ligado ao exterior torna os vizinhos alcançáveis', () => {
    const level = makeLevel(['00.00', '01110', '01110'], [[p(0, 9), p(1, 6)]]);
    const e = new GameEngine(level);
    expect(e.ext[2]).toBe(1);
    expect(e.isReachable(7)).toBe(true); // por baixo do buraco
  });

  it('as abelhas preferem o bloco alcançável mais perto da colmeia', () => {
    const level = makeLevel(['00000'], [[p(0, 5)]]);
    const e = new GameEngine(level);
    expect(e.findTarget(0)).toBe(2); // centro (a colmeia está por baixo, ao centro)
  });
});

describe('ranhuras, vitória e bloqueio', () => {
  it('a invariante de contagem está certa', () => {
    expect(validateLevel(ringLevel())).toEqual([]);
  });

  it('5 ranhuras cheias sem progresso => bloqueio', () => {
    const e = new GameEngine(ringLevel());
    for (const c of [0, 1, 2, 3, 0]) {
      expect(e.tap(c)).toBe(true);
      e.runToQuiescence();
    }
    expect(e.freeSlots()).toBe(0);
    expect(e.isBlocked()).toBe(true);
    expect(e.checkTap(0)).toBe('noSpace');
  });

  it('com a ordem certa ganha-se', () => {
    const level = ringLevel();
    const e = new GameEngine(level);
    for (const c of [0, 0, 0, 1, 2, 3]) {
      e.runToQuiescence();
      expect(e.tap(c)).toBe(true);
    }
    e.runToQuiescence();
    expect(e.isWon()).toBe(true);
    expect(e.blocksLeft).toBe(0);
    expect(e.slots.every((s) => s < 0)).toBe(true);
  });

  it('várias ranhuras trabalham ao mesmo tempo', () => {
    const level = makeLevel(['0011'], [[p(0, 2)], [p(1, 2)]]);
    const e = new GameEngine(level);
    e.tap(0);
    e.tap(1);
    const ev = e.advance(1);
    expect(ev.filter((x) => x.type === 'launch').length).toBe(2);
  });

  it('peça parada não avança e a ranhura fica ocupada até outra cor abrir caminho', () => {
    const e = new GameEngine(ringLevel());
    e.tap(1); // azul (interior) - não tem blocos alcançáveis
    e.runToQuiescence();
    expect(e.pieces.get(e.slots[0])!.remaining).toBe(2);
    expect(e.isQuiescent()).toBe(true);
  });

  it('peça que chega a 0 desaparece e liberta a ranhura', () => {
    const level = makeLevel(['000'], [[p(0, 3)]]);
    const e = new GameEngine(level);
    e.tap(0);
    const ev = e.runToQuiescence();
    expect(ev.some((x) => x.type === 'pieceDone')).toBe(true);
    expect(e.freeSlots()).toBe(5);
  });

  it('o resultado não depende dos fps (passos de tempo diferentes)', () => {
    const level = ringLevel();
    const taps = [0, 0, 0, 1, 2, 3];
    const a = new GameEngine(level);
    const b = new GameEngine(level);
    const rng = new Rng(7);
    for (const c of taps) {
      a.runToQuiescence();
      while (!b.isQuiescent()) b.advance(rng.int(1, 40));
      expect(b.stateKey()).toBe(a.stateKey());
      a.tap(c);
      b.tap(c);
    }
    a.runToQuiescence();
    while (!b.isQuiescent()) b.advance(rng.int(1, 40));
    expect(a.isWon() && b.isWon()).toBe(true);
  });
});

describe('obstáculos', () => {
  it('peças gémeas precisam de 2 ranhuras e entram juntas', () => {
    const level = makeLevel(['0011'], [[p(0, 2, { id: 501, twin: 502 })], [p(1, 2, { id: 502, twin: 501 })]]);
    expect(validateLevel(level)).toEqual([]);
    const e = new GameEngine(level, 1);
    expect(e.checkTap(0)).toBe('noSpace');
    e.addSlot();
    expect(e.tap(0)).toBe(true);
    expect(e.slots).toEqual([501, 502]);
    e.runToQuiescence();
    expect(e.isWon()).toBe(true);
  });

  it('gémea só entra quando a parceira também está à frente', () => {
    const level = makeLevel(['001111'], [[p(0, 2, { id: 601, twin: 602 })], [p(1, 2), p(1, 2, { id: 602, twin: 601 })]]);
    const e = new GameEngine(level);
    expect(e.checkTap(0)).toBe('twinNotFront');
    e.tap(1);
    expect(e.checkTap(0)).toBe('ok');
  });

  it('peça-tubo: a de trás sobe pelo tubo e ocupa a mesma ranhura', () => {
    const level = makeLevel(['000111'], [[p(0, 3, { id: 701, tube: 702 }), p(1, 3, { id: 702 })]]);
    expect(validateLevel(level)).toEqual([]);
    const e = new GameEngine(level);
    e.tap(0);
    expect(e.checkTap(0)).toBe('tube'); // a de trás está presa ao tubo
    const ev = e.runToQuiescence();
    const enter = ev.find((x) => x.type === 'enter' && x.source === 'tube');
    expect(enter).toBeTruthy();
    expect(e.isWon()).toBe(true);
  });

  it('pedra de cera parte depois de N blocos recolhidos e liberta o que está por trás', () => {
    // a pedra está na borda à esquerda, a tapar o bloco azul por trás
    const level = makeLevel(['00000', '01000', '00000'], [[p(0, 14), p(1, 1)]], {
      stones: [{ x: 0, y: 1, n: 3 }],
    });
    const e = new GameEngine(level);
    expect(e.kind[5]).toBe(KIND_STONE);
    expect(e.isReachable(5)).toBe(false);
    e.tap(0);
    let broke = false;
    while (!e.isQuiescent()) {
      const ev = e.advance(10);
      if (ev.some((x) => x.type === 'stoneBreak')) {
        broke = true;
        expect(e.picks).toBe(3);
      }
    }
    expect(broke).toBe(true);
    e.tap(0);
    e.runToQuiescence();
    expect(e.isWon()).toBe(true);
  });

  it('flor fechada só abre quando a cor indicada é toda recolhida', () => {
    const level = makeLevel(['0001111'], [[p(0, 2), p(1, 4), p(0, 1)]], { flowers: [{ x: 0, y: 0, lock: 1 }] });
    expect(validateLevel(level)).toEqual([]);
    const e = new GameEngine(level);
    e.tap(0);
    e.runToQuiescence();
    expect(e.kind[0]).not.toBe(KIND_BLOCK); // ainda fechada
    e.tap(0);
    const ev = e.runToQuiescence();
    expect(ev.some((x) => x.type === 'flowerOpen')).toBe(true);
    e.tap(0);
    e.runToQuiescence();
    expect(e.isWon()).toBe(true);
  });

  it('o validador recusa tubos que não ligam à peça logo atrás', () => {
    const level = makeLevel(['000111'], [[p(0, 3, { id: 801, tube: 803 }), p(1, 2), p(1, 1, { id: 803 })]]);
    expect(validateLevel(level).length).toBeGreaterThan(0);
  });
});

describe('reforços', () => {
  it('Flor-íman recolhe todos os blocos alcançáveis de uma cor e mantém a invariante', () => {
    const level = makeLevel(['00000', '01110', '00000'], [[p(0, 6), p(0, 6)], [p(1, 3)]]);
    const e = new GameEngine(level);
    const n = e.magnet(0);
    expect(n).toBe(12); // os 12 verdes estão todos na borda
    expect(e.colorRemaining[0]).toBe(0);
    expect(e.columns[0].length).toBe(0);
    e.tap(1);
    e.runToQuiescence();
    expect(e.isWon()).toBe(true);
  });

  it('Pinça tira uma peça de trás para a bandeja', () => {
    const e = new GameEngine(ringLevel());
    const back = e.columns[0][2];
    expect(e.tweezers(back)).toBe(true);
    expect(e.slots[0]).toBe(back);
    expect(e.columns[0].length).toBe(2);
  });

  it('+1 Ranhura acrescenta uma 6.ª ranhura', () => {
    const e = new GameEngine(ringLevel());
    expect(e.addSlot()).toBe(true);
    expect(e.capacity).toBe(6);
  });

  it('Baralhar mantém as mesmas peças', () => {
    const e = new GameEngine(ringLevel());
    const before = e.columns.flat().sort();
    e.shuffleColumns(new Rng(3));
    expect(e.columns.flat().sort()).toEqual(before);
  });
});

describe('solver', () => {
  it('encontra a solução do nível do anel e a solução repete-se', () => {
    const level = ringLevel();
    const r = solve(level);
    expect(r.status).toBe('solved');
    if (r.status === 'solved') expect(replay(level, r.taps)).toBe(true);
    expect(clearsWithAllPieces(level)).toBe(true);
  });

  it('a estratégia gulosa ganha o nível do anel (fácil)', () => {
    expect(playGreedy(ringLevel()).won).toBe(true);
  });

  it('com 2 ranhuras: a ordem certa ganha, a errada bloqueia e o solver distingue', () => {
    const grid = ['00000', '01110', '00000'];
    const good = makeLevel(grid, [[p(1, 1), p(1, 1), p(1, 1)], [], [], [p(0, 12)]]);
    const e = new GameEngine(good, 2);
    e.tap(0);
    e.tap(0);
    e.runToQuiescence();
    expect(e.isBlocked()).toBe(true); // 2 azuis presos na bandeja
    expect(solve(good, 2).status).toBe('solved'); // tocando no verde primeiro ganha-se
    const bad = makeLevel(grid, [[p(1, 1), p(1, 1), p(1, 1), p(0, 12)]]);
    expect(solve(bad, 2).status).toBe('unsolvable');
  });
});
