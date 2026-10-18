// Gerador pseudo-aleatório determinístico (mulberry32). Mesma seed => mesma sequência,
// para os níveis serem sempre iguais para todos.
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 0x9e3779b9;
  }
  /** Número em [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Inteiro em [min, max] (inclusive). */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  /** Estado interno (para clonar o motor de jogo de forma determinística). */
  get state(): number {
    return this.s;
  }
  set state(v: number) {
    this.s = v >>> 0;
  }
}

/** Hash de 32 bits de vários inteiros (para derivar seeds). */
export function hashInts(...nums: number[]): number {
  let h = 0x811c9dc5;
  for (const n of nums) {
    h ^= n & 0xffff;
    h = Math.imul(h, 0x01000193);
    h ^= (n >>> 16) & 0xffff;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Hash de 32 bits de uma string (FNV-1a). */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
