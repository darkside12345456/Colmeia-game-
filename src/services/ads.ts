// Anúncios (secção 4). Tudo passa por esta interface: o jogo nunca fala direto com o SDK.
// Regra de ouro: o prémio só é dado se showRewarded() devolver true, o que só acontece
// depois do evento "recompensa ganha" (nunca ao abrir o vídeo).
// Sem rede / sem anúncio disponível: showRewarded() devolve false e o jogo continua normal.
import { t } from '../i18n';
import { escapeHtml, overlay } from './overlay';
import { env, isNative } from './platform';

/** 'short' = anúncio curto (recompensado intersticial); 'long' = vídeo recompensado normal. */
export type RewardedKind = 'short' | 'long';

export interface AdService {
  init(): Promise<void>;
  /** Pode mostrar anúncios (consentimento resolvido e SDK pronto)? */
  canRequestAds(): boolean;
  showRewarded(kind: RewardedKind, placement: string): Promise<boolean>;
  showInterstitial(): Promise<void>;
  showBanner(): Promise<void>;
  hideBanner(): Promise<void>;
  /** As Definições devem mostrar o botão "Privacidade e anúncios"? */
  privacyOptionsRequired(): boolean;
  showPrivacyOptions(): Promise<void>;
}

// ----------------------------------------------------------------- versão FALSA (testes)

export class FakeAdService implements AdService {
  /** O banner falso é desenhado pelo próprio jogo (Phaser), no espaço reservado em baixo. */
  bannerVisible = false;
  /** Para testar falhas: localStorage.cd_fake_nofill = '1' simula "sem anúncios". */
  private noFill(): boolean {
    try {
      return localStorage.getItem('cd_fake_nofill') === '1' || !navigator.onLine;
    } catch {
      return false;
    }
  }
  async init(): Promise<void> {}
  canRequestAds(): boolean {
    return true;
  }
  privacyOptionsRequired(): boolean {
    return true;
  }
  async showPrivacyOptions(): Promise<void> {
    await this.message(t('ads.fakeConsentTitle'), t('ads.fakeConsentText'));
  }

  showRewarded(kind: RewardedKind, placement: string): Promise<boolean> {
    if (this.noFill()) return Promise.resolve(false);
    const seconds = kind === 'short' ? 3 : 6;
    return new Promise((resolve) => {
      const el = overlay(`
        <button class="x" aria-label="${escapeHtml(t('common.close'))}">X</button>
        <span class="tag">${escapeHtml(t(kind === 'short' ? 'ads.fakeShort' : 'ads.fakeLong'))}</span>
        <h2>${escapeHtml(t('ads.fakeTitle'))}</h2>
        <p>${escapeHtml(placement)}</p>
        <div class="bar"><i></i></div>
        <p class="cd-left"></p>`);
      const bar = el.querySelector('.bar i') as HTMLElement;
      const left = el.querySelector('.cd-left') as HTMLElement;
      const start = performance.now();
      const tick = () => {
        const s = (performance.now() - start) / 1000;
        bar.style.width = `${Math.min(100, (s / seconds) * 100)}%`;
        left.textContent = s >= seconds ? t('ads.fakeDone') : t('ads.rewardIn', { s: Math.ceil(seconds - s) });
      };
      tick();
      const iv = setInterval(tick, 100);
      (el.querySelector('.x') as HTMLButtonElement).onclick = () => {
        clearInterval(iv);
        el.remove();
        // "recompensa ganha" só se viu até ao fim
        resolve((performance.now() - start) / 1000 >= seconds);
      };
    });
  }

  showInterstitial(): Promise<void> {
    if (this.noFill()) return Promise.resolve();
    return this.message(t('ads.fakeInterstitial'), t('ads.fakeTitle'));
  }

  async showBanner(): Promise<void> {
    this.bannerVisible = true;
  }
  async hideBanner(): Promise<void> {
    this.bannerVisible = false;
  }

  private message(title: string, text: string): Promise<void> {
    return new Promise((resolve) => {
      const el = overlay(`<button class="x">X</button><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p>`);
      (el.querySelector('.x') as HTMLButtonElement).onclick = () => {
        el.remove();
        resolve();
      };
    });
  }
}

// ----------------------------------------------------------------- versão REAL (AdMob)

