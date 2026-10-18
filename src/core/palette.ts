// Paleta do jogo (design system "Merge" + algumas cores extra para a pixel art).
// Os blocos e as peças usam estas cores. Os níveis guardam o "id" da cor.
export interface PaletteColor {
  id: string;
  hex: string;
}

export const PALETTE: readonly PaletteColor[] = [
  { id: 'mel', hex: '#D1992C' },
  { id: 'ambar', hex: '#D1822C' },
  { id: 'sol', hex: '#F2AB27' },
  { id: 'mostarda', hex: '#D1AC2B' },
  { id: 'areia', hex: '#D1BC72' },
  { id: 'rosa', hex: '#F2059F' },
  { id: 'magenta', hex: '#ED19D3' },
  { id: 'ameixa', hex: '#8B2A8C' },
  { id: 'violeta', hex: '#8302D2' },
  { id: 'azul', hex: '#0293F2' },
  { id: 'oceano', hex: '#00506A' },
  { id: 'lagoa', hex: '#037285' },
  { id: 'turquesa', hex: '#0FBF9F' },
  { id: 'agua', hex: '#52D3BC' },
  { id: 'verde', hex: '#54C143' },
  { id: 'lima', hex: '#C3D12C' },
  { id: 'menta', hex: '#ABF9A4' },
  // Extra (com brilho permitido) para frutos, céu e contornos na pixel art
  { id: 'cereja', hex: '#E8384F' },
  { id: 'laranja', hex: '#F2762E' },
  { id: 'ceu', hex: '#8FD3FF' },
  { id: 'creme', hex: '#FBF6EA' },
  { id: 'castanho', hex: '#7A4A22' },
  { id: 'lilas', hex: '#C39BF2' },
  { id: 'rosado', hex: '#F7A8CF' },
];

export const PALETTE_BY_ID: ReadonlyMap<string, PaletteColor> = new Map(PALETTE.map((c) => [c.id, c]));

export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function colorHex(id: string): string {
  const c = PALETTE_BY_ID.get(id);
  if (!c) throw new Error(`Cor desconhecida: ${id}`);
  return c.hex;
}

/** Cores da interface (secção 7). */
export const UI = {
  cream: '#FBF6EA',
  cream2: '#F2EAD3',
  text: '#2E2412',
  green: '#54C143',
  blue: '#0293F2',
  red: '#E8384F',
  honey: '#F2AB27',
  amber: '#D1822C',
  white: '#FFFFFF',
} as const;
