// Relógio de confiança (secção 11.2): nunca anda para trás, mesmo que se mude a hora do
// telemóvel. Quando há rede, acerta pela hora do servidor (cabeçalho Date de um pedido HTTPS).
export class TimeService {
  private offset = 0;
  private floor = 0;

  /** lastSeen = maior hora de confiança guardada no save. */
  init(lastSeen: number): void {
    const wall = Date.now();
    this.floor = lastSeen;
    if (wall < lastSeen - 2 * 60_000) this.offset = lastSeen - wall;
  }

  now(): number {
    const t = Date.now() + this.offset;
    if (t < this.floor) return this.floor;
    this.floor = t;
    return t;
  }

  /** Tenta acertar pela hora do servidor. Sem rede ou sem cabeçalho: não faz nada. */
  async syncNetwork(url: string, timeoutMs = 4000): Promise<boolean> {
    if (!url.startsWith('https://')) return false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
      clearTimeout(timer);
      const date = res.headers.get('date');
      const server = date ? Date.parse(date) : NaN;
      if (!Number.isFinite(server)) return false;
      this.offset = server - Date.now();
      return true;
    } catch {
      return false;
    }
  }
}