/** IDs de TESTE oficiais da Google (usar sempre durante o desenvolvimento). */
const TEST_IDS = {
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  rewardedInterstitial: 'ca-app-pub-3940256099942544/5354046379',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  banner: 'ca-app-pub-3940256099942544/6300978111',
};

export class AdMobAdService implements AdService {
  private ready = false;
  private canRequest = false;
  private privacyRequired = false;
  private bannerShown = false;
  private mod: typeof import('@capacitor-community/admob') | null = null;

  private id(kind: keyof typeof TEST_IDS): string {
    if (env.admobTesting) return TEST_IDS[kind];
    return env.admob[kind] || TEST_IDS[kind];
  }

  async init(): Promise<void> {
    try {
      this.mod = await import('@capacitor-community/admob');
      const { AdMob, MaxAdContentRating, AdmobConsentStatus } = this.mod;
      // Classificação máxima G e sem tratamento personalizado para menores (secção 11.5).
      await AdMob.initialize({ maxAdContentRating: MaxAdContentRating.General, tagForUnderAgeOfConsent: false });
      // Consentimento UMP (obrigatório na UE) ANTES de pedir anúncios.
      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) info = await AdMob.showConsentForm();
      this.canRequest = info.canRequestAds;
      // (o enum PrivacyOptionsRequirementStatus não é exportado em runtime pelo plugin)
      this.privacyRequired = String(info.privacyOptionsRequirementStatus) === 'REQUIRED';
      this.ready = true;
    } catch (e) {
      console.warn('[ads] AdMob indisponível', e);
      this.ready = false;
    }
  }

  canRequestAds(): boolean {
    return this.ready && this.canRequest;
  }
  privacyOptionsRequired(): boolean {
    return this.privacyRequired;
  }
  async showPrivacyOptions(): Promise<void> {
    if (!this.mod) return;
    try {
      await this.mod.AdMob.showPrivacyOptionsForm();
      const info = await this.mod.AdMob.requestConsentInfo();
      this.canRequest = info.canRequestAds;
    } catch (e) {
      console.warn('[ads] formulário de privacidade falhou', e);
    }
  }

  async showRewarded(kind: RewardedKind): Promise<boolean> {
    if (!this.canRequestAds() || !this.mod) return false;
    const { AdMob, RewardAdPluginEvents, RewardInterstitialAdPluginEvents } = this.mod;
    let rewarded = false;
    const handles: { remove(): Promise<void> }[] = [];
    try {
      if (kind === 'long') {
        handles.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => (rewarded = true)));
        await AdMob.prepareRewardVideoAd({ adId: this.id('rewarded'), isTesting: env.admobTesting });
        await AdMob.showRewardVideoAd();
      } else {
        handles.push(await AdMob.addListener(RewardInterstitialAdPluginEvents.Rewarded, () => (rewarded = true)));
        await AdMob.prepareRewardInterstitialAd({ adId: this.id('rewardedInterstitial'), isTesting: env.admobTesting });
        await AdMob.showRewardInterstitialAd();
      }
    } catch (e) {
      console.warn('[ads] vídeo recompensado indisponível', e);
    } finally {
      for (const h of handles) await h.remove();
    }
    return rewarded;
  }

  async showInterstitial(): Promise<void> {
    if (!this.canRequestAds() || !this.mod) return;
    try {
      await this.mod.AdMob.prepareInterstitial({ adId: this.id('interstitial'), isTesting: env.admobTesting });
      await this.mod.AdMob.showInterstitial();
    } catch (e) {
      console.warn('[ads] intersticial indisponível', e);
    }
  }

  async showBanner(): Promise<void> {
    if (!this.canRequestAds() || !this.mod || this.bannerShown) return;
    try {
      const { AdMob, BannerAdPosition, BannerAdSize } = this.mod;
      await AdMob.showBanner({
        adId: this.id('banner'),
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        isTesting: env.admobTesting,
      });
      this.bannerShown = true;
    } catch (e) {
      console.warn('[ads] banner indisponível', e);
    }
  }
  async hideBanner(): Promise<void> {
    if (!this.mod || !this.bannerShown) return;
    try {
      await this.mod.AdMob.removeBanner();
    } catch {
      /* ignorar */
    }
    this.bannerShown = false;
  }
}

export function createAdService(): AdService {
  return env.adsMode === 'real' && isNative ? new AdMobAdService() : new FakeAdService();
}
