import { Capacitor } from '@capacitor/core';

/** true dentro da app Android (Capacitor); false no browser. */
export const isNative = Capacitor.isNativePlatform();

export const env = {
  adsMode: (import.meta.env.VITE_ADS_MODE ?? 'fake') as 'fake' | 'real',
  iapMode: (import.meta.env.VITE_IAP_MODE ?? 'fake') as 'fake' | 'real',
  admobTesting: (import.meta.env.VITE_ADMOB_TESTING ?? 'true') !== 'false',
  admob: {
    rewarded: import.meta.env.VITE_ADMOB_REWARDED_ID ?? '',
    rewardedInterstitial: import.meta.env.VITE_ADMOB_REWARDED_INTERSTITIAL_ID ?? '',
    interstitial: import.meta.env.VITE_ADMOB_INTERSTITIAL_ID ?? '',
    banner: import.meta.env.VITE_ADMOB_BANNER_ID ?? '',
  },
  revenueCatKey: import.meta.env.VITE_REVENUECAT_PUBLIC_KEY ?? '',
  remoteConfigUrl: import.meta.env.VITE_REMOTE_CONFIG_URL ?? '',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL ?? 'suporte@exemplo.pt',
  privacyUrl: import.meta.env.VITE_PRIVACY_URL ?? '',
  dev: import.meta.env.DEV,
  version: __APP_VERSION__,
};
