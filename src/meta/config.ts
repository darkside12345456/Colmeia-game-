// Valores de jogo configuráveis (remote config). Estes são os valores embutidos por defeito;
// o RemoteConfig pode substituí-los por um JSON público sem atualizar a app.
export type BoosterId = 'slot' | 'shuffle' | 'tweezers' | 'magnet';
export const BOOSTERS: BoosterId[] = ['slot', 'shuffle', 'tweezers', 'magnet'];

export const DEFAULT_CONFIG = {
  rewards: { normal: 20, hard: 40, veryHard: 60 },
  lives: { max: 5, regenMinutes: 30 },
  boosters: {
    prices: { slot: 250, shuffle: 150, tweezers: 200, magnet: 300 } as Record<BoosterId, number>,
    unlockLevel: { slot: 5, shuffle: 9, tweezers: 14, magnet: 20 } as Record<BoosterId, number>,
    freeOnUnlock: 3,
    videosPerDay: 3,
  },
  ads: {
    interstitialFromLevel: 15,
    interstitialEveryLevels: 3,
    interstitialMinGapSec: 90,
    bannerEnabled: true,
  },
  continueCost: 900,
  /** Acelerar 2x: minutos de jogo a 2x por cada ativação */
  speedBoost: { minutes: 5, shortAdsNeeded: 2, maxPerDay: 10, maxStackMinutes: 30 },
  starterPackLevel: 10,
  eventUnlock: { daily: 2, treasure: 4, pass: 8, race: 12, sunflower: 16, hive: 22 },
  events: { daily: true, treasure: true, pass: true, race: true, sunflower: true, hive: true },
  coinPacks: { coins_s: 1000, coins_m: 6000, coins_l: 14000, coins_xl: 32000 } as Record<string, number>,
};

export type GameConfig = typeof DEFAULT_CONFIG;

let current: GameConfig = structuredClone(DEFAULT_CONFIG);

export function config(): GameConfig {
  return current;
}

/**
 * Junta valores remotos aos embutidos, aceitando só chaves conhecidas e com o mesmo tipo
 * (um JSON remoto errado nunca parte o jogo).
 */
export function applyRemoteConfig(remote: unknown): GameConfig {
  current = mergeKnown(structuredClone(DEFAULT_CONFIG), remote) as GameConfig;
  return current;
}

function mergeKnown(base: unknown, over: unknown): unknown {
  if (typeof base !== 'object' || base === null || typeof over !== 'object' || over === null || Array.isArray(over)) return base;
  const out = base as Record<string, unknown>;
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    if (!(k in out)) continue;
    const b = out[k];
    if (typeof b === 'object' && b !== null) out[k] = mergeKnown(b, v);
    else if (typeof v === typeof b && (typeof v !== 'number' || (Number.isFinite(v) && v >= 0))) out[k] = v;
  }
  return out;
}
