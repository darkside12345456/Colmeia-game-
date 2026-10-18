// Relatório da curva de dificuldade: docs/levels-report.md + docs/difficulty-curve.svg
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { LevelData } from '../src/core/types';
import { targetDifficulty } from './generate-levels';

const levels: LevelData[] = readdirSync('levels')
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(`levels/${f}`, 'utf8')));

const NAME = { normal: 'Normal', hard: 'Difícil', veryHard: 'Muito difícil' } as const;
const COLOR = { normal: '#54C143', hard: '#F2AB27', veryHard: '#E8384F' } as const;

// --- gráfico SVG
const W = 1200;
const H = 360;
const pad = 40;
const bw = (W - 2 * pad) / levels.length;
let bars = '';
for (const [i, l] of levels.entries()) {
  const v = Math.max(0.02, l.stats!.lossRate);
  const h = v * (H - 2 * pad);
  bars += `<rect x="${(pad + i * bw).toFixed(1)}" y="${(H - pad - h).toFixed(1)}" width="${Math.max(1, bw - 0.6).toFixed(1)}" height="${h.toFixed(1)}" fill="${COLOR[l.difficulty]}"><title>Nível ${l.id}: ${NAME[l.difficulty]}, derrota ${(l.stats!.lossRate * 100).toFixed(0)}%</title></rect>`;
}
let grid = '';
for (const p of [0, 0.25, 0.5, 0.75, 1]) {
  const y = H - pad - p * (H - 2 * pad);
  grid += `<line x1="${pad}" x2="${W - pad}" y1="${y}" y2="${y}" stroke="#ddd"/><text x="4" y="${y + 4}" font-size="11" fill="#555">${p * 100}%</text>`;
}
for (let k = 0; k <= levels.length; k += 50) grid += `<text x="${pad + k * bw}" y="${H - 18}" font-size="11" fill="#555">${k}</text>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="sans-serif"><rect width="100%" height="100%" fill="#FBF6EA"/>${grid}${bars}
<text x="${pad}" y="20" font-size="14" fill="#2E2412">Curva de dificuldade: % de jogos aleatórios perdidos por nível (verde Normal, amarelo Difícil, vermelho Muito difícil)</text></svg>`;
writeFileSync('docs/difficulty-curve.svg', svg);

// --- tabela
const count = (d: string) => levels.filter((l) => l.difficulty === d).length;
const relabeled = levels.filter((l) => l.id > 20 && targetDifficulty(l.id) !== l.difficulty);
let md = `# Relatório dos níveis\n\nGerado por \`npm run levels:report\`.\n\n![curva](difficulty-curve.svg)\n\n`;
md += `## Resumo\n\n| Etiqueta | Níveis |\n|---|---|\n| Normal | ${count('normal')} |\n| Difícil | ${count('hard')} |\n| Muito difícil | ${count('veryHard')} |\n\n`;
md += `- Todos os ${levels.length} níveis são resolúveis com 5 ranhuras (a solução está guardada e é testada).\n`;
md += `- Normal: a estratégia gulosa ganha. Difícil: a gulosa perde e 35-74% dos jogos aleatórios perdem. Muito difícil: a gulosa perde e 75%+ dos jogos aleatórios perdem.\n`;
md += `- Níveis que não atingiram a dificuldade pretendida (ficaram com a etiqueta real medida): ${relabeled.map((l) => `${l.id} (pretendido ${NAME[targetDifficulty(l.id)]}, ficou ${NAME[l.difficulty]})`).join(', ') || 'nenhum'}.\n\n`;
md += `## Por dezena\n\n| Níveis | Tamanho médio | Blocos (média) | Peças (média) | Normal | Difícil | Muito difícil |\n|---|---|---|---|---|---|---|\n`;
for (let a = 1; a <= levels.length; a += 10) {
  const g = levels.slice(a - 1, a + 9);
  const avg = (f: (l: LevelData) => number) => Math.round(g.reduce((s, l) => s + f(l), 0) / g.length);
  md += `| ${a}-${a + g.length - 1} | ${avg((l) => l.w)}x${avg((l) => l.h)} | ${avg((l) => l.stats!.blocks)} | ${avg((l) => l.stats!.pieces)} | ${g.filter((l) => l.difficulty === 'normal').length} | ${g.filter((l) => l.difficulty === 'hard').length} | ${g.filter((l) => l.difficulty === 'veryHard').length} |\n`;
}
md += `\n## Todos os níveis\n\n| Nível | Arte | Tamanho | Cores | Peças | Etiqueta | Gulosa ganha | Derrota aleatória | Obstáculos |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const l of levels) {
  const p = l.columns.flat();
  const obs = [
    p.some((x) => x.twin !== undefined) && 'gémeas',
    p.some((x) => x.tube !== undefined) && 'tubos',
    l.stones && 'pedras',
    p.some((x) => x.hidden) && 'escondidas',
    l.flowers && 'flores',
  ]
    .filter(Boolean)
    .join(', ');
  md += `| ${l.id} | ${l.art} | ${l.w}x${l.h} | ${l.colors.length} | ${p.length} | ${NAME[l.difficulty]} | ${l.stats!.greedyWins ? 'sim' : 'não'} | ${(l.stats!.lossRate * 100).toFixed(0)}% | ${obs || '-'} |\n`;
}
writeFileSync('docs/levels-report.md', md);
console.log('docs/levels-report.md e docs/difficulty-curve.svg gerados');
