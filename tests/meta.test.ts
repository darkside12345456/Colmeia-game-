import { describe, expect, it } from 'vitest';
import { applyRemoteConfig, config, DEFAULT_CONFIG } from '../src/meta/config';
import {
  boosterVideosLeft,
  canPlay,
  consumeSpeed,
  DAY,
  grantBoosterFromVideo,
  HOUR,
  introduceBoosters,
  livesInfo,
  loseLife,
  MINUTE,
  recordLongSpeedAd,
  recordShortSpeedAd,
  recordWin,
  shouldShowInterstitial,
  toggleSpeed,
} from '../src/meta/economy';
import {
  claimDaily,
  claimPass,
  claimTreasureStep,
  closeRace,
  completeHiveStage,
  currentTreasureStep,
  dailyAvailable,
  DAILY_REWARDS,
  EVENT_EPOCH,
  eventsOnLevelEnd,
  hiveStageComplete,
  passTier,
  raceOnLevelEnd,
  raceState,
  startRace,
  sunflowerClaimable,
  syncPass,
  TREASURE_STEPS,
  trackHive,
} from '../src/meta/events';
import { deliverPurchase } from '../src/meta/products';
import { defaultSave, migrate } from '../src/meta/state';

const T0 = EVENT_EPOCH + 10 * DAY + 10 * HOUR;

describe('vidas', () => {
  it('perder tira 1 vida e recupera 1 a cada 30 min, até 5', () => {
    const s = defaultSave(T0);
    loseLife(s, T0);
    loseLife(s, T0);
    expect(livesInfo(s, T0).lives).toBe(3);
    expect(livesInfo(s, T0).nextIn).toBe(30 * MINUTE);
    expect(livesInfo(s, T0 + 31 * MINUTE).lives).toBe(4);
    expect(livesInfo(s, T0 + 10 * HOUR).lives).toBe(5);
    expect(livesInfo(s, T0 + 10 * HOUR).full).toBe(true);
  });

  it('relógio para trás não dá vidas', () => {
    const s = defaultSave(T0);
    for (let i = 0; i < 5; i++) loseLife(s, T0);
    expect(canPlay(s, T0)).toBe(false);
    expect(livesInfo(s, T0 - 5 * HOUR).lives).toBe(0);
    expect(livesInfo(s, T0 + 20 * MINUTE).lives).toBe(0);
  });

  it('vidas infinitas não gastam vidas', () => {
    const s = defaultSave(T0);
    s.infiniteLivesUntil = T0 + HOUR;
    loseLife(s, T0);
    expect(s.lives).toBe(5);
  });
});

describe('reforços', () => {
  it('desbloqueiam nos níveis 5, 9, 14, 20 com 3 grátis', () => {
    const s = defaultSave(T0);
    s.level = 9;
    expect(introduceBoosters(s)).toEqual(['slot', 'shuffle']);
    expect(s.boosters.slot).toBe(3);
    expect(introduceBoosters(s)).toEqual([]);
  });

  it('máximo 3 vídeos por reforço por dia', () => {
    const s = defaultSave(T0);
    for (let i = 0; i < 3; i++) expect(grantBoosterFromVideo(s, 'magnet', T0)).toBe(true);
    expect(grantBoosterFromVideo(s, 'magnet', T0)).toBe(false);
    expect(boosterVideosLeft(s, 'magnet', T0 + DAY)).toBe(3);
  });
});

describe('acelerar 2x (anúncios)', () => {
  it('2 anúncios curtos dão 5 minutos de 2x', () => {
    const s = defaultSave(T0);
    expect(recordShortSpeedAd(s, T0)).toBe(false);
    expect(s.speed.msLeft).toBe(0);
    expect(recordShortSpeedAd(s, T0)).toBe(true);
    expect(s.speed.msLeft).toBe(5 * MINUTE);
    expect(s.speed.on).toBe(true);
  });

  it('1 anúncio longo dá logo 5 minutos', () => {
    const s = defaultSave(T0);
    expect(recordLongSpeedAd(s, T0)).toBe(true);
    expect(s.speed.msLeft).toBe(5 * MINUTE);
  });

  it('o tempo só gasta enquanto está ligado e acaba sozinho', () => {
    const s = defaultSave(T0);
    recordLongSpeedAd(s, T0);
    toggleSpeed(s);
    expect(consumeSpeed(s, MINUTE)).toBe(false);
    expect(s.speed.msLeft).toBe(5 * MINUTE);
    toggleSpeed(s);
    consumeSpeed(s, 4 * MINUTE);
    expect(s.speed.msLeft).toBe(MINUTE);
    consumeSpeed(s, 2 * MINUTE);
    expect(s.speed.msLeft).toBe(0);
    expect(s.speed.on).toBe(false);
  });

  it('acumula até ao máximo e respeita o limite diário', () => {
    const s = defaultSave(T0);
    for (let i = 0; i < 20; i++) recordLongSpeedAd(s, T0);
    expect(s.speed.msLeft).toBe(config().speedBoost.maxStackMinutes * MINUTE);
    expect(s.speed.activationsToday).toBeLessThanOrEqual(config().speedBoost.maxPerDay);
  });
});

