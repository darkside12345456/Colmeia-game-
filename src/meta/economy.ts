// Economia: moedas, vidas, reforços, prémios, acelerar 2x e regras dos intersticiais.
// Funções puras sobre o SaveData (o "agora" vem sempre do TimeService, de confiança).
import type { Difficulty } from '../core/types';
import { BOOSTERS, config, type BoosterId } from './config';
import type { SaveData } from './state';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** Dia local "AAAA-MM-DD". */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ------------------------------------------------------------------ moedas

export function addCoins(s: SaveData, n: number): void {
  s.coins = Math.max(0, Math.floor(s.coins + n));
}

export function spendCoins(s: SaveData, n: number): boolean {
  if (s.coins < n) return false;
  s.coins -= n;
  return true;
}

export function winReward(d: Difficulty): number {
  return config().rewards[d];
}

// ------------------------------------------------------------------ vidas

export function regenMs(): number {
  return config().lives.regenMinutes * MINUTE;
}

/** Recupera as vidas que entretanto regeneraram. */
export function syncLives(s: SaveData, now: number): void {
  const max = config().lives.max;
  if (s.lives >= max) {
    s.lives = Math.min(s.lives, max);
    s.livesAt = now;
    return;
  }
  if (now < s.livesAt) {
    // relógio para trás: não dá vidas (e não mexe na contagem, para não ganhar tempo ao voltar)
    return;
  }
  const gained = Math.floor((now - s.livesAt) / regenMs());
  if (gained > 0) {
    s.lives = Math.min(max, s.lives + gained);
    s.livesAt = s.lives >= max ? now : s.livesAt + gained * regenMs();
  }
}

export interface LivesInfo {
  lives: number;
  full: boolean;
  /** ms até à próxima vida (0 se cheias) */
  nextIn: number;
  /** ms de vidas infinitas restantes */
  infinite: number;
}

export function livesInfo(s: SaveData, now: number): LivesInfo {
  syncLives(s, now);
  const max = config().lives.max;
  const full = s.lives >= max;
  return {
    lives: s.lives,
    full,
    nextIn: full ? 0 : Math.min(regenMs(), Math.max(0, s.livesAt + regenMs() - now)),
    infinite: Math.max(0, s.infiniteLivesUntil - now),
  };
}

export function canPlay(s: SaveData, now: number): boolean {
  const info = livesInfo(s, now);
  return info.infinite > 0 || info.lives > 0;
}

export function loseLife(s: SaveData, now: number): void {
  syncLives(s, now);
  if (s.infiniteLivesUntil > now) return;
  if (s.lives >= config().lives.max) s.livesAt = now;
  s.lives = Math.max(0, s.lives - 1);
}

export function addLives(s: SaveData, n: number, now: number): void {
  syncLives(s, now);
  s.lives = Math.min(config().lives.max, s.lives + n);
  if (s.lives >= config().lives.max) s.livesAt = now;
}

export function addInfiniteLives(s: SaveData, ms: number, now: number): void {
  s.infiniteLivesUntil = Math.max(s.infiniteLivesUntil, now) + ms;
}

// ------------------------------------------------------------------ prémios

export interface Reward {
  coins?: number;
  boosters?: Partial<Record<BoosterId, number>>;
  /** minutos de vidas infinitas */
  infiniteMin?: number;
  /** minutos de jogo a 2x */
  speedMin?: number;
  lives?: number;
}

export function applyReward(s: SaveData, r: Reward, now: number, times = 1): void {
  if (r.coins) addCoins(s, r.coins * times);
  for (const [id, n] of Object.entries(r.boosters ?? {})) s.boosters[id as BoosterId] += (n ?? 0) * times;
  if (r.infiniteMin) addInfiniteLives(s, r.infiniteMin * MINUTE * times, now);
  if (r.speedMin) addSpeedTime(s, r.speedMin * MINUTE * times);
  if (r.lives) addLives(s, r.lives * times, now);
}

// ------------------------------------------------------------------ reforços

export function isBoosterUnlocked(s: SaveData, id: BoosterId): boolean {
  return s.level >= config().boosters.unlockLevel[id];
}

/** Reforços que desbloqueiam agora (dá as unidades grátis e marca como apresentados). */
export function introduceBoosters(s: SaveData): BoosterId[] {
  const out: BoosterId[] = [];
  for (const id of BOOSTERS) {
    if (isBoosterUnlocked(s, id) && !s.boostersIntroduced[id]) {
      s.boostersIntroduced[id] = true;
      s.boosters[id] += config().boosters.freeOnUnlock;
      out.push(id);
    }
  }
  return out;
}

export function useBooster(s: SaveData, id: BoosterId): boolean {
  if (s.boosters[id] <= 0) return false;
  s.boosters[id]--;
  s.stats.boostersUsed++;
  return true;
}

export function buyBooster(s: SaveData, id: BoosterId): boolean {
  if (!spendCoins(s, config().boosters.prices[id])) return false;
  s.boosters[id]++;
  return true;
}

function refreshBoosterVideos(s: SaveData, now: number): void {
  const day = dayKey(now);
  if (s.boosterVideos.day !== day) s.boosterVideos = { day, count: { slot: 0, shuffle: 0, tweezers: 0, magnet: 0 } };
}

