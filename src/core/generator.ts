// Gerador de níveis.
//
// Ideia principal (resolúvel por construção):
// 1. Simula o quadro com o motor real e vai escolhendo peças (cor + número) uma a uma,
//    sempre em calma. Esta sequência é uma solução válida com 5 ranhuras.
// 2. Distribui a sequência pelas 4 colunas mantendo a ordem dentro de cada coluna,
//    por isso o jogador consegue sempre repetir a solução.
// 3. Mede a dificuldade com o solver (estratégia gulosa + jogos aleatórios) e só aceita
//    o nível se bater certo com a etiqueta pedida.
import { DEFAULT_SLOTS, GameEngine } from './engine';
import { countBlocks, validateLevel } from './level';
import { hashInts, Rng } from './rng';
import { lossRate, playGreedy, replay, solve } from './solver';
import type { Difficulty, FlowerDef, LevelData, PieceDef, StoneDef } from './types';
import { charColor } from './types';

export interface ArtGrid {
  key: string;
  w: number;
  h: number;
  colors: string[];
  grid: string[];
}

export interface Obstacles {
  twins: boolean;
  tubes: boolean;
  stones: boolean;
  hidden: boolean;
  flowers: boolean;
}

/** Obstáculos que podem aparecer em cada nível (secção 2.3). */
export function obstaclesFor(levelId: number): Obstacles {
  return {
    twins: levelId >= 11,
    tubes: levelId >= 21,
    stones: levelId >= 31,
    hidden: levelId >= 41,
    flowers: levelId >= 61,
  };
}

export const PIECE_MIN = 5;
export const PIECE_MAX = 50;

/** Critérios de aceitação por dificuldade. */
export const DIFFICULTY_RULES = {
  hardMinLoss: 0.35,
  veryHardMinLoss: 0.75,
};

/** Classifica um nível a partir das medições do solver. */
export function classify(greedyWins: boolean, loss: number): Difficulty {
  if (greedyWins) return 'normal';
  return loss >= DIFFICULTY_RULES.veryHardMinLoss ? 'veryHard' : 'hard';
}

export function meetsTarget(target: Difficulty, greedyWins: boolean, loss: number): boolean {
  if (target === 'normal') return greedyWins;
  if (target === 'hard') return !greedyWins && loss >= DIFFICULTY_RULES.hardMinLoss && loss < DIFFICULTY_RULES.veryHardMinLoss;
  return !greedyWins && loss >= DIFFICULTY_RULES.veryHardMinLoss;
}

interface Tap {
  pieces: PieceDef[];
  tubeChild?: PieceDef;
}

interface ConstructParams {
  holdProb: number;
  twinProb: number;
  tubeProb: number;
  avgPiece: number;
  /** Só guarda uma peça parada se houver pelo menos este número de ranhuras livres */
  holdFree: number;
}

