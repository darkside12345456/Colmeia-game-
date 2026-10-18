// Gera e valida os níveis do jogo em levels/level_NNNN.json.
//   npm run levels                 -> todos (1-300), em paralelo
//   npm run levels -- --range 1-20 -> só alguns
// Níveis 1-20: feitos à mão (tools/handmade.ts). 21+: gerados a partir dos PNG em assets/levels/art.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { PNG } from 'pngjs';
import { classify, generateLevel } from '../src/core/generator';
import { countBlocks, validateLevel } from '../src/core/level';
import { hashInts, Rng } from '../src/core/rng';
import { quantize } from '../src/core/quantize';
import { lossRate, playGreedy, replay, solve } from '../src/core/solver';
import type { Difficulty, LevelData, PieceDef } from '../src/core/types';
import { colorChar } from '../src/core/types';
import { HANDMADE } from './handmade';
import { MOTIFS } from './art/motifs';
import { ART_SIZES } from './make-art';

export const LEVEL_COUNT = 300;
const OUT = 'levels';

export function levelFile(id: number): string {
  return `${OUT}/level_${String(id).padStart(4, '0')}.json`;
}

/** Etiqueta pretendida: ~1 difícil a cada 5 níveis e 1 muito difícil a cada 10, com respiro depois. */
export function targetDifficulty(id: number): Difficulty {
  const pos = id % 10; // 1..9, 0
  const decade = Math.floor((id - 1) / 10);
  const hardPos = 4 + (hashInts(decade, 11) % 3); // 4, 5 ou 6
  if (pos === 0) return 'veryHard';
  if (pos === hardPos) return 'hard';
  return 'normal';
}

/** Tamanho da arte por nível (cresce de 16x16 até 40x44). */
export function sizeFor(id: number, target: Difficulty): [number, number] {
  const t = Math.min(1, (id - 21) / (LEVEL_COUNT - 21));
  let k = Math.round(t * (ART_SIZES.length - 1) + (hashInts(id, 3) % 100) / 100 - 0.5);
  if (target !== 'normal') k += 1; // níveis difíceis são um pouco maiores
  k = Math.max(0, Math.min(ART_SIZES.length - 1, k));
  return ART_SIZES[k];
}

export function maxColorsFor(id: number): number {
  if (id <= 60) return 6;
  if (id <= 150) return 7 + (id % 2);
  return 9;
}

function artFor(id: number): { key: string; mirror: boolean } {
  const cycle = Math.floor((id - 21) / MOTIFS.length);
  const order = new Rng(hashInts(cycle, 99)).shuffle(MOTIFS.map((m) => m.key));
  return { key: order[(id - 21) % MOTIFS.length], mirror: cycle % 2 === 1 };
}

function buildGenerated(id: number): LevelData {
  const target = targetDifficulty(id);
  const [w0, h0] = sizeFor(id, target);
  const { key, mirror } = artFor(id);
  let fallback: LevelData | null = null;
  // Se não atingir a dificuldade pedida, tenta com o tamanho seguinte (quadro maior).
  const sizeIdx = ART_SIZES.findIndex(([w, h]) => w === w0 && h === h0);
  for (const [w, h] of [ART_SIZES[sizeIdx], ART_SIZES[Math.min(ART_SIZES.length - 1, sizeIdx + 1)]]) {
    const png = PNG.sync.read(readFileSync(`assets/levels/art/${key}_${w}x${h}.png`));
    const q = quantize(png.width, png.height, png.data, { maxColors: maxColorsFor(id) });
    const grid = mirror ? q.grid.map((r) => r.split('').reverse().join('')) : q.grid;
    const out = generateLevel({ id, seed: hashInts(id, 2026, w), target, art: { key, w, h, colors: q.colors, grid } });
    if (out.hitTarget) return out.level;
    fallback ??= out.level;
  }
  return fallback!;
}

