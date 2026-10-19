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
import type { BoxDef, Difficulty, FlowerDef, LevelData, LockDef, PieceDef, StoneDef } from './types';
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
  boxes: boolean;
  locks: boolean;
  ice: boolean;
  keyCell: boolean;
  chains: boolean;
  wait: boolean;
}

/** Obstáculos que podem aparecer em cada nível (secção 2.3). O 1.º nível de cada um tem-no sempre. */
export function obstaclesFor(levelId: number): Obstacles {
  return {
    twins: levelId >= 11,
    tubes: levelId >= 21,
    stones: levelId >= 31,
    hidden: levelId >= 41,
    flowers: levelId >= 61,
    boxes: levelId >= 81,
    locks: levelId >= 101,
    ice: levelId >= 121,
    keyCell: levelId >= 141,
    chains: levelId >= 161,
    wait: levelId >= 181,
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

/** Caixas de 2x2 a 3x3 sobre blocos normais, afastadas umas das outras e das pedras/flores. */
function placeBoxes(base: LevelData, rng: Rng, total: number): BoxDef[] {
  const boxes: BoxDef[] = [];
  const taken = new Set([...(base.stones ?? []), ...(base.flowers ?? [])].map((o) => `${o.x},${o.y}`));
  const count = rng.int(1, Math.min(3, 1 + Math.floor(total / 500)));
  const sizes: [number, number][] = base.w >= 24 ? [[2, 2], [3, 2], [2, 3], [3, 3]] : [[2, 2], [3, 2], [2, 3]];
  const cell = (x: number, y: number) => charColor(base.grid[y]?.[x] ?? '.');
  for (let k = 0; k < count * 40 && boxes.length < count; k++) {
    const [bw, bh] = rng.pick(sizes);
    const x0 = rng.int(1, base.w - bw - 1);
    const y0 = rng.int(1, base.h - bh - 1);
    let ok = true;
    // a caixa e uma margem de 1 à volta não podem tocar noutras caixas nem em pedras/flores
    for (let y = y0 - 1; y <= y0 + bh && ok; y++)
      for (let x = x0 - 1; x <= x0 + bw && ok; x++) {
        const inside = x >= x0 && x < x0 + bw && y >= y0 && y < y0 + bh;
        if (taken.has(`${x},${y}`) || boxes.some((b) => x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h)) ok = false;
        if (inside && cell(x, y) < 0) ok = false;
      }
    if (!ok) continue;
    let around = 0;
    for (let x = x0; x < x0 + bw; x++) around += (cell(x, y0 - 1) >= 0 ? 1 : 0) + (cell(x, y0 + bh) >= 0 ? 1 : 0);
    for (let y = y0; y < y0 + bh; y++) around += (cell(x0 - 1, y) >= 0 ? 1 : 0) + (cell(x0 + bw, y) >= 0 ? 1 : 0);
    if (around < 4) continue;
    const lo = Math.ceil(around * 0.35);
    boxes.push({ x: x0, y: y0, w: bw, h: bh, n: rng.int(lo, Math.max(lo, Math.floor(around * 0.7))) });
  }
  return boxes;
}

/**
 * Cadeado escolhido a partir da solução: a cor fechada só é tocada (na solução) depois de já
 * se terem recolhido N blocos da cor da chave, por isso o nível continua resolúvel.
 */
export function chooseLock(level: LevelData, rng: Rng): LockDef | null {
  const pieces = level.columns.flat();
  const tubeKids = new Set(pieces.filter((p) => p.tube !== undefined).map((p) => p.tube));
  const bad = new Set<number>();
  for (const p of pieces) if (p.twin !== undefined || p.tube !== undefined || tubeKids.has(p.id)) bad.add(p.c);
  const e = new GameEngine(level, DEFAULT_SLOTS);
  e.recording = false;
  const before = new Map<number, number[]>();
  for (const col of level.solution ?? []) {
    e.runToQuiescence();
    const c = e.pieces.get(e.columns[col][0])!.color;
    if (!before.has(c)) before.set(c, Array.from(e.colorTotal, (t, k) => t - e.colorRemaining[k]));
    e.tap(col);
  }
  const options: { c: number; key: number; got: number }[] = [];
  for (const [c, got] of before) {
    if (bad.has(c)) continue;
    got.forEach((n, key) => {
      if (key !== c && n >= 8) options.push({ c, key, got: n });
    });
  }
  if (options.length === 0) return null;
  const o = rng.pick(options);
  const hi = Math.min(o.got, 60);
  return { c: o.c, key: o.key, n: rng.int(Math.max(5, Math.round(hi * 0.5)), hi) };
}

interface TraceStep {
  /** Peças que entram na bandeja com este toque (a da frente e a gémea) */
  entered: number[];
  /** Peças completas antes do toque */
  done: number;
  /** Cores já todas recolhidas antes do toque */
  cleared: number[];
  /** Quantos blocos já tinham saído do quadro antes do toque */
  removed: number;
}

/** Repete a solução e regista, antes de cada toque, o estado que interessa aos desafios. */
export function traceSolution(level: LevelData): { steps: TraceStep[]; order: number[] } {
  const e = new GameEngine(level, DEFAULT_SLOTS);
  const order: number[] = [];
  const steps: TraceStep[] = [];
  const collect = () => {
    for (const ev of e.runToQuiescence()) {
      if (ev.type === 'pickup') order.push(ev.cell);
      else if (ev.type === 'magnet') order.push(...ev.cells);
    }
  };
  for (const col of level.solution ?? []) {
    collect();
    const front = e.pieces.get(e.columns[col][0])!;
    const cleared: number[] = [];
    e.colorRemaining.forEach((n, c) => n === 0 && cleared.push(c));
    steps.push({ entered: front.twin >= 0 ? [front.id, front.twin] : [front.id], done: e.piecesDone, cleared, removed: order.length });
    e.tap(col);
  }
  collect();
  return { steps, order };
}

/**
 * Troca a chave por blocos por uma chave escondida num bloco que, na solução, sai do quadro
 * antes de a cor fechada ser precisa (de preferência um dos últimos, mais para dentro).
 */
export function toCellLock(level: LevelData, lock: LockDef, rng: Rng): LockDef | null {
  const { steps, order } = traceSolution(level);
  const firstUse = steps.findIndex((s) => s.entered.some((id) => level.columns.flat().find((p) => p.id === id)?.c === lock.c));
  if (firstUse < 0) return null;
  const special = new Set([...(level.stones ?? []), ...(level.flowers ?? [])].map((o) => o.y * level.w + o.x));
  for (const b of level.boxes ?? []) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) special.add(y * level.w + x);
  const cand = order
    .slice(0, steps[firstUse].removed)
    .filter((i) => !special.has(i) && charColor(level.grid[(i / level.w) | 0][i % level.w]) !== lock.c);
  if (cand.length < 4) return null;
  const i = cand[rng.int(Math.floor(cand.length * 0.4), cand.length - 1)];
  return { c: lock.c, x: i % level.w, y: (i / level.w) | 0 };
}

/**
 * Gelo, corrente e a dormir em peças soltas. As condições são tiradas da solução (cumprem-se
 * antes de a peça ser tocada nela), por isso o nível continua resolúvel.
 */
export function addGates(level: LevelData, rng: Rng, obstacles: Obstacles, force: { ice: boolean; chains: boolean; wait: boolean }): void {
  const pieces = level.columns.flat();
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const colOf = new Map<number, number>();
  level.columns.forEach((col, ci) => col.forEach((p) => colOf.set(p.id, ci)));
  const tubeKids = new Set(pieces.filter((p) => p.tube !== undefined).map((p) => p.tube));
  const lockedColors = new Set((level.locks ?? []).map((l) => l.c));
  const { steps } = traceSolution(level);
  const stepOf = new Map<number, number>();
  steps.forEach((s, k) => s.entered.forEach((id) => stepOf.set(id, k)));
  const usedAsTarget = new Set<number>();
  const free = (p: PieceDef) =>
    p.twin === undefined && p.tube === undefined && !tubeKids.has(p.id) && p.ice === undefined && p.chain === undefined && p.wait === undefined && !lockedColors.has(p.c) && !usedAsTarget.has(p.id);
  const pickPiece = (ok: (p: PieceDef, s: TraceStep, k: number) => boolean): PieceDef | null => {
    const cand = pieces.filter((p) => free(p) && stepOf.has(p.id) && ok(p, steps[stepOf.get(p.id)!], stepOf.get(p.id)!));
    return cand.length ? rng.pick(cand) : null;
  };
  if (obstacles.ice && (force.ice || rng.chance(0.55))) {
    const count = rng.int(1, 2);
    for (let k = 0; k < count; k++) {
      const p = pickPiece((_, s) => s.done >= 1);
      if (p) p.ice = rng.int(1, Math.min(3, steps[stepOf.get(p.id)!].done));
    }
  }
  if (obstacles.chains && (force.chains || rng.chance(0.45))) {
    const p = pickPiece((q, _, k) => k >= 2 && steps.slice(0, k).some((s) => s.entered.some((id) => colOf.get(id) !== colOf.get(q.id))));
    if (p) {
      const k = stepOf.get(p.id)!;
      const targets = steps
        .slice(0, k)
        .flatMap((s) => s.entered)
        .filter((id) => colOf.get(id) !== colOf.get(p.id) && byId.get(id)?.chain === undefined);
      if (targets.length) {
        // de preferência uma peça tocada pouco antes (a corrente nota-se)
        const q = targets[rng.int(Math.max(0, targets.length - 3), targets.length - 1)];
        p.chain = q;
        usedAsTarget.add(q);
      }
    }
  }
  if (obstacles.wait && (force.wait || rng.chance(0.4))) {
    const p = pickPiece((q, s) => s.cleared.some((c) => c !== q.c));
    if (p) p.wait = rng.pick(steps[stepOf.get(p.id)!].cleared.filter((c) => c !== p.c));
  }
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
    if (obstacles.boxes && (id === 81 || rng.chance(0.55))) base.boxes = placeBoxes(base, rng, total);
    if (!base.boxes?.length) delete base.boxes;
    // A dificuldade sobe um pouco com tentativas falhadas.
    const holdProb = Math.min(0.75, HOLD[target] + (target === 'normal' ? 0 : a * 0.015));
    const holdFree = target === 'normal' ? 3 : 2;
    const built = construct(base, rng, obstacles, { holdProb, holdFree, twinProb: 0.12, tubeProb: 0.1, avgPiece });
    if (!built) continue;
    const level: LevelData = { ...base, columns: built.columns, solution: built.solution };
    if (obstacles.locks && (id === 101 || id === 141 || rng.chance(0.45))) {
      let lock = chooseLock(level, rng);
      if (lock && obstacles.keyCell && (id === 141 || rng.chance(0.5))) lock = toCellLock(level, lock, rng) ?? lock;
      if (lock) level.locks = [lock];
    }
    if (obstacles.ice) addGates(level, rng, obstacles, { ice: id === 121, chains: id === 161, wait: id === 181 });
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