/** Constrói colunas + solução para um quadro (ou null se a simulação encravar). */
export function construct(
  base: LevelData,
  rng: Rng,
  obstacles: Obstacles,
  params: ConstructParams,
): { columns: PieceDef[][]; solution: number[] } | null {
  const e = new GameEngine({ ...base, columns: [] }, DEFAULT_SLOTS);
  const unassigned = countBlocks(base);
  const colorIdx = unassigned.map((_, i) => i);
  let nextId = 1;
  const taps: Tap[] = [];
  const risenAt = new Map<number, number>();
  let pendingTube = -1;

  const pickSize = (c: number): number => {
    const u = unassigned[c];
    const avg = params.avgPiece;
    let n: number;
    if (u <= PIECE_MAX && (u <= avg * 1.3 || rng.chance(0.25))) n = u;
    else {
      const lo = Math.max(PIECE_MIN, Math.round(avg * 0.5));
      const hi = Math.min(PIECE_MAX, Math.max(lo, Math.round(avg * 1.5)));
      n = Math.min(u, rng.int(lo, hi));
      const rest = u - n;
      if (rest > 0 && rest < PIECE_MIN) n = u <= PIECE_MAX ? u : u - PIECE_MIN;
    }
    unassigned[c] -= n;
    return n;
  };

  for (let guard = 0; guard < 2000; guard++) {
    for (const ev of e.runToQuiescence()) {
      if (ev.type === 'enter' && ev.source === 'tube') {
        risenAt.set(ev.pieceId, taps.length);
        if (ev.pieceId === pendingTube) pendingTube = -1;
      }
    }
    const left = colorIdx.filter((c) => unassigned[c] > 0);
    if (left.length === 0) break;
    const free = e.freeSlots();
    if (free === 0) return null;

    const trayDemand = new Array(unassigned.length).fill(0);
    for (const id of e.slots) if (id >= 0) trayDemand[e.pieces.get(id)!.color] += e.demand(e.pieces.get(id)!);
    const progressing = left.filter((c) => e.countReachable(c) > trayDemand[c]);
    const hold = progressing.length === 0 || (free >= params.holdFree && rng.chance(params.holdProb));
    let pool = hold ? left.filter((c) => !progressing.includes(c)) : progressing;
    if (pool.length === 0) pool = left;
    const c = rng.pick(pool);
    const def: PieceDef = { id: nextId++, c, n: pickSize(c) };

    const left2 = colorIdx.filter((k) => unassigned[k] > 0);
    if (obstacles.twins && free >= 2 && left2.length > 0 && rng.chance(params.twinProb)) {
      const c2 = rng.pick(left2);
      const def2: PieceDef = { id: nextId++, c: c2, n: pickSize(c2) };
      def.twin = def2.id;
      def2.twin = def.id;
      e.injectPiece(def, 'slot');
      e.injectPiece(def2, 'slot');
      taps.push({ pieces: [def, def2] });
      continue;
    }
    if (obstacles.tubes && pendingTube < 0 && left2.length > 0 && rng.chance(params.tubeProb)) {
      const c3 = rng.pick(left2);
      const child: PieceDef = { id: nextId++, c: c3, n: pickSize(c3) };
      def.tube = child.id;
      e.injectPiece(def, 'slot');
      e.injectPiece(child, 0, def.id);
      pendingTube = child.id;
      taps.push({ pieces: [def], tubeChild: child });
      continue;
    }
    e.injectPiece(def, 'slot');
    taps.push({ pieces: [def] });
  }
  e.runToQuiescence();
  if (!e.isWon()) return null;

  // Distribuir pelas colunas mantendo a ordem da solução.
  const columns: PieceDef[][] = [[], [], [], []];
  const blockedUntil = [0, 0, 0, 0];
  const solution: number[] = [];
  for (let i = 0; i < taps.length; i++) {
    const tap = taps[i];
    const valid = [0, 1, 2, 3].filter((k) => blockedUntil[k] <= i);
    const need = tap.pieces.length;
    if (valid.length < need) return null;
    const chosen = valid
      .map((k) => ({ k, score: columns[k].length + rng.next() * 2.5 }))
      .sort((a, b) => a.score - b.score)
      .slice(0, need)
      .map((x) => x.k);
    tap.pieces.forEach((p, j) => columns[chosen[j]].push(p));
    if (tap.tubeChild) {
      columns[chosen[0]].push(tap.tubeChild);
      blockedUntil[chosen[0]] = risenAt.get(tap.tubeChild.id) ?? Infinity;
    }
    solution.push(chosen[0]);
  }
  if (obstacles.hidden) {
    for (const col of columns) for (let d = 1; d < col.length; d++) if (rng.chance(0.25)) col[d].hidden = true;
  }
  return { columns, solution };
}

function placeStones(base: LevelData, rng: Rng, total: number): StoneDef[] {
  const stones: StoneDef[] = [];
  const count = rng.int(1, Math.min(3, 1 + Math.floor(total / 400)));
  for (let k = 0; k < count * 20 && stones.length < count; k++) {
    const x = rng.int(1, base.w - 2);
    const y = rng.int(1, base.h - 2);
    if (charColor(base.grid[y][x]) < 0 || stones.some((s) => s.x === x && s.y === y)) continue;
    stones.push({ x, y, n: rng.int(Math.round(total * 0.08), Math.round(total * 0.3)) });
  }
  return stones;
}