export function boosterVideosLeft(s: SaveData, id: BoosterId, now: number): number {
  refreshBoosterVideos(s, now);
  return Math.max(0, config().boosters.videosPerDay - s.boosterVideos.count[id]);
}

/** Chamar só DEPOIS do evento "recompensa ganha" do anúncio. */
export function grantBoosterFromVideo(s: SaveData, id: BoosterId, now: number): boolean {
  if (boosterVideosLeft(s, id, now) <= 0) return false;
  s.boosterVideos.count[id]++;
  s.boosters[id]++;
  return true;
}

// ------------------------------------------------------------------ acelerar 2x

function refreshSpeedDay(s: SaveData, now: number): void {
  const day = dayKey(now);
  if (s.speed.day !== day) {
    s.speed.day = day;
    s.speed.shortAdsWatched = 0;
    s.speed.activationsToday = 0;
  }
}

export function maxSpeedMs(): number {
  return config().speedBoost.maxStackMinutes * MINUTE;
}

/** Acrescenta tempo de jogo a 2x (até ao máximo acumulável) e liga a velocidade. */
export function addSpeedTime(s: SaveData, ms: number): void {
  s.speed.msLeft = Math.min(maxSpeedMs(), s.speed.msLeft + ms);
  if (s.speed.msLeft > 0) s.speed.on = true;
}

export function speedActivationsLeft(s: SaveData, now: number): number {
  refreshSpeedDay(s, now);
  return Math.max(0, config().speedBoost.maxPerDay - s.speed.activationsToday);
}

export function canAddSpeed(s: SaveData, now: number): boolean {
  return speedActivationsLeft(s, now) > 0 && s.speed.msLeft < maxSpeedMs();
}

export function shortAdsProgress(s: SaveData, now: number): { watched: number; needed: number } {
  refreshSpeedDay(s, now);
  return { watched: s.speed.shortAdsWatched, needed: config().speedBoost.shortAdsNeeded };
}

function activateSpeed(s: SaveData, now: number): void {
  refreshSpeedDay(s, now);
  s.speed.activationsToday++;
  addSpeedTime(s, config().speedBoost.minutes * MINUTE);
}

/**
 * Regista um anúncio curto visto até ao fim (só depois do evento "recompensa ganha").
 * Devolve true se completou os anúncios necessários e ativou o 2x.
 */
export function recordShortSpeedAd(s: SaveData, now: number): boolean {
  if (!canAddSpeed(s, now)) return false;
  s.speed.shortAdsWatched++;
  if (s.speed.shortAdsWatched >= config().speedBoost.shortAdsNeeded) {
    s.speed.shortAdsWatched = 0;
    activateSpeed(s, now);
    return true;
  }
  return false;
}

/** Um anúncio longo visto até ao fim ativa logo o 2x. */
export function recordLongSpeedAd(s: SaveData, now: number): boolean {
  if (!canAddSpeed(s, now)) return false;
  activateSpeed(s, now);
  return true;
}

/** Gasta tempo de 2x (só conta enquanto se está a jogar com o 2x ligado). */
export function consumeSpeed(s: SaveData, dtMs: number): boolean {
  if (!s.speed.on || s.speed.msLeft <= 0) {
    s.speed.on = false;
    return false;
  }
  s.speed.msLeft = Math.max(0, s.speed.msLeft - dtMs);
  if (s.speed.msLeft === 0) s.speed.on = false;
  return true;
}

export function toggleSpeed(s: SaveData): boolean {
  if (s.speed.msLeft <= 0) return false;
  s.speed.on = !s.speed.on;
  return s.speed.on;
}

// ------------------------------------------------------------------ intersticiais

/** Regra 4.2: nível >= 15, 1 a cada 3 níveis, 90 s de intervalo, nunca depois de derrota. */
export function shouldShowInterstitial(s: SaveData, now: number, noAds: boolean): boolean {
  const c = config().ads;
  if (noAds) return false;
  if (s.level < c.interstitialFromLevel) return false;
  if (s.ads.lastResult !== 'win') return false;
  if (s.ads.levelsSinceInterstitial < c.interstitialEveryLevels) return false;
  if (now - s.ads.lastInterstitialAt < c.interstitialMinGapSec * 1000) return false;
  return true;
}

export function recordInterstitialShown(s: SaveData, now: number): void {
  s.ads.levelsSinceInterstitial = 0;
  s.ads.lastInterstitialAt = now;
}

// ------------------------------------------------------------------ fim de nível

export function recordWin(s: SaveData, d: Difficulty, blocks: number): number {
  const coins = winReward(d);
  addCoins(s, coins);
  s.stats.wins++;
  s.stats.blocks += blocks;
  s.stats.attemptsOnLevel = 0;
  s.ads.levelsSinceInterstitial++;
  s.ads.lastResult = 'win';
  s.lastDifficulty = d;
  s.level++;
  return coins;
}

export function recordLoss(s: SaveData, now: number, blocks: number): void {
  loseLife(s, now);
  s.stats.losses++;
  s.stats.blocks += blocks;
  s.stats.attemptsOnLevel++;
  s.ads.lastResult = 'lose';
}
