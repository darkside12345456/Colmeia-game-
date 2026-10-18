// Atividades e eventos (secção 5). Lógica pura sobre o SaveData; "now" = hora de confiança.
import type { Difficulty } from '../core/types';
import { hashInts, Rng } from '../core/rng';
import { config } from './config';
import { applyReward, DAY, dayKey, HOUR, type Reward } from './economy';
import type { SaveData } from './state';

/** Segunda-feira, 5 de janeiro de 2026 (UTC): início dos ciclos dos eventos. */
export const EVENT_EPOCH = Date.UTC(2026, 0, 5);

export type EventId = 'daily' | 'treasure' | 'pass' | 'race' | 'sunflower' | 'hive';

export function eventUnlocked(s: SaveData, id: EventId): boolean {
  return config().events[id] && s.level >= config().eventUnlock[id];
}

function cycleOf(now: number, length: number): number {
  return Math.floor((now - EVENT_EPOCH) / length);
}
function cycleEnd(now: number, length: number): number {
  return EVENT_EPOCH + (cycleOf(now, length) + 1) * length;
}

// ------------------------------------------------------------ 1. Recompensas diárias

export const DAILY_REWARDS: Reward[] = [
  { coins: 50 },
  { coins: 100 },
  { coins: 150 },
  { boosters: { slot: 1, shuffle: 1, tweezers: 1, magnet: 1 } },
  { coins: 200 },
  { coins: 300 },
  { coins: 500, infiniteMin: 30 },
];

export function dailyAvailable(s: SaveData, now: number): boolean {
  return s.daily.lastClaimDay !== dayKey(now);
}

/** Reclama a recompensa de hoje (times=2 depois de ver um vídeo). */
export function claimDaily(s: SaveData, now: number, times = 1): Reward | null {
  if (!dailyAvailable(s, now)) return null;
  const r = DAILY_REWARDS[s.daily.index % DAILY_REWARDS.length];
  applyReward(s, r, now, times);
  s.daily.index = (s.daily.index + 1) % DAILY_REWARDS.length;
  s.daily.lastClaimDay = dayKey(now);
  trackHive(s, 'daily', 1);
  return r;
}