function placeFlowers(base: LevelData, rng: Rng, counts: number[], stones: StoneDef[]): FlowerDef[] {
  const candidates = counts.map((n, i) => ({ n, i })).filter((x) => x.n >= 10);
  if (candidates.length < 2) return [];
  const lock = rng.pick(candidates).i;
  const flowers: FlowerDef[] = [];
  const want = rng.int(2, 5);
  for (let k = 0; k < 200 && flowers.length < want; k++) {
    const x = rng.int(0, base.w - 1);
    const y = rng.int(0, base.h - 1);
    const c = charColor(base.grid[y][x]);
    if (c < 0 || c === lock) continue;
    if (flowers.some((f) => f.x === x && f.y === y) || stones.some((s) => s.x === x && s.y === y)) continue;
    flowers.push({ x, y, lock });
  }
  return flowers;
}

function hardness(greedyWins: boolean, loss: number): number {
  return (greedyWins ? 0 : 1) + loss;
}

/**
 * Pesquisa local: troca peças livres de sítio nas colunas e fica com a troca se o nível
 * continuar resolúvel (verificado pelo solver) e ficar mais difícil.
 */
export function hardenLevel(level: LevelData, rng: Rng, target: Difficulty, runs: number, budget: number): LevelData {
  let cur = level;
  let curGreedy = cur.stats!.greedyWins;
  let curLoss = cur.stats!.lossRate;
  for (let k = 0; k < budget && !meetsTarget(target, curGreedy, curLoss); k++) {
    const cols = cur.columns.map((c) => c.map((p) => ({ ...p })));
    const free = (p: PieceDef) => p.twin === undefined && p.tube === undefined && !cols.some((c) => c.some((q) => q.tube === p.id));
    const a = rng.int(0, 3);
    if (cols[a].length === 0) continue;
    const ia = rng.int(0, cols[a].length - 1);
    if (!free(cols[a][ia])) continue;
    if (rng.chance(0.5)) {
      // trocar duas peças (podem ser de colunas diferentes)
      const b = rng.int(0, 3);
      if (cols[b].length === 0) continue;
      const ib = rng.int(0, cols[b].length - 1);
      if (!free(cols[b][ib]) || (a === b && ia === ib)) continue;
      [cols[a][ia], cols[b][ib]] = [cols[b][ib], cols[a][ia]];
    } else {
      // mudar uma peça para outra coluna/posição
      const [moved] = cols[a].splice(ia, 1);
      const b = rng.int(0, 3);
      const ib = rng.int(0, cols[b].length);
      if (cols[b][ib] && !free(cols[b][ib]) && cols[b][ib - 1]?.tube !== undefined) continue;
      if (ib > 0 && cols[b][ib - 1].tube !== undefined) continue; // não separar um tubo
      cols[b].splice(ib, 0, moved);
    }
    const cand: LevelData = { ...cur, columns: cols };
    if (validateLevel(cand).length) continue;
    const greedyWins = playGreedy(cand).won;
    const loss = lossRate(cand, runs, rng.int(1, 1e9));
    if (target !== 'normal' && hardness(greedyWins, loss) <= hardness(curGreedy, curLoss)) continue;
    if (target === 'hard' && loss >= DIFFICULTY_RULES.veryHardMinLoss && !curGreedy) continue;
    const sol = solve(cand, DEFAULT_SLOTS, 4000);
    if (sol.status !== 'solved') continue;
    cur = { ...cand, solution: sol.taps };
    curGreedy = greedyWins;
    curLoss = loss;
    cur.stats = { ...cur.stats!, greedyWins, lossRate: Math.round(loss * 1000) / 1000 };
  }
  return cur;
}

