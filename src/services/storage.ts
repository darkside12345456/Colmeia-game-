// Armazenamento local: @capacitor/preferences na app, localStorage no browser.
// Nunca lança erros (um armazenamento em falha não pode partir o jogo).
import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform';

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      if (isNative) return (await Preferences.get({ key })).value;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (isNative) await Preferences.set({ key, value });
      else localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[storage] falhou a gravar', key, e);
    }
  },
  async remove(key: string): Promise<void> {
    try {
      if (isNative) await Preferences.remove({ key });
      else localStorage.removeItem(key);
    } catch {
      /* ignorar */
    }
  },
};
