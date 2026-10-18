// Botões de cantos suaves com brilho que "afundam" ao tocar (squash & stretch) e respondem logo no toque.
import Phaser from 'phaser';
import { app } from '../app';
import { glossyTile } from '../art/canvas';
import { buttonTexture, ensureTexture } from '../art/textures';
import { dur, txt } from './core';
import { RADIUS } from './theme';

export const COLORS = {
  green: '#22C98A',
  blue: '#4F7BFF',
  red: '#FF4D6D',
  honey: '#FFB020',
  pink: '#FF4FA3',
  purple: '#8B5CF6',
  grey: '#5A5480',
  white: '#EDE9FF',
  teal: '#14C8B4',
  /** vidro (botões secundários sobre o fundo escuro) */
  glass: '#463C82',
};

export interface ButtonOpts {
  w?: number;
  h?: number;
  color?: string;
  label?: string;
  fontSize?: number;
  icon?: string;
  iconSize?: number;
  /** Botão redondo (diâmetro = w) */
  round?: boolean;
  onClick: () => void;
  silent?: boolean;
}

export class Button extends Phaser.GameObjects.Container {
  readonly bg: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  icon?: Phaser.GameObjects.Image;
  private enabled = true;
  private pressed = false;
  private opts: ButtonOpts;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOpts) {
    super(scene, x, y);
    this.opts = opts;
    const w = opts.w ?? 300;
    const h = opts.round ? w : (opts.h ?? 96);
    const color = opts.color ?? COLORS.green;
    const key = opts.round ? roundTexture(scene, w, color) : buttonTexture(scene, w, h, color);
    this.bg = scene.add.image(0, opts.round ? 0 : 4, key);
    this.add(this.bg);
    const fs = opts.fontSize ?? Math.round(h * 0.4);
    if (opts.icon) {
      const isz = opts.iconSize ?? h * 0.6;
      const ix = opts.label ? -w / 2 + isz / 2 + 22 : 0;
      this.icon = scene.add.image(ix, -2, opts.icon).setDisplaySize(isz, isz);
      this.add(this.icon);
    }
    if (opts.label !== undefined) {
      const lx = opts.icon ? (opts.iconSize ?? h * 0.6) / 2 + 8 : 0;
      this.label = txt(scene, lx, -3, opts.label, fs);
      this.add(this.label);
      this.fitLabel();
    }
    this.setSize(w, h);
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => this.down());
    this.bg.on('pointerup', () => this.up(true));
    this.bg.on('pointerout', () => this.up(false));
    scene.add.existing(this);
  }

  private fitLabel(): void {
    if (!this.label) return;
    const w = (this.opts.w ?? 300) - (this.opts.icon ? (this.opts.iconSize ?? 50) + 40 : 30);
    this.label.setScale(1);
    if (this.label.width > w) this.label.setScale(w / this.label.width);
  }

  setLabel(s: string): this {
    this.label?.setText(s);
    this.fitLabel();
    return this;
  }

  setEnabled(on: boolean): this {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.55);
    return this;
  }

  private down(): void {
    if (!this.enabled) {
      app.audio.play('error');
      return;
    }
    this.pressed = true;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scaleX: 1.07, scaleY: 0.88, duration: 60, ease: 'Quad.easeOut' });
    if (!this.opts.silent) app.audio.play('button');
    app.haptics.light();
  }

  private up(fire: boolean): void {
    if (!this.pressed) return;
    this.pressed = false;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: dur(260), ease: 'Back.easeOut' });
    if (fire && this.enabled) this.opts.onClick();
  }
}

export function roundTexture(scene: Phaser.Scene, d: number, color: string): string {
  // quadrado de cantos suaves (menos "redondinho")
  return ensureTexture(scene, `round_${color}_${d}`, d + 8, d + 12, (ctx) => glossyTile(ctx, 4, 4, d, d, d * RADIUS.iconButton, color));
}

/** Botão quadrado pequeno com ícone (pausa, definições, fechar, info). */
export function iconButton(scene: Phaser.Scene, x: number, y: number, icon: string, color: string, onClick: () => void, d = 84): Button {
  return new Button(scene, x, y, { round: true, w: d, color, icon, iconSize: d * 0.58, onClick });
}
