/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_ADS_MODE?: string;
  readonly VITE_IAP_MODE?: string;
  readonly VITE_ADMOB_TESTING?: string;
  readonly VITE_ADMOB_REWARDED_ID?: string;
  readonly VITE_ADMOB_REWARDED_INTERSTITIAL_ID?: string;
  readonly VITE_ADMOB_INTERSTITIAL_ID?: string;
  readonly VITE_ADMOB_BANNER_ID?: string;
  readonly VITE_REVENUECAT_PUBLIC_KEY?: string;
  readonly VITE_REMOTE_CONFIG_URL?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_PRIVACY_URL?: string;
}
