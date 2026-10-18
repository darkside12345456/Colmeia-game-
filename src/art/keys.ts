// Nomes de todas as imagens que podem ser trocadas por PNG (ver assets/manifest.json).
import { PALETTE } from '../core/palette';
import type { BeeChar, BeeExpr } from './bee';
import { ICONS } from './icons';

export const BEE_CHARS: BeeChar[] = ['mel', 'lila', 'azu', 'menta', 'rainha'];
export const BEE_EXPRS: BeeExpr[] = ['happy', 'celebrate', 'sad', 'focused', 'blink'];

export const SOUND_KEYS = ['sfx_tap', 'sfx_slot', 'sfx_deliver', 'sfx_pieceDone', 'sfx_combo', 'sfx_win', 'sfx_lose', 'sfx_coins', 'sfx_chest', 'sfx_button', 'sfx_error', 'sfx_pop', 'music'];

export function textureKeys(): string[] {
  const keys: string[] = [];
  for (const name of Object.keys(ICONS)) keys.push(`ic_${name}`);
  keys.push('ic_speed_badge');
  for (const c of PALETTE) keys.push(`block_${c.id}`, `piece_${c.id}`, `bud_${c.id}`);
  keys.push('stone', 'piece_hidden', 'slot', 'hive_door', 'cloud', 'leaf', 'px_dot', 'px_confetti', 'px_star', 'px_pollen');
  for (const ch of BEE_CHARS) for (const ex of BEE_EXPRS) keys.push(`bee_${ch}_${ex}`);
  keys.push('bee_fly_0', 'bee_fly_1', 'bee_fly_2', 'avatar_mel');
  keys.push('hive_body', 'hive_base', 'hive_doorflowers', 'hive_roof', 'hive_garden', 'hive_flag');
  return keys;
}