describe('intersticiais', () => {
  it('nunca antes do nível 15, nem depois de derrota, nem com "Sem anúncios"', () => {
    const s = defaultSave(T0);
    s.level = 20;
    s.ads.levelsSinceInterstitial = 3;
    s.ads.lastResult = 'win';
    expect(shouldShowInterstitial(s, T0, false)).toBe(true);
    expect(shouldShowInterstitial(s, T0, true)).toBe(false);
    s.ads.lastResult = 'lose';
    expect(shouldShowInterstitial(s, T0, false)).toBe(false);
    s.ads.lastResult = 'win';
    s.ads.lastInterstitialAt = T0 - 30_000;
    expect(shouldShowInterstitial(s, T0, false)).toBe(false);
    s.level = 14;
    s.ads.lastInterstitialAt = 0;
    expect(shouldShowInterstitial(s, T0, false)).toBe(false);
  });
});

describe('eventos', () => {
  it('recompensa diária: 1 por dia, vídeo duplica, ciclo de 7', () => {
    const s = defaultSave(T0);
    const c0 = s.coins;
    claimDaily(s, T0, 2);
    expect(s.coins).toBe(c0 + 100);
    expect(dailyAvailable(s, T0)).toBe(false);
    for (let d = 1; d < 8; d++) claimDaily(s, T0 + d * DAY);
    expect(s.daily.index).toBe(8 % DAILY_REWARDS.length);
  });

  it('passe: bilhetes dão patamares; premium só com compra', () => {
    const s = defaultSave(T0);
    s.level = 30;
    syncPass(s, T0);
    eventsOnLevelEnd(s, true, true, 'veryHard', 100, T0);
    expect(passTier(s)).toBe(1);
    expect(claimPass(s, 0, false, T0)).not.toBeNull();
    expect(claimPass(s, 0, true, T0)).toBeNull();
    deliverPurchase(s, 'pass_season', 'tx-1', T0);
    expect(claimPass(s, 0, true, T0)).not.toBeNull();
  });

  it('tesouro: ritmo grátis/vídeo e depois pago; o pago só avança com compra', () => {
    const kinds = TREASURE_STEPS.map((x) => x.kind);
    // nunca dois pagos seguidos e no máximo 3 grátis seguidos
    for (let i = 1; i < kinds.length; i++) expect(kinds[i] === 'paid' && kinds[i - 1] === 'paid').toBe(false);
    const s = defaultSave(T0);
    claimTreasureStep(s, T0);
    claimTreasureStep(s, T0);
    expect(currentTreasureStep(s, T0)?.kind).toBe('paid');
    deliverPurchase(s, 'treasure_1', 'tx-a', T0);
    expect(s.treasure.step).toBe(3);
    expect(deliverPurchase(s, 'treasure_1', 'tx-a', T0)).toBe(false); // a mesma transação não entrega 2x
    expect(currentTreasureStep(s, T0 + 3 * DAY)?.kind).toBe('free'); // recomeça ao fim de 2 dias
  });

  it('corrida: falhar volta ao início; 5 seguidas à primeira ganha', () => {
    const s = defaultSave(T0);
    startRace(s, T0);
    // os rivais não podem ganhar neste teste
    for (let i = 0; i < 4; i++) {
      s.race.rivals.forEach((r) => (r.progress = 0));
      raceOnLevelEnd(s, true, true, T0);
    }
    s.race.rivals.forEach((r) => (r.progress = 0));
    raceOnLevelEnd(s, false, true, T0);
    expect(s.race.player).toBe(0);
    for (let i = 0; i < 5; i++) {
      s.race.rivals.forEach((r) => (r.progress = 0));
      raceOnLevelEnd(s, true, true, T0);
    }
    expect(raceState(s, T0)).toBe('won');
    expect(closeRace(s, T0)).not.toBeNull();
    expect(raceState(s, T0)).toBe('idle');
  });

  it('girassol: marcos dão presentes', () => {
    const s = defaultSave(T0);
    s.level = 30;
    for (let i = 0; i < 11; i++) eventsOnLevelEnd(s, true, true, 'normal', 10, T0);
    expect(sunflowerClaimable(s, T0)).toEqual([0, 1]);
  });

  it('construir a colmeia: tarefas dão materiais e a etapa decora a colmeia', () => {
    const s = defaultSave(T0);
    s.level = 30;
    trackHive(s, 'win', 3);
    trackHive(s, 'booster', 1);
    trackHive(s, 'daily', 1);
    expect(hiveStageComplete(s)).toBe(true);
    expect(completeHiveStage(s, T0)).not.toBeNull();
    expect(s.hive.stage).toBe(1);
    expect(s.hive.materials.cera).toBe(1);
  });
});

describe('save e configuração', () => {
  it('save antigo/incompleto é completado sem partir', () => {
    const s = migrate({ coins: 999, settings: { sound: false }, seen: { a: true }, junk: 1 }, T0);
    expect(s.coins).toBe(999);
    expect(s.settings.sound).toBe(false);
    expect(s.settings.music).toBe(true);
    expect(s.seen.a).toBe(true);
    expect(s.lives).toBe(5);
    expect(migrate('lixo', T0).level).toBe(1);
    expect(migrate({ coins: 'muitas' }, T0).coins).toBe(200);
  });

  it('remote config só aceita chaves conhecidas com o tipo certo', () => {
    applyRemoteConfig({ continueCost: 500, rewards: { normal: 'x' }, hack: 1, ads: { interstitialFromLevel: -3 } });
    expect(config().continueCost).toBe(500);
    expect(config().rewards.normal).toBe(DEFAULT_CONFIG.rewards.normal);
    expect(config().ads.interstitialFromLevel).toBe(DEFAULT_CONFIG.ads.interstitialFromLevel);
    applyRemoteConfig({});
  });

  it('vitória dá moedas conforme a dificuldade e avança o nível', () => {
    const s = defaultSave(T0);
    expect(recordWin(s, 'hard', 100)).toBe(40);
    expect(s.level).toBe(2);
  });
});
