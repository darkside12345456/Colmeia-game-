// Verificação de integridade simples do save (só para dissuadir edição fácil; num jogo
// offline é impossível impedir 100% a batota - o importante é que não dá acesso a nada pago).
// A "chave" é derivada e não é secreta: está dentro da app como tudo o resto.
const DERIVED = ['c', 'o', 'l', 'm', 'e', 'i', 'a'].map((c, i) => c.charCodeAt(0) * (i + 7)).join('.');

function cyrb53(str: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function checksum(data: string): string {
  const a = cyrb53(DERIVED + data, 1);
  const b = cyrb53(data + DERIVED, 2);
  return a.toString(36) + '.' + b.toString(36);
}
