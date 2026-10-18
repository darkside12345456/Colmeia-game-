// Carrega os níveis (JSON em levels/) só quando são precisos. Tudo vem dentro da app (offline).
import type { LevelData } from './core/types';

const files = import.meta.glob<{ default: LevelData }>('../levels/level_*.json');

export const LEVEL_TOTAL = Object.keys(files).length;

export async function loadLevel(n: number): Promise<LevelData> {
  // Depois do último nível, os níveis repetem em ciclo (até haver mais níveis numa atualização).
  const idx = ((n - 1) % LEVEL_TOTAL) + 1;
  const key = `../levels/level_${String(idx).padStart(4, '0')}.json`;
  const loader = files[key];
  if (!loader) throw new Error(`Nível ${n} não encontrado`);
  const mod = await loader();
  return { ...mod.default, id: n };
}

/** Etiqueta de dificuldade do nível (para o botão Jogar), sem carregar o nível todo. */
export async function levelDifficulty(n: number): Promise<LevelData['difficulty']> {
  return (await loadLevel(n)).difficulty;
}
