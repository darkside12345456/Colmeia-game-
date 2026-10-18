// Gera os PNG de pixel art em assets/levels/art/ a partir dos motivos (tools/art/motifs.ts).
// Uso: npm run art   (opcional: --preview <pasta> grava também uma folha de pré-visualização)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { hexToRgb, PALETTE_BY_ID } from '../src/core/palette';
import { MOTIFS } from './art/motifs';
import { Pix } from './art/raster';

export const ART_SIZES: [number, number][] = [
  [16, 16],
  [20, 20],
  [24, 24],
  [28, 30],
  [32, 34],
  [36, 40],
  [40, 44],
];

const OUT = 'assets/levels/art';

export function renderMotif(key: string, w: number, h: number): Pix {
  const m = MOTIFS.find((x) => x.key === key);
  if (!m) throw new Error(`motivo desconhecido ${key}`);
  const p = new Pix(w, h);
  m.draw(p);
  return p;
}

function toPng(p: Pix, scale = 1): PNG {
  const png = new PNG({ width: p.w * scale, height: p.h * scale });
  for (let y = 0; y < p.h * scale; y++) {
    for (let x = 0; x < p.w * scale; x++) {
      const id = p.data[Math.floor(y / scale) * p.w + Math.floor(x / scale)];
      const k = (y * p.w * scale + x) * 4;
      if (!id) {
        png.data[k + 3] = 0;
        continue;
      }
      const [r, g, b] = hexToRgb(PALETTE_BY_ID.get(id)!.hex);
      png.data[k] = r;
      png.data[k + 1] = g;
      png.data[k + 2] = b;
      png.data[k + 3] = 255;
    }
  }
  return png;
}

function main() {
  mkdirSync(OUT, { recursive: true });
  let n = 0;
  for (const m of MOTIFS) {
    for (const [w, h] of ART_SIZES) {
      const p = renderMotif(m.key, w, h);
      writeFileSync(join(OUT, `${m.key}_${w}x${h}.png`), PNG.sync.write(toPng(p)));
      n++;
    }
  }
  console.log(`${n} PNG gravados em ${OUT}`);

  const pi = process.argv.indexOf('--preview');
  if (pi > 0) {
    const dir = process.argv[pi + 1];
    mkdirSync(dir, { recursive: true });
    // folha com todos os motivos a 32x34, ampliados 4x
    const cols = 8;
    const cw = 32 * 4 + 8;
    const ch = 34 * 4 + 8;
    const rows = Math.ceil(MOTIFS.length / cols);
    const sheet = new PNG({ width: cols * cw, height: rows * ch });
    sheet.data.fill(255);
    MOTIFS.forEach((m, idx) => {
      const img = toPng(renderMotif(m.key, 32, 34), 4);
      const ox = (idx % cols) * cw + 4;
      const oy = Math.floor(idx / cols) * ch + 4;
      PNG.bitblt(img, sheet, 0, 0, img.width, img.height, ox, oy);
    });
    writeFileSync(join(dir, 'art-preview.png'), PNG.sync.write(sheet));
    console.log(`pré-visualização em ${dir}/art-preview.png`);
  }
}

if (process.argv[1]?.includes('make-art')) main();
