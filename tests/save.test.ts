// Testes da gravação (save apagado/corrompido/editado) e do relógio de confiança (secção 11.8).
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = new Map<string, string>();
vi.mock('../src/services/storage', () => ({
  storage: {
    get: async (k: string) => mem.get(k) ?? null,
    set: async (k: string, v: string) => void mem.set(k, v),
    remove: async (k: string) => void mem.delete(k),
  },
}));

const { SaveService } = await import('../src/services/save');
const { TimeService } = await import('../src/services/time');

const NOW = Date.UTC(2026, 9, 18, 12);

describe('gravação', () => {
  beforeEach(() => mem.clear());

  it('sem save começa de novo', async () => {
    const s = new SaveService();
    const d = await s.load(NOW);
    expect(s.status).toBe('new');
    expect(d.level).toBe(1);
  });

  it('grava e volta a ler com checksum', async () => {
    const s = new SaveService();
    await s.load(NOW);
    s.data.coins = 777;
    s.data.level = 12;
    await s.flush();
    const s2 = new SaveService();
    const d = await s2.load(NOW);
    expect(s2.status).toBe('ok');
    expect(d.coins).toBe(777);
    expect(d.level).toBe(12);
  });

  it('save editado à mão (checksum errado) usa a cópia de segurança', async () => {
    const s = new SaveService();
    await s.load(NOW);
    s.data.coins = 100;
    await s.flush();
    s.data.coins = 150;
    await s.flush();
    const env = JSON.parse(mem.get('cd_save')!);
    env.d = env.d.replace('"coins":150', '"coins":999999');
    mem.set('cd_save', JSON.stringify(env));
    const s2 = new SaveService();
    const d = await s2.load(NOW);
    expect(s2.status).toBe('backup');
    expect(d.coins).toBe(100);
  });

  it('save e cópia corrompidos: o jogo arranca na mesma (sem rebentar)', async () => {
    mem.set('cd_save', '{lixo');
    mem.set('cd_save_bak', 'também lixo');
    const s = new SaveService();
    const d = await s.load(NOW);
    expect(s.status).toBe('corrupted');
    expect(d.level).toBe(1);
  });
});

describe('relógio de confiança', () => {
  it('se a hora do telemóvel andar para trás, o tempo do jogo não recua', () => {
    const real = Date.now;
    try {
      const t = new TimeService();
      Date.now = () => NOW;
      t.init(NOW);
      expect(t.now()).toBe(NOW);
      Date.now = () => NOW - 5 * 3600_000; // alguém atrasa o relógio 5 h
      expect(t.now()).toBe(NOW);
      Date.now = () => NOW + 60_000;
      expect(t.now()).toBe(NOW + 60_000);
    } finally {
      Date.now = real;
    }
  });

  it('save com hora futura (relógio adiantado e depois corrigido) não dá tempo extra', () => {
    const real = Date.now;
    try {
      const t = new TimeService();
      Date.now = () => NOW; // hora real
      t.init(NOW + 10 * 3600_000); // o save foi gravado com o relógio adiantado 10 h
      expect(t.now()).toBeGreaterThanOrEqual(NOW + 10 * 3600_000);
    } finally {
      Date.now = real;
    }
  });
});
