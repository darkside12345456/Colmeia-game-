// Todos os textos existem em PT e EN, e todas as chaves usadas no código existem.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import pt from '../src/i18n/pt-PT.json';

type Dict = { [k: string]: string | Dict };
function keys(d: Dict, prefix = ''): string[] {
  return Object.entries(d).flatMap(([k, v]) => (typeof v === 'string' ? [prefix + k] : keys(v, `${prefix}${k}.`)));
}
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('traduções', () => {
  const ptKeys = new Set(keys(pt as Dict));
  const enKeys = new Set(keys(en as Dict));

  it('pt-PT e en têm exatamente as mesmas chaves', () => {
    expect([...ptKeys].filter((k) => !enKeys.has(k))).toEqual([]);
    expect([...enKeys].filter((k) => !ptKeys.has(k))).toEqual([]);
  });

  it('as mesmas variáveis {x} em cada texto', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    const get = (d: Dict, k: string) => k.split('.').reduce<string | Dict>((o, p) => (o as Dict)[p], d) as string;
    for (const k of ptKeys) expect(vars(get(en as Dict, k)), k).toBe(vars(get(pt as Dict, k)));
  });

  it('todas as chaves fixas usadas no código existem', () => {
    const missing: string[] = [];
    for (const f of files('src')) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) if (!ptKeys.has(m[1])) missing.push(`${f}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it('sem emojis na interface', () => {
    const all = JSON.stringify(pt) + JSON.stringify(en);
    expect(/\p{Extended_Pictographic}/u.test(all)).toBe(false);
  });
});
