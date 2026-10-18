// Base das cenas e utilitários de texto/layout.
// O jogo é desenhado num espaço de 720 x H unidades (H depende do ecrã do telemóvel) e
// renderizado com zoom K para ficar nítido em ecrãs de alta densidade.
import Phaser from 'phaser';
import { app } from '../app';
import { FONT, THEME } from './theme';

export const L = { W: 720, H: 1560, K: 1 };

export function computeLayout(cssW: number, cssH: number, dpr: number): void {
  const aspect = Math.min(2.3, Math.max(1.6, cssH / Math.max(1, cssW)));
  L.H = Math.round(720 * aspect);
  const k = (dpr * Math.min(cssW, cssH / aspect)) / 720;
  L.K = Math.min(2, Math.max(1, Math.round(k * 4) / 4));
}

export const FONT_TITLE = FONT;
export const FONT_BODY = FONT;
/** Cor do texto normal (claro, sobre o vidro escuro das janelas). */
export const INK = THEME.text;

export interface TxtOpts {
  color?: string;
  stroke?: boolean;
  body?: boolean;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  origin?: [number, number];
  weight?: string;
  lineSpacing?: number;
}

/** Texto do jogo: letra geométrica limpa; títulos com sombra suave (sem contorno grosso). */
export function txt(scene: Phaser.Scene, x: number, y: number, str: string, size: number, o: TxtOpts = {}): Phaser.GameObjects.Text {
  const title = !o.body;
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: title ? FONT_TITLE : FONT_BODY,
    fontSize: `${size}px`,
    fontStyle: o.weight ?? (title ? '700' : '500'),
    color: o.color ?? (title ? '#FFFFFF' : INK),
    align: o.align ?? 'center',
    lineSpacing: o.lineSpacing ?? 0,
  };
  if (o.stroke ?? title) {
    style.shadow = { offsetX: 0, offsetY: Math.max(1, size * 0.05), color: 'rgba(8,4,24,0.55)', blur: Math.max(2, size * 0.18), fill: true };
  }
  if (o.wrap) style.wordWrap = { width: o.wrap, useAdvancedWrap: true };
  const t = scene.add.text(x, y, str, style);
  t.setResolution(L.K);
  t.setOrigin(...(o.origin ?? [0.5, 0.5]));
  return t;
}

/** Duração de animações (mais curtas com "reduzir movimento"). */
export function dur(ms: number): number {
  return app.reducedMotion() ? Math.round(ms * 0.35) : ms;
}

export class BaseScene extends Phaser.Scene {
  create(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(L.K);
    this.cameras.main.setBackgroundColor(THEME.bgMid);
  }

  /** Transição suave entre ecrãs. */
  go(key: string, data?: object): void {
    this.cameras.main.fadeOut(dur(220), 18, 13, 46);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
  }

  fadeIn(): void {
    this.cameras.main.fadeIn(dur(260), 18, 13, 46);
  }
}
