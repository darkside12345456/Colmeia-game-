// Base das cenas e utilitários de texto/layout.
// O jogo é desenhado num espaço de 720 x H unidades (H depende do ecrã do telemóvel) e
// renderizado com zoom K para ficar nítido em ecrãs de alta densidade.
import Phaser from 'phaser';
import { app } from '../app';

export const L = { W: 720, H: 1560, K: 1 };

export function computeLayout(cssW: number, cssH: number, dpr: number): void {
  const aspect = Math.min(2.3, Math.max(1.6, cssH / Math.max(1, cssW)));
  L.H = Math.round(720 * aspect);
  const k = (dpr * Math.min(cssW, cssH / aspect)) / 720;
  L.K = Math.min(2, Math.max(1, Math.round(k * 4) / 4));
}

export const FONT_TITLE = '"Baloo 2", "Nunito", sans-serif';
export const FONT_BODY = '"Nunito", sans-serif';
export const INK = '#2E2412';

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

/** Texto do jogo: títulos e números com contorno escuro grosso (estilo da secção 7). */
export function txt(scene: Phaser.Scene, x: number, y: number, str: string, size: number, o: TxtOpts = {}): Phaser.GameObjects.Text {
  const title = !o.body;
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: title ? FONT_TITLE : FONT_BODY,
    fontSize: `${size}px`,
    fontStyle: o.weight ?? (title ? '800' : '700'),
    color: o.color ?? (title ? '#FFFFFF' : INK),
    align: o.align ?? 'center',
    lineSpacing: o.lineSpacing ?? 0,
  };
  if (o.stroke ?? title) {
    style.stroke = INK;
    style.strokeThickness = Math.max(3, Math.round(size * 0.16));
    style.shadow = { offsetX: 0, offsetY: Math.max(2, size * 0.07), color: INK, blur: 0, fill: true, stroke: true };
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
    this.cameras.main.setBackgroundColor('#FBF6EA');
  }

  /** Transição suave entre ecrãs. */
  go(key: string, data?: object): void {
    this.cameras.main.fadeOut(dur(220), 251, 246, 234);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
  }

  fadeIn(): void {
    this.cameras.main.fadeIn(dur(260), 251, 246, 234);
  }
}
