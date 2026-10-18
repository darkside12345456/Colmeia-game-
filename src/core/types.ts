export type Difficulty = 'normal' | 'hard' | 'veryHard';

/** Definição de uma peça no ficheiro do nível. */
export interface PieceDef {
  id: number;
  /** Índice da cor em LevelData.colors */
  c: number;
  /** Número de blocos que esta peça recolhe */
  n: number;
  /** Peça gémea (id da parceira) - entram juntas e precisam de 2 ranhuras */
  twin?: number;
  /** Peça-tubo: id da peça logo atrás (mesma coluna) que sobe pelo tubo quando esta chega a 0 */
  tube?: number;
  /** Peça escondida: mostra "?" até chegar à fila da frente */
  hidden?: boolean;
}

export interface StoneDef {
  x: number;
  y: number;
  /** Blocos a recolher no nível até a pedra de cera partir */
  n: number;
}

export interface FlowerDef {
  x: number;
  y: number;
  /** Índice da cor que tem de ser toda recolhida para a flor abrir */
  lock: number;
}

export interface LevelStats {
  greedyWins: boolean;
  /** Percentagem (0-1) de jogos aleatórios que acabam em derrota */
  lossRate: number;
  blocks: number;
  pieces: number;
}

export interface LevelData {
  id: number;
  seed: number;
  difficulty: Difficulty;
  art?: string;
  w: number;
  h: number;
  /** Ids de cor da paleta usados no nível */
  colors: string[];
  /** h linhas de w caracteres: '.' = vazio, '0'..'9','a'.. = índice da cor */
  grid: string[];
  stones?: StoneDef[];
  flowers?: FlowerDef[];
  /** 4 colunas; índice 0 = peça da frente */
  columns: PieceDef[][];
  /** Sequência vencedora (colunas a tocar, cada toque num momento de calma) */
  solution?: number[];
  stats?: LevelStats;
}

export const EMPTY_CHAR = '.';
const CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

export function colorChar(idx: number): string {
  return CHARS[idx];
}
export function charColor(ch: string): number {
  return ch === EMPTY_CHAR ? -1 : CHARS.indexOf(ch);
}
