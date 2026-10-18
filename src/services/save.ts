// Gravação do progresso: versão + checksum + cópia de segurança.
// Se o save principal estiver corrompido usa a cópia; se ambas falharem começa de novo
// (as compras não se perdem: vêm sempre do serviço de compras / "Restaurar compras").
import { defaultSave, migrate, type SaveData } from '../meta/state';
import { checksum } from './checksum';
import { storage } from './storage';

const KEY = 'cd_save';
const BACKUP = 'cd_save_bak';

interface Envelope {
  v: number;
  d: string;
  s: string;
}

export type LoadStatus = 'ok' | 'new' | 'backup' | 'corrupted';

function unwrap(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as Envelope;
    if (typeof env.d !== 'string' || env.s !== checksum(env.d)) return null;
    return JSON.parse(env.d);
  } catch {
    return null;
  }
}

export class SaveService {
  data!: SaveData;
  status: LoadStatus = 'new';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastGood: string | null = null;

  async load(now: number): Promise<SaveData> {
    const main = await storage.get(KEY);
    let raw = unwrap(main);
    if (raw) {
      this.status = 'ok';
      this.lastGood = main;
    } else {
      const bak = await storage.get(BACKUP);
      raw = unwrap(bak);
      if (raw) {
        this.status = 'backup';
        this.lastGood = bak;
      } else this.status = main ? 'corrupted' : 'new';
    }
    this.data = raw ? migrate(raw, now) : defaultSave(now);
    return this.data;
  }

  /** Grava daqui a pouco (junta várias alterações seguidas numa só escrita). */
  scheduleSave(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, 400);
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.data) return;
    const d = JSON.stringify(this.data);
    const env = JSON.stringify({ v: this.data.version, d, s: checksum(d) } satisfies Envelope);
    if (this.lastGood) await storage.set(BACKUP, this.lastGood);
    await storage.set(KEY, env);
    this.lastGood = env;
  }
}
