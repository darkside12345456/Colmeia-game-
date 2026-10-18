// Traduções. Todo o texto da interface vem daqui (pt-PT por defeito, inglês preparado).
import en from './en.json';
import pt from './pt-PT.json';
import type { Lang } from '../meta/state';

type Dict = { [k: string]: string | Dict };
const DICTS: Record<Lang, Dict> = { 'pt-PT': pt, en };

let lang: Lang = 'pt-PT';

export function detectLang(): Lang {
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'pt-PT';
  return nav.toLowerCase().startsWith('pt') ? 'pt-PT' : 'en';
}

export function setLang(l: Lang): void {
  lang = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

export function getLang(): Lang {
  return lang;
}

function lookup(d: Dict, key: string): string | undefined {
  let cur: string | Dict | undefined = d;
  for (const part of key.split('.')) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function t(key: string, params: Record<string, string | number> = {}): string {
  const s = lookup(DICTS[lang], key) ?? lookup(DICTS['pt-PT'], key) ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in params ? String(params[k]) : `{${k}}`));
}

/** "1d 07h", "2h 05m" ou "4:09" - para os temporizadores dos eventos. */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return t('time.dh', { d, h: String(h).padStart(2, '0') });
  if (h > 0) return t('time.hm', { h, m: String(m).padStart(2, '0') });
  return t('time.ms', { m, s: String(sec).padStart(2, '0') });
}
