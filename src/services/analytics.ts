// Analytics (fase posterior: Firebase). Por agora não envia nada para lado nenhum.
// Quando for ligado: declarar na política de privacidade e na Segurança dos dados,
// respeitar o consentimento e NUNCA enviar dados pessoais.
export type AnalyticsEvent =
  | 'level_start'
  | 'level_win'
  | 'level_fail'
  | 'booster_use'
  | 'rewarded_video'
  | 'purchase'
  | 'speed_boost';

export const analytics = {
  log(event: AnalyticsEvent, params: Record<string, string | number | boolean> = {}): void {
    // eslint-disable-next-line no-console -- só em desenvolvimento
    if (import.meta.env.DEV) console.debug('[analytics]', event, params);
  },
};
