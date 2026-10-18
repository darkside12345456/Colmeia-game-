// Janelas que entram com ressalto (escala 0,8 -> 1,05 -> 1), com botão de fechar sempre visível.
import Phaser from 'phaser';
import { app } from '../app';
import { buttonTexture, panelTexture } from '../art/textures';
import { iconButton, COLORS } from './Button';
import { dur, L, txt } from './core';

export interface ModalOpts {
  w?: number;
  h?: number;
  title?: string;
  ribbon?: string;
  /** false = sem botão de fechar (só para janelas sem escolha a fazer, ex.: tutorial com botão OK) */
  closable?: boolean;
  onClose?: () => void;
  /** chamado ao carregar no "voltar" do Android ou no X */
  dim?: number;
}

const stacks = new WeakMap<Phaser.Scene, Modal[]>();

export function topModal(scene: Phaser.Scene): Modal | undefined {
  const s = stacks.get(scene);
  return s?.[s.length - 1];
}

export function modalOpen(scene: Phaser.Scene): boolean {
  return (stacks.get(scene)?.length ?? 0) > 0;
}

export class Modal extends Phaser.GameObjects.Container {
  readonly panel: Phaser.GameObjects.Container;
  readonly pw: number;
  readonly ph: number;
  private dimRect: Phaser.GameObjects.Rectangle;
  private closing = false;
  private opts: ModalOpts;
  closeBtn?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, opts: ModalOpts = {}) {
    super(scene, 0, 0);
    this.opts = opts;
    this.pw = opts.w ?? 620;
    this.ph = opts.h ?? 700;
    this.setDepth(1000 + (stacks.get(scene)?.length ?? 0) * 10);
    this.dimRect = scene.add.rectangle(0, 0, L.W, L.H, 0x07041a, opts.dim ?? 0.7).setOrigin(0, 0).setInteractive();
    this.add(this.dimRect);
    this.panel = scene.add.container(L.W / 2, L.H / 2);
    this.add(this.panel);
    this.panel.add(scene.add.image(0, 0, panelTexture(scene, this.pw, this.ph)));
    if (opts.title) {
      // etiqueta em pílula a flutuar sobre o topo da janela
      const rw = Math.min(this.pw - 160, Math.max(300, opts.title.length * 24 + 90));
      this.panel.add(scene.add.image(0, -this.ph / 2 + 12, buttonTexture(scene, rw, 84, opts.ribbon ?? COLORS.honey)));
      const t = txt(scene, 0, -this.ph / 2 + 4, opts.title, 40);
      if (t.width > rw - 60) t.setScale((rw - 60) / t.width);
      this.panel.add(t);
    }
    if (opts.closable !== false) {
      this.closeBtn = iconButton(scene, this.pw / 2 - 30, -this.ph / 2 + 30, 'ic_close', COLORS.glass, () => this.close(), 68);
      this.panel.add(this.closeBtn);
    }
    scene.add.existing(this);
    let st = stacks.get(scene);
    if (!st) {
      st = [];
      stacks.set(scene, st);
      // quando a cena termina, as janelas dela deixam de existir
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => stacks.delete(scene));
    }
    st.push(this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      const list = stacks.get(scene);
      const i = list?.indexOf(this) ?? -1;
      if (list && i >= 0) list.splice(i, 1);
    });
    this.open();
  }

  /** Acrescenta um objeto ao painel (coordenadas relativas ao centro do painel). */
  addContent<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.panel.add(obj);
    if (this.closeBtn) this.panel.bringToTop(this.closeBtn);
    return obj;
  }

  private open(): void {
    this.dimRect.setAlpha(0);
    this.scene.tweens.add({ targets: this.dimRect, alpha: 1, duration: dur(180) });
    this.panel.setScale(0.8);
    this.scene.tweens.chain({
      targets: this.panel,
      tweens: [
        { scale: 1.05, duration: dur(160), ease: 'Quad.easeOut' },
        { scale: 1, duration: dur(140), ease: 'Quad.easeInOut' },
      ],
    });
    app.audio.play('pop');
  }

  close(silent = false): void {
    if (this.closing) return;
    this.closing = true;
    const st = stacks.get(this.scene) ?? [];
    const i = st.indexOf(this);
    if (i >= 0) st.splice(i, 1);
    this.scene.tweens.add({ targets: this.panel, scale: 0.85, alpha: 0, duration: dur(140), ease: 'Quad.easeIn' });
    this.scene.tweens.add({
      targets: this.dimRect,
      alpha: 0,
      duration: dur(160),
      onComplete: () => this.destroy(),
    });
    if (!silent) this.opts.onClose?.();
  }
}

/** Fecha a janela de cima (para o botão "voltar" do Android). Devolve true se fechou alguma. */
export function closeTopModal(scene: Phaser.Scene): boolean {
  const m = topModal(scene);
  if (!m) return false;
  m.close();
  return true;
}
