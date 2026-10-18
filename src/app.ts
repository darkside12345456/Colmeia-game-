// Ponto central da app: gravação, relógio de confiança, anúncios, compras, som, vibração.
// As cenas usam sempre este objeto (nunca os SDK diretamente).
import { App as CapApp } from '@capacitor/app';
import { detectLang, setLang } from './i18n';
import { syncLives } from './meta/economy';
import { grantPassPremium, passEnds, PASS_SEASON_MS } from './meta/events';
import { deliverPurchase, NO_ADS_ENTITLEMENT } from './meta/products';
import type { SaveData } from './meta/state';
import { createAdService, type AdService } from './services/ads';
import { analytics } from './services/analytics';
import { AudioService } from './services/audio';
import { HapticsService } from './services/haptics';
import { createIapService, type IapService, type PurchaseResult, type Transaction } from './services/iap';
import { env, isNative } from './services/platform';
import { loadRemoteConfig } from './services/remoteConfig';
import { SaveService } from './services/save';
import { TimeService } from './services/time';

type Listener = () => void;

class AppCore {
  readonly saveService = new SaveService();
  readonly time = new TimeService();
  readonly audio = new AudioService();
  readonly haptics = new HapticsService();
  ads!: AdService;
  iap!: IapService;
  private listeners = new Set<Listener>();
  /** Tem anúncios a interromper o jogo neste momento */
  adShowing = false;
  backHandler: (() => boolean) | null = null;

  get save(): SaveData {
    return this.saveService.data;
  }

  now(): number {
    return this.time.now();
  }

  async init(): Promise<void> {
    const data = await this.saveService.load(Date.now());
    this.time.init(data.lastSeen);
    data.lastSeen = this.now();
    syncLives(data, this.now());
    setLang(data.settings.lang ?? detectLang());
    this.applySettings();
    await loadRemoteConfig();
    if (env.remoteConfigUrl) void this.time.syncNetwork(env.remoteConfigUrl);
    this.ads = createAdService();
    this.iap = createIapService();
    this.iap.onChange(() => this.syncEntitlements());
    this.installLifecycle();
    this.persist();
  }

  /** Inicia anúncios (consentimento UMP) e compras em segundo plano, sem bloquear o jogo. */
  startServices(): void {
    void this.ads.init().then(() => this.emit());
    void this.iap.init().then(() => {
      this.syncEntitlements();
      this.emit();
    });
  }

  private syncEntitlements(): void {
    // A verdade vem sempre do serviço de compras; o valor guardado só serve offline.
    if (this.iap.available()) this.save.purchases.noAdsCache = this.iap.hasEntitlement(NO_ADS_ENTITLEMENT);
    this.persist();
    this.emit();
  }

  noAds(): boolean {
    if (this.iap?.available()) return this.iap.hasEntitlement(NO_ADS_ENTITLEMENT);
    return this.save.purchases.noAdsCache;
  }

  applySettings(): void {
    const s = this.save.settings;
    this.audio.setSound(s.sound);
    this.audio.setMusic(s.music);
    this.haptics.enabled = s.vibration;
  }

  reducedMotion(): boolean {
    const pref = this.save.settings.reducedMotion;
    if (pref !== null) return pref;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  /** Grava (com atraso curto) e avisa os ecrãs para atualizarem contadores. */
  persist(): void {
    this.save.lastSeen = Math.max(this.save.lastSeen, this.now());
    this.saveService.scheduleSave();
    this.emit();
  }

  onChange(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  emit(): void {
    this.listeners.forEach((l) => l());
  }

  /** Vídeo recompensado: devolve true só depois do evento "recompensa ganha". */
  async rewarded(kind: 'short' | 'long', placement: string): Promise<boolean> {
    this.adShowing = true;
    this.audio.suspend();
    try {
      const ok = await this.ads.showRewarded(kind, placement);
      analytics.log('rewarded_video', { placement, kind, ok });
      return ok;
    } finally {
      this.adShowing = false;
      this.audio.resume();
    }
  }

  async interstitial(): Promise<void> {
    this.adShowing = true;
    this.audio.suspend();
    try {
      await this.ads.showInterstitial();
    } finally {
      this.adShowing = false;
      this.audio.resume();
    }
  }

  /** Compra e entrega (só depois de validada pelo serviço). */
  async buy(productId: string): Promise<PurchaseResult> {
    const res = await this.iap.purchase(productId);
    if (res.status === 'ok') {
      deliverPurchase(this.save, res.transaction.productId, res.transaction.transactionId, this.now());
      analytics.log('purchase', { product: productId });
      this.persist();
      await this.saveService.flush();
    }
    return res;
  }

  /** Restaurar compras: Sem anúncios (entitlement) e o Passe da temporada atual. */
  async restore(): Promise<{ ok: boolean; restored: number }> {
    const r = await this.iap.restore();
    if (!r.ok) return { ok: false, restored: 0 };
    let restored = 0;
    if (r.entitlements.includes(NO_ADS_ENTITLEMENT)) {
      this.save.purchases.noAdsCache = true;
      restored++;
    }
    const now = this.now();
    for (const tx of r.transactions) {
      if (tx.productId === 'pass_season' && deliverPassIfThisSeason(this.save, tx, now)) restored++;
    }
    this.persist();
    return { ok: true, restored };
  }

  private installLifecycle(): void {
    const pause = () => {
      void this.saveService.flush();
      this.audio.suspend();
    };
    const resume = () => {
      this.audio.resume();
      syncLives(this.save, this.now());
      this.emit();
    };
    document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));
    window.addEventListener('pagehide', pause);
    if (isNative) {
      void CapApp.addListener('pause', pause);
      void CapApp.addListener('resume', resume);
      void CapApp.addListener('backButton', () => {
        if (this.backHandler?.()) return;
        void CapApp.minimizeApp();
      });
    }
  }
}

function deliverPassIfThisSeason(s: SaveData, tx: Transaction, now: number): boolean {
  // O Passe vale só para a temporada em que foi comprado.
  if (tx.date < passEnds(now) - PASS_SEASON_MS) return false;
  if (s.purchases.processedTx.includes(tx.transactionId)) {
    grantPassPremium(s, now);
    return false;
  }
  return deliverPurchase(s, 'pass_season', tx.transactionId, now);
}

export const app = new AppCore();