export interface GenParams {
  id: number;
  seed: number;
  target: Difficulty;
  art: ArtGrid;
  attempts?: number;
  runs?: number;
}

export interface GenOutcome {
  level: LevelData;
  attempts: number;
  hitTarget: boolean;
}

const HOLD: Record<Difficulty, number> = { normal: 0.02, hard: 0.25, veryHard: 0.4 };
const PIECE_FACTOR: Record<Difficulty, number> = { normal: 1.15, hard: 0.85, veryHard: 0.7 };

export function generateLevel(params: GenParams): GenOutcome {
  const { id, seed, target, art } = params;
  const attempts = params.attempts ?? 40;
  const runs = params.runs ?? 24;
  const obstacles = obstaclesFor(id);
  const base0: LevelData = {
    id,
    seed,
    difficulty: target,
    art: art.key,
    w: art.w,
    h: art.h,
    colors: art.colors,
    grid: art.grid,
    columns: [],
  };
  const total = countBlocks(base0).reduce((a, b) => a + b, 0);
  const targetPieces = Math.max(10, Math.min(64, Math.round(total / 22)));
  const avgPiece = Math.max(PIECE_MIN + 2, Math.min(PIECE_MAX - 5, (total / targetPieces) * PIECE_FACTOR[target]));

  let best: { level: LevelData; score: number } | null = null;
  for (let a = 0; a < attempts; a++) {
    const rng = new Rng(hashInts(seed, a));
    const base: LevelData = { ...base0, seed: hashInts(seed, a) };
    if (obstacles.stones && rng.chance(0.6)) base.stones = placeStones(base, rng, total);
    if (obstacles.flowers && rng.chance(0.5)) base.flowers = placeFlowers(base, rng, countBlocks(base), base.stones ?? []);
    if (!base.stones?.length) delete base.stones;
    if (!base.flowers?.length) delete base.flowers;
    // A dificuldade sobe um pouco com tentativas falhadas.
    const holdProb = Math.min(0.75, HOLD[target] + (target === 'normal' ? 0 : a * 0.015));
    const holdFree = target === 'normal' ? 3 : 2;
    const built = construct(base, rng, obstacles, { holdProb, holdFree, twinProb: 0.12, tubeProb: 0.1, avgPiece });
    if (!built) continue;
    const level: LevelData = { ...base, columns: built.columns, solution: built.solution };
    const errors = validateLevel(level);
    if (errors.length) throw new Error(errors.join('\n'));
    if (!replay(level, built.solution)) throw new Error(`Nível ${id}: a solução construída não ganha (erro no gerador)`);
    const greedyWins = playGreedy(level).won;
    const loss = lossRate(level, runs, hashInts(seed, a, 77));
    const blocks = total;
    const pieces = level.columns.reduce((n, c) => n + c.length, 0);
    level.stats = { greedyWins, lossRate: Math.round(loss * 1000) / 1000, blocks, pieces };
    if (target !== 'normal' && !meetsTarget(target, greedyWins, loss) && a % 4 === 3) {
      const hardened = hardenLevel(level, rng, target, runs, 60);
      if (meetsTarget(target, hardened.stats!.greedyWins, hardened.stats!.lossRate)) {
        hardened.difficulty = target;
        return { level: hardened, attempts: a + 1, hitTarget: true };
      }
    }
    if (meetsTarget(target, greedyWins, loss)) {
      level.difficulty = target;
      return { level, attempts: a + 1, hitTarget: true };
    }
    // Guarda o candidato mais próximo do pretendido (com a etiqueta verdadeira).
    const score =
      target === 'normal' ? (greedyWins ? 2 : 0) - loss : (greedyWins ? 0 : 1) + (target === 'veryHard' ? loss : 1 - Math.abs(loss - 0.55));
    if (!best || score > best.score) {
      level.difficulty = classify(greedyWins, loss);
      best = { level, score };
    }
  }
  if (!best) throw new Error(`Nível ${id}: não foi possível gerar (arte ${art.key})`);
  return { level: best.level, attempts, hitTarget: false };
}
