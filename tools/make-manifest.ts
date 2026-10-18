// Gera assets/manifest.json com todos os nomes de imagens e sons do jogo.
// Para trocar um desenho por um PNG: põe o ficheiro em public/images/ e escreve o caminho
// (ex.: "images/bee_mel_happy.png") no lugar do null. Sons: public/sounds/ (mp3/ogg).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { SOUND_KEYS, textureKeys } from '../src/art/keys';

const FILE = 'assets/manifest.json';
const old = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as { images?: Record<string, string | null>; sounds?: Record<string, string | null> }) : {};
const images: Record<string, string | null> = {};
for (const k of textureKeys()) images[k] = old.images?.[k] ?? null;
const sounds: Record<string, string | null> = {};
for (const k of SOUND_KEYS) sounds[k] = old.sounds?.[k] ?? null;
writeFileSync(
  FILE,
  JSON.stringify(
    {
      _info:
        'null = desenhado por código. Para usar um PNG/som teu, põe o ficheiro em public/images ou public/sounds e escreve aqui o caminho, ex.: "images/bee_mel_happy.png". Regista a origem/licença em assets/CREDITS.md.',
      images,
      sounds,
    },
    null,
    2,
  ) + '\n',
);
console.log(`${FILE}: ${Object.keys(images).length} imagens, ${Object.keys(sounds).length} sons`);