/** Converte um nível feito à mão no formato do jogo. */
export function buildHandmade(id: number): LevelData {
  const hm = HANDMADE[id - 1];
  const letters = Object.keys(hm.colors);
  const grid = hm.art.map((row) =>
    row
      .split('')
      .map((ch) => (ch === '.' ? '.' : colorChar(letters.indexOf(ch))))
      .join(''),
  );
  const base: LevelData = {
    id,
    seed: hashInts(id, 2026),
    difficulty: hm.difficulty,
    art: hm.name,
    w: 16,
    h: 16,
    colors: letters.map((l) => hm.colors[l]),
    grid,
    columns: [],
  };
  const counts = countBlocks(base);
  const tokens = hm.plan.map((col) => col.split(/\s+/).filter(Boolean));
  const occurrences = letters.map((l) => tokens.flat().filter((t) => t[0] === l).length);
  const given = letters.map(() => 0);
  let nextId = 1;
  const twins = new Map<string, PieceDef>();
  base.columns = tokens.map((col) =>
    col.map((tok) => {
      const c = letters.indexOf(tok[0]);
      if (c < 0) throw new Error(`Nível ${id}: letra ${tok[0]} sem cor`);
      const k = given[c]++;
      const n = Math.floor(counts[c] / occurrences[c]) + (k < counts[c] % occurrences[c] ? 1 : 0);
      const piece: PieceDef = { id: nextId++, c, n };
      const tw = tok.split('~')[1];
      if (tw) {
        const other = twins.get(tw);
        if (other) {
          other.twin = piece.id;
          piece.twin = other.id;
        } else twins.set(tw, piece);
      }
      return piece;
    }),
  );
  return base;
}

function finishHandmade(level: LevelData): { level: LevelData; warn?: string } {
  const big = level.columns.flat().filter((p) => p.n < 5 || p.n > 50);
  if (big.length) throw new Error(`Nível ${level.id}: peças fora de 5-50: ${big.map((p) => p.n).join(',')}`);
  const sol = solve(level, 5, 200000);
  if (sol.status !== 'solved') throw new Error(`Nível ${level.id} (à mão) não é resolúvel: ${sol.status}`);
  level.solution = sol.taps;
  const greedyWins = playGreedy(level).won;
  const loss = lossRate(level, 48, hashInts(level.id, 5));
  const blocks = countBlocks(level).reduce((a, b) => a + b, 0);
  level.stats = { greedyWins, lossRate: Math.round(loss * 1000) / 1000, blocks, pieces: level.columns.flat().length };
  const measured = classify(greedyWins, loss);
  const warn = measured !== level.difficulty ? `etiqueta ${level.difficulty} mas medido ${measured} (gulosa=${greedyWins}, derrota=${loss.toFixed(2)})` : undefined;
  return { level, warn };
}

function writeLevel(level: LevelData): void {
  const errors = validateLevel(level);
  if (errors.length) throw new Error(errors.join('\n'));
  if (!level.solution || !replay(level, level.solution)) throw new Error(`Nível ${level.id}: solução inválida`);
  writeFileSync(levelFile(level.id), JSON.stringify(level) + '\n');
}

function runRange(a: number, b: number): void {
  mkdirSync(OUT, { recursive: true });
  for (let id = a; id <= b; id++) {
    const t = Date.now();
    if (id <= HANDMADE.length) {
      const { level, warn } = finishHandmade(buildHandmade(id));
      writeLevel(level);
      console.log(`nível ${id} (à mão) ${level.difficulty} ${JSON.stringify(level.stats)}${warn ? ' AVISO: ' + warn : ''}`);
    } else {
      const level = buildGenerated(id);
      writeLevel(level);
      const tgt = targetDifficulty(id);
      console.log(
        `nível ${id} ${level.art} ${level.w}x${level.h} alvo=${tgt} final=${level.difficulty}${tgt !== level.difficulty ? ' (RE-ETIQUETADO)' : ''} ${JSON.stringify(level.stats)} ${Date.now() - t}ms`,
      );
    }
  }
}

function main(): void {
  const ri = process.argv.indexOf('--range');
  let [a, b] = [1, LEVEL_COUNT];
  if (ri > 0) [a, b] = process.argv[ri + 1].split('-').map(Number);
  if (process.argv.includes('--worker')) {
    runRange(a, b);
    return;
  }
  // Em paralelo: reparte os níveis por vários processos.
  const n = Math.max(1, Math.min(cpus().length, 8));
  let pending = 0;
  let failed = false;
  const queue = Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const startNext = (): void => {
    const id = queue.shift();
    if (id === undefined) return;
    pending++;
    const child = spawn(process.execPath, ['--import', 'tsx', 'tools/generate-levels.ts', '--worker', '--range', `${id}-${id}`], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    child.on('exit', (code) => {
      pending--;
      if (code !== 0) failed = true;
      if (queue.length) startNext();
      else if (pending === 0) {
        if (failed) {
          console.error('ERRO: alguns níveis falharam');
          process.exit(1);
        }
        console.log('Todos os níveis gerados e validados.');
      }
    });
  };
  for (let k = 0; k < n; k++) startNext();
}

if (process.argv[1]?.includes('generate-levels')) main();
