// Estado guardado do jogador (save). Tudo o que muda entre sessões vive aqui.
// Ao mudar a estrutura: sobe SAVE_VERSION e acrescenta uma migração em MIGRATIONS.
import type { Difficulty } from '../core/types';
import { type BoosterId } from './config';

export const SAVE_VERSION = 1;

export type Lang = 'pt-PT' | 'en';

export interface RaceRival {
  name: string;
  avatar: number;
  progress: number;
}

export interface SaveData {
  version: number;
  /** Próximo nível a jogar */
  level: number;
  coins: number;
  lives: number;
  /** Hora (de confiança) da última atualização das vidas */
  livesAt: number;
  infiniteLivesUntil: number;
  boosters: Record<BoosterId, number>;
  /** Reforços já apresentados (tutorial + 3 grátis dados) */
  boostersIntroduced: Record<BoosterId, boolean>;
  /** Vídeos vistos hoje por reforço */
  boosterVideos: { day: string; count: Record<BoosterId, number> };
  /** Acelerar 2x: tempo de jogo restante a 2x (ms) e se está ligado */
  speed: { msLeft: number; on: boolean; day: string; shortAdsWatched: number; activationsToday: number };
  settings: {
    sound: boolean;
    music: boolean;
    vibration: boolean;
    lang: Lang | null;
    reducedMotion: boolean | null;
  };
  /** Tutoriais/explicações já vistos */
  seen: Record<string, boolean>;
  stats: {
    wins: number;
    losses: number;
    blocks: number;
    boostersUsed: number;
    /** Tentativas falhadas no nível atual (para "à primeira tentativa") */
    attemptsOnLevel: number;
  };
  ads: { levelsSinceInterstitial: number; lastInterstitialAt: number; lastResult: 'win' | 'lose' | null };
  purchases: {
    processedTx: string[];
    starterPackSeen: boolean;
    starterPackBought: boolean;
    /** Cache do "Sem anúncios" (a verdade vem sempre do serviço de compras) */
    noAdsCache: boolean;
  };
  daily: { index: number; lastClaimDay: string };
  pass: { season: number; tickets: number; free: number[]; premium: number[]; premiumSeason: number };
  treasure: { cycle: number; step: number };
  race: {
    active: boolean;
    endsAt: number;
    player: number;
    rivals: RaceRival[];
    seed: number;
    result: 'won' | 'lost' | 'expired' | null;
    won: number;
  };
  sunflower: { cycle: number; steps: number; claimed: number[] };
  hive: { stage: number; progress: Record<string, number>; materials: Record<string, number>; done: string[] };
  /** Proteção do relógio: maior hora de confiança vista */
  lastSeen: number;
  lastDifficulty: Difficulty;
}

export function defaultSave(now: number): SaveData {
  return {
    version: SAVE_VERSION,
    level: 1,
    coins: 200,
    lives: 5,
    livesAt: now,
    infiniteLivesUntil: 0,
    boosters: { slot: 0, shuffle: 0, tweezers: 0, magnet: 0 },
    boostersIntroduced: { slot: false, shuffle: false, tweezers: false, magnet: false },
    boosterVideos: { day: '', count: { slot: 0, shuffle: 0, tweezers: 0, magnet: 0 } },
    speed: { msLeft: 0, on: false, day: '', shortAdsWatched: 0, activationsToday: 0 },
    settings: { sound: true, music: true, vibration: true, lang: null, reducedMotion: null },
    seen: {},
    stats: { wins: 0, losses: 0, blocks: 0, boostersUsed: 0, attemptsOnLevel: 0 },
    ads: { levelsSinceInterstitial: 0, lastInterstitialAt: 0, lastResult: null },
    purchases: { processedTx: [], starterPackSeen: false, starterPackBought: false, noAdsCache: false },
    daily: { index: 0, lastClaimDay: '' },
    pass: { season: -1, tickets: 0, free: [], premium: [], premiumSeason: -1 },
    treasure: { cycle: -1, step: 0 },
    race: { active: false, endsAt: 0, player: 0, rivals: [], seed: 1, result: null, won: 0 },
    sunflower: { cycle: -1, steps: 0, claimed: [] },
    hive: { stage: 0, progress: {}, materials: {}, done: [] },
    lastSeen: now,
    lastDifficulty: 'normal',
  };
}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[v] converte um save da versão v para a versão v+1. */
export const MIGRATIONS: Record<number, Migration> = {};

/**
 * Atualiza um save antigo e completa campos em falta com os valores por defeito
 * (um save de uma versão antiga ou incompleto nunca parte o jogo).
 */
export function migrate(raw: unknown, now: number): SaveData {
  if (typeof raw !== 'object' || raw === null) return defaultSave(now);
  let data = raw as Record<string, unknown>;
  let v = typeof data.version === 'number' ? data.version : 0;
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (m) data = m(data);
    v++;
  }
  const merged = fillDefaults(defaultSave(now), data) as SaveData;
  merged.version = SAVE_VERSION;
  return merged;
}

function fillDefaults(def: unknown, val: unknown): unknown {
  if (Array.isArray(def)) return Array.isArray(val) ? val : def;
  if (typeof def === 'object' && def !== null) {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) return def;
    const out: Record<string, unknown> = {};
    const d = def as Record<string, unknown>;
    const v = val as Record<string, unknown>;
    // Campos de "mapa" (chaves livres) mantêm as chaves do save
    const freeKeys = Object.keys(d).length === 0;
    for (const k of new Set([...Object.keys(d), ...(freeKeys ? Object.keys(v) : [])])) {
      out[k] = k in d ? fillDefaults(d[k], v[k]) : v[k];
    }
    return out;
  }
  if (def === null) return val === undefined ? null : val;
  return typeof val === typeof def && (typeof val !== 'number' || Number.isFinite(val)) ? val : def;
}