export function nextMidnight(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

// ------------------------------------------------------------ 2. Passe da Colmeia

export const PASS_SEASON_MS = 28 * DAY;
export const PASS_TIERS = 30;
export const TICKETS_PER_TIER = 3;

export function passSeason(now: number): number {
  return cycleOf(now, PASS_SEASON_MS);
}
export function passEnds(now: number): number {
  return cycleEnd(now, PASS_SEASON_MS);
}

export function passFreeReward(k: number): Reward {
  if (k % 5 === 4) return { boosters: { [(['slot', 'shuffle', 'tweezers', 'magnet'] as const)[(k / 5) % 4 | 0]]: 1 } };
  return { coins: 30 + 5 * k };
}

export function passPremiumReward(k: number): Reward {
  if (k === PASS_TIERS - 1) return { coins: 2000, boosters: { slot: 2, shuffle: 2, tweezers: 2, magnet: 2 }, infiniteMin: 60 };
  if (k % 5 === 4) return { boosters: { slot: 1, magnet: 1 }, infiniteMin: 30 };
  if (k % 3 === 2) return { speedMin: 10, coins: 100 };
  return { coins: 100 + 20 * k };
}

export function syncPass(s: SaveData, now: number): void {
  const season = passSeason(now);
  if (s.pass.season !== season) {
    s.pass.season = season;
    s.pass.tickets = 0;
    s.pass.free = [];
    s.pass.premium = [];
  }
}

export function isPassPremium(s: SaveData, now: number): boolean {
  return s.pass.premiumSeason === passSeason(now);
}

export function ticketsFor(d: Difficulty): number {
  return d === 'veryHard' ? 3 : d === 'hard' ? 2 : 1;
}

export function passTier(s: SaveData): number {
  return Math.min(PASS_TIERS, Math.floor(s.pass.tickets / TICKETS_PER_TIER));
}

export function canClaimPass(s: SaveData, k: number, premium: boolean, now: number): boolean {
  syncPass(s, now);
  if (k >= passTier(s)) return false;
  if (premium) return isPassPremium(s, now) && !s.pass.premium.includes(k);
  return !s.pass.free.includes(k);
}

export function claimPass(s: SaveData, k: number, premium: boolean, now: number): Reward | null {
  if (!canClaimPass(s, k, premium, now)) return null;
  const r = premium ? passPremiumReward(k) : passFreeReward(k);
  applyReward(s, r, now);
  (premium ? s.pass.premium : s.pass.free).push(k);
  return r;
}

export function passClaimable(s: SaveData, now: number): boolean {
  syncPass(s, now);
  for (let k = 0; k < passTier(s); k++) {
    if (!s.pass.free.includes(k)) return true;
    if (isPassPremium(s, now) && !s.pass.premium.includes(k)) return true;
  }
  return false;
}

/** Chamado depois de uma compra do Passe validada pelo serviço de compras. */
export function grantPassPremium(s: SaveData, now: number): void {
  syncPass(s, now);
  s.pass.premiumSeason = passSeason(now);
}

// ------------------------------------------------------------ 3. Tesouro da Rainha

export const TREASURE_MS = 2 * DAY;

export interface TreasureStep {
  kind: 'free' | 'video' | 'paid';
  reward: Reward;
  product?: string;
}

/** Corrente de ofertas: 2-3 passos grátis/vídeo e depois 1 pago. */
export const TREASURE_STEPS: TreasureStep[] = [
  { kind: 'free', reward: { coins: 100 } },
  { kind: 'video', reward: { speedMin: 10 } },
  { kind: 'paid', reward: { coins: 1500, boosters: { slot: 2, shuffle: 2 } }, product: 'treasure_1' },
  { kind: 'free', reward: { boosters: { tweezers: 1 } } },
  { kind: 'video', reward: { infiniteMin: 15 } },
  { kind: 'free', reward: { coins: 150 } },
  { kind: 'paid', reward: { coins: 3000, boosters: { slot: 1, shuffle: 1, tweezers: 1, magnet: 1 }, infiniteMin: 30 }, product: 'treasure_2' },
  { kind: 'video', reward: { coins: 100 } },
  { kind: 'free', reward: { boosters: { magnet: 1 } } },
  { kind: 'video', reward: { speedMin: 10 } },
  { kind: 'paid', reward: { coins: 6000, boosters: { slot: 3, shuffle: 3, tweezers: 3, magnet: 3 }, infiniteMin: 60 }, product: 'treasure_3' },
  { kind: 'free', reward: { coins: 200, infiniteMin: 15 } },
];

export function syncTreasure(s: SaveData, now: number): void {
  const cycle = cycleOf(now, TREASURE_MS);
  if (s.treasure.cycle !== cycle) {
    s.treasure.cycle = cycle;
    s.treasure.step = 0;
  }
}

export function treasureEnds(now: number): number {
  return cycleEnd(now, TREASURE_MS);
}

export function currentTreasureStep(s: SaveData, now: number): TreasureStep | null {
  syncTreasure(s, now);
  return TREASURE_STEPS[s.treasure.step] ?? null;
}

/**
 * Reclama o passo atual. Para 'video' só depois do evento "recompensa ganha";
 * para 'paid' só depois da compra validada pelo serviço de compras.
 */
export function claimTreasureStep(s: SaveData, now: number): Reward | null {
  const step = currentTreasureStep(s, now);
  if (!step) return null;
  applyReward(s, step.reward, now);
  s.treasure.step++;
  return step.reward;
}

export function treasureClaimableFree(s: SaveData, now: number): boolean {
  return currentTreasureStep(s, now)?.kind === 'free';
}

// ------------------------------------------------------------ 4. Corrida das Flores

export const RACE_GOAL = 5;
export const RACE_MS = 24 * HOUR;
/** Nomes inventados para os rivais (controlados pelo jogo, não são jogadores reais). */
export const RIVAL_NAMES = ['Zuca', 'Pipoca', 'Bolota', 'Fifi', 'Tito', 'Nina', 'Gugu', 'Lulu', 'Becas', 'Kiko', 'Dina', 'Fofo'];
export const RACE_REWARD: Reward = { coins: 500, boosters: { slot: 2, shuffle: 2, tweezers: 2, magnet: 2 }, infiniteMin: 60 };

export function startRace(s: SaveData, now: number): void {
  const seed = hashInts(now & 0x7fffffff, s.race.won, s.level);
  const rng = new Rng(seed);
  const names = rng.shuffle(RIVAL_NAMES.slice()).slice(0, 4);
  s.race = {
    active: true,
    endsAt: now + RACE_MS,
    player: 0,
    rivals: names.map((name) => ({ name, avatar: rng.int(0, 3), progress: 0 })),
    seed,
    result: null,
    won: s.race.won,
  };
}

function finishRaceIfExpired(s: SaveData, now: number): void {
  if (s.race.active && s.race.result === null && now > s.race.endsAt) s.race.result = 'expired';
}

/** Atualiza a corrida no fim de cada nível. firstTry = ganhou à primeira tentativa. */
export function raceOnLevelEnd(s: SaveData, won: boolean, firstTry: boolean, now: number): void {
  finishRaceIfExpired(s, now);
  const r = s.race;
  if (!r.active || r.result !== null) return;
  if (!won) r.player = 0;
  else if (firstTry) r.player++;
  // Rivais: avançam ou falham ao acaso (com seed; cada rival tem o seu ritmo).
  r.seed = hashInts(r.seed, r.player, 17);
  const rng = new Rng(r.seed);
  r.rivals.forEach((rv, i) => {
    const speed = 0.3 + ((hashInts(r.seed, i) % 100) / 100) * 0.12 + i * 0.03;
    if (rng.chance(0.12)) rv.progress = 0;
    else if (rng.chance(speed)) rv.progress = Math.min(RACE_GOAL, rv.progress + 1);
  });
  if (r.player >= RACE_GOAL) r.result = 'won';
  else if (r.rivals.some((rv) => rv.progress >= RACE_GOAL)) r.result = 'lost';
}

export function raceState(s: SaveData, now: number): 'idle' | 'running' | 'won' | 'lost' | 'expired' {
  finishRaceIfExpired(s, now);
  if (!s.race.active) return 'idle';
  return s.race.result ?? 'running';
}

/** Fecha a corrida terminada (e dá o baú grande se ganhou). */
export function closeRace(s: SaveData, now: number): Reward | null {
  const st = raceState(s, now);
  if (st === 'idle' || st === 'running') return null;
  s.race.active = false;
  if (st === 'won') {
    s.race.won++;
    applyReward(s, RACE_REWARD, now);
    trackHive(s, 'race', 1);
    return RACE_REWARD;
  }
  return null;
}

// ------------------------------------------------------------ 5. Subida ao Girassol

export const SUNFLOWER_MS = 7 * DAY;
export const SUNFLOWER_MILESTONES = [5, 11, 17, 22, 28, 35, 42];
export const SUNFLOWER_REWARDS: Reward[] = [
  { coins: 100 },
  { boosters: { shuffle: 1, tweezers: 1 } },
  { coins: 250 },
  { infiniteMin: 30, boosters: { slot: 1 } },
  { coins: 400 },
  { boosters: { slot: 1, shuffle: 1, tweezers: 1, magnet: 1 } },
  { coins: 1000, infiniteMin: 60 },
];

export function syncSunflower(s: SaveData, now: number): void {
  const cycle = cycleOf(now, SUNFLOWER_MS);
  if (s.sunflower.cycle !== cycle) s.sunflower = { cycle, steps: 0, claimed: [] };
}
export function sunflowerEnds(now: number): number {
  return cycleEnd(now, SUNFLOWER_MS);
}
export function sunflowerOnWin(s: SaveData, now: number): void {
  if (!eventUnlocked(s, 'sunflower')) return;
  syncSunflower(s, now);
  s.sunflower.steps++;
}
export function sunflowerClaimable(s: SaveData, now: number): number[] {
  syncSunflower(s, now);
  return SUNFLOWER_MILESTONES.map((m, i) => (s.sunflower.steps >= m && !s.sunflower.claimed.includes(i) ? i : -1)).filter((i) => i >= 0);
}
export function claimSunflower(s: SaveData, i: number, now: number): Reward | null {
  if (!sunflowerClaimable(s, now).includes(i)) return null;
  s.sunflower.claimed.push(i);
  applyReward(s, SUNFLOWER_REWARDS[i], now);
  trackHive(s, 'sunflower', 1);
  return SUNFLOWER_REWARDS[i];
}

// ------------------------------------------------------------ 6. Construir a Colmeia

export type HiveTaskType = 'win' | 'winHard' | 'booster' | 'daily' | 'race' | 'blocks' | 'sunflower';
export type Material = 'cera' | 'petala' | 'galho' | 'folha';

export interface HiveTask {
  id: string;
  type: HiveTaskType;
  n: number;
  material: Material;
}
export interface HiveStage {
  id: string;
  tasks: HiveTask[];
  reward: Reward;
}

export const HIVE_STAGES: HiveStage[] = [
  {
    id: 'base',
    reward: { coins: 200 },
    tasks: [
      { id: 'base_win', type: 'win', n: 3, material: 'cera' },
      { id: 'base_booster', type: 'booster', n: 1, material: 'galho' },
      { id: 'base_daily', type: 'daily', n: 1, material: 'folha' },
    ],
  },
  {
    id: 'porta',
    reward: { coins: 300, boosters: { shuffle: 1 } },
    tasks: [
      { id: 'porta_win', type: 'win', n: 5, material: 'petala' },
      { id: 'porta_hard', type: 'winHard', n: 1, material: 'cera' },
      { id: 'porta_blocks', type: 'blocks', n: 3000, material: 'folha' },
    ],
  },
  {
    id: 'telhado',
    reward: { coins: 400, infiniteMin: 30 },
    tasks: [
      { id: 'telhado_race', type: 'race', n: 1, material: 'galho' },
      { id: 'telhado_booster', type: 'booster', n: 3, material: 'folha' },
      { id: 'telhado_win', type: 'win', n: 8, material: 'cera' },
    ],
  },
  {
    id: 'jardim',
    reward: { coins: 500, boosters: { magnet: 1, tweezers: 1 } },
    tasks: [
      { id: 'jardim_hard', type: 'winHard', n: 3, material: 'petala' },
      { id: 'jardim_sun', type: 'sunflower', n: 2, material: 'folha' },
      { id: 'jardim_daily', type: 'daily', n: 3, material: 'petala' },
    ],
  },
  {
    id: 'bandeira',
    reward: { coins: 1000, boosters: { slot: 2, shuffle: 2, tweezers: 2, magnet: 2 } },
    tasks: [
      { id: 'bandeira_race', type: 'race', n: 2, material: 'galho' },
      { id: 'bandeira_booster', type: 'booster', n: 5, material: 'folha' },
      { id: 'bandeira_win', type: 'win', n: 12, material: 'cera' },
    ],
  },
];

/** Regista progresso nas tarefas da etapa atual. */
export function trackHive(s: SaveData, type: HiveTaskType, amount: number): void {
  const stage = HIVE_STAGES[s.hive.stage];
  if (!stage || s.level < config().eventUnlock.hive) return;
  for (const t of stage.tasks) {
    if (t.type !== type || s.hive.done.includes(t.id)) continue;
    s.hive.progress[t.id] = Math.min(t.n, (s.hive.progress[t.id] ?? 0) + amount);
    if (s.hive.progress[t.id] >= t.n) {
      s.hive.done.push(t.id);
      s.hive.materials[t.material] = (s.hive.materials[t.material] ?? 0) + 1;
    }
  }
}

export function hiveStageComplete(s: SaveData): boolean {
  const stage = HIVE_STAGES[s.hive.stage];
  return !!stage && stage.tasks.every((t) => s.hive.done.includes(t.id));
}

/** Conclui a etapa (decora a colmeia no ecrã inicial) e dá o prémio. */
export function completeHiveStage(s: SaveData, now: number): Reward | null {
  if (!hiveStageComplete(s)) return null;
  const stage = HIVE_STAGES[s.hive.stage];
  applyReward(s, stage.reward, now);
  s.hive.stage++;
  return stage.reward;
}

// ------------------------------------------------------------ fim de nível (todos os eventos)

export function eventsOnLevelEnd(s: SaveData, won: boolean, firstTry: boolean, d: Difficulty, blocks: number, now: number): void {
  if (won) {
    if (eventUnlocked(s, 'pass')) {
      syncPass(s, now);
      s.pass.tickets += ticketsFor(d);
    }
    sunflowerOnWin(s, now);
    trackHive(s, 'win', 1);
    if (d !== 'normal') trackHive(s, 'winHard', 1);
  }
  trackHive(s, 'blocks', blocks);
  raceOnLevelEnd(s, won, firstTry, now);
}
