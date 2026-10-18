// Remote config simples: um JSON público (HTTPS) com preços, frequência de anúncios e eventos.
// Valores embutidos por defeito; o último JSON válido fica guardado para funcionar offline.
import { applyRemoteConfig } from '../meta/config';
import { env } from './platform';
import { storage } from './storage';

const CACHE = 'cd_remote_config';

export async function loadRemoteConfig(): Promise<void> {
  const cached = await storage.get(CACHE);
  if (cached) {
    try {
      applyRemoteConfig(JSON.parse(cached));
    } catch {
      /* cache inválida: fica com os valores embutidos */
    }
  }
  const url = env.remoteConfigUrl;
  if (!url.startsWith('https://')) return;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return;
    const text = await res.text();
    if (text.length > 50_000) return;
    const json = JSON.parse(text);
    applyRemoteConfig(json);
    await storage.set(CACHE, JSON.stringify(json));
  } catch {
    /* sem rede: usa cache/embutidos */
  }
}
