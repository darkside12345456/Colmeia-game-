// Simulador/solver: joga um nível sem gráficos, com o mesmo motor do jogo.
// Os toques são sempre feitos em "calma" (sem abelhas no ar), o que um jogador também pode fazer.
import { DEFAULT_SLOTS, GameEngine } from './engine';
import { Rng } from './rng';
import type { LevelData } from './types';

export interface PlayResult {
  won: boolean;
  taps: number[];
}

export function newEngine(level: LevelData, slots = DEFAULT_SLOTS): GameEngine {
  const e = new GameEngine(level, slots);
  e.recording = false;
  return e;
}

/** Pontuação gulosa de uma jogada: blocos alcançáveis da cor da peça. */
function greedyScore(e: GameEngine, col: number): number {
  const p = e.pieces.get(e.columns[col][0])!;
  let s = e.countReachable(p.color);
  if (p.twin >= 0) s += e.countReachable(e.pieces.get(p.twin)!.color);
  return s;
}

/** Estratégia gulosa simples: escolhe sempre a peça com mais blocos alcançáveis. */
export function playGreedy(level: LevelData, slots = DEFAULT_SLOTS, from?: GameEngine): PlayResult {
  const e = from ? from.clone() : newEngine(level, slots);
  e.recording = false;
  const taps: number[] = [];
  for (;;) {
    e.runToQuiescence();
    if (e.isWon()) return { won: true, taps };
    const legal = e.legalTaps();
    if (legal.length === 0) return { won: false, taps };
    let best = legal[0];
    let bestScore = -1;
    for (const c of legal) {
      const s = greedyScore(e, c);
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    e.tap(best);
    taps.push(best);
  }
}

/** Jogo aleatório (toques ao acaso entre os possíveis). */
export function playRandom(level: LevelData, rng: Rng, slots = DEFAULT_SLOTS): PlayResult {
  const e = newEngine(level, slots);
  const taps: number[] = [];
  for (;;) {
    e.runToQuiescence();
    if (e.isWon()) return { won: true, taps };
    const legal = e.legalTaps();
    if (legal.length === 0) return { won: false, taps };
    const c = rng.pick(legal);
    e.tap(c);
    taps.push(c);
  }
}

/** Percentagem de jogos aleatórios que acabam em derrota. */
export function lossRate(level: LevelData, runs: number, seed: number, slots = DEFAULT_SLOTS): number {
  const rng = new Rng(seed);
  let losses = 0;
  for (let i = 0; i < runs; i++) if (!playRandom(level, rng, slots).won) losses++;
  return losses / runs;
}

/** Repete uma sequência de toques. Devolve true se ganhar. */
export function replay(level: LevelData, taps: number[], slots = DEFAULT_SLOTS): boolean {
  const e = newEngine(level, slots);
  for (const c of taps) {
    e.runToQuiescence();
    if (!e.tap(c)) return false;
  }
  e.runToQuiescence();
  return e.isWon();
}

export type SolveResult = { status: 'solved'; taps: number[] } | { status: 'unsolvable' } | { status: 'unknown' };

/** Procura em profundidade uma sequência vencedora (com limite de nós). */
export function solve(level: LevelData, slots = DEFAULT_SLOTS, nodeLimit = 20000): SolveResult {
  const seen = new Set<string>();
  let nodes = 0;
  let aborted = false;
  const path: number[] = [];

  const dfs = (e: GameEngine): boolean => {
    e.runToQuiescence();
    if (e.isWon()) return true;
    if (++nodes > nodeLimit) {
      aborted = true;
      return false;
    }
    const key = e.stateKey();
    if (seen.has(key)) return false;
    seen.add(key);
    const legal = e.legalTaps();
    legal.sort((a, b) => greedyScore(e, b) - greedyScore(e, a));
    for (const c of legal) {
      const child = e.clone();
      child.tap(c);
      path.push(c);
      if (dfs(child)) return true;
      path.pop();
      if (aborted) return false;
    }
    return false;
  };

  const won = dfs(newEngine(level, slots));
  if (won) return { status: 'solved', taps: path.slice() };
  return aborted ? { status: 'unknown' } : { status: 'unsolvable' };
}

/**
 * Verifica que o quadro se esvazia com todas as peças na bandeja ao mesmo tempo
 * (garante que as pedras e flores nunca bloqueiam o nível para sempre).
 */
export function clearsWithAllPieces(level: LevelData): boolean {
  const total = level.columns.reduce((a, c) => a + c.length, 0);
  const e = newEngine(level, total);
  for (const col of level.columns) {
    for (const p of col) {
      // Coloca todas as peças diretamente na bandeja, ignorando tubos/gémeas.
      const idx = e.slots.indexOf(-1);
      e.slots[idx] = p.id;
      const rp = e.pieces.get(p.id)!;
      rp.tubeParent = -1;
      rp.tubeChild = -1;
      rp.twin = -1;
    }
  }
  e.columns = e.columns.map(() => []);
  e.scheduleLaunches();
  e.runToQuiescence();
  return e.blocksLeft === 0;
}

/**
 * "Baralhar" inteligente: experimenta várias ordens e escolhe uma em que a estratégia
 * gulosa ainda consegue ganhar a partir do estado atual (se existir).
 */
export function smartShuffle(engine: GameEngine, level: LevelData, tries = 10): void {
  const base = engine.clone();
  base.recording = false;
  const rng = new Rng(engine.rng.next() * 4294967296);
  for (let t = 0; t < tries; t++) {
    const cand = base.clone();
    const state = rng.state;
    cand.shuffleColumns(rng);
    if (playGreedy(level, engine.capacity, cand).won) {
      rng.state = state;
      engine.shuffleColumns(rng);
      return;
    }
  }
  engine.shuffleColumns(rng);
}
