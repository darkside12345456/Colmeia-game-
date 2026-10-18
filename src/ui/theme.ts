// Identidade visual moderna da Colmeia Doce: noite índigo/ameixa com brilhos cor de mel,
// peças tipo gema/vidro, janelas de vidro fosco, sem contornos pretos grossos.
export const THEME = {
  // fundo (gradiente de cima para baixo)
  bgTop: '#120D2E',
  bgMid: '#26154A',
  bgBottom: '#43205A',
  // brilhos ambiente
  glowHoney: '#FFB627',
  glowPink: '#FF5FA2',
  glowBlue: '#5B7CFF',
  // janelas e cartões (vidro fosco)
  panelTop: '#30275C',
  panelBottom: '#1D1740',
  line: 'rgba(255,255,255,0.14)',
  card: '#2B2352',
  cardHi: '#3A3070',
  // texto
  text: '#F5F2FF',
  textMuted: '#B8B0DD',
  // destaque
  accent: '#FFC23D',
  // sombras
  shadow: 'rgba(6,3,20,0.55)',
} as const;

export const FONT = '"Outfit", system-ui, sans-serif';

/** '#RRGGBB' -> 0xRRGGBB (para os Graphics do Phaser). */
export function hex(c: string): number {
  return parseInt(c.slice(1, 7), 16);
}

/** Raio dos cantos (unidades do jogo). Valores baixos = visual mais reto e moderno. */
export const RADIUS = {
  block: 7,
  piece: 16,
  button: 14,
  iconButton: 0.24,
  panel: 22,
  card: 12,
  tray: 16,
  bar: 6,
  chip: 10,
} as const;
