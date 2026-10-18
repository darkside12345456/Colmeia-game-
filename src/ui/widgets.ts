// Componentes reutilizáveis: contadores de moedas e vidas, avisos, barras, prémios, scroll.
import Phaser from 'phaser';
import { app } from '../app';
import { formatDuration, t } from '../i18n';
import { type BoosterId } from '../meta/config';
import { livesInfo, type Reward } from '../meta/economy';
import { Button, COLORS } from './Button';
import { dur, INK, L, txt } from './core';
import { RADIUS } from './theme';

function pill(scene: Phaser.Scene, w: number, h: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  // caixa de vidro escuro
  g.fillStyle(0x07041a, 0.55).fillRoundedRect(-w / 2, -h / 2, w, h, RADIUS.chip);
  g.lineStyle(2, 0xffffff, 0.14).strokeRoundedRect(-w / 2, -h / 2, w, h, RADIUS.chip);
  return g;
}

/** Contador de moedas com "+" verde (abre a loja). */
export class CoinCounter extends Phaser.GameObjects.Container {
  private label: Phaser.GameObjects.Text;
  readonly coin: Phaser.GameObjects.Image;
  private shown = -1;
  private unsub: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onPlus?: () => void) {
    super(scene, x, y);
    this.add(pill(scene, 200, 62));
    this.coin = scene.add.image(-86, 0, 'ic_coin').setDisplaySize(76, 76);
    this.add(this.coin);
    this.label = txt(scene, 6, -2, '0', 34);
    this.add(this.label);
    if (onPlus) this.add(new Button(scene, 92, 0, { round: true, w: 54, color: COLORS.green, icon: 'ic_plus', iconSize: 34, onClick: onPlus }));
    scene.add.existing(this);
    this.refresh();
    this.unsub = app.onChange(() => this.refresh());
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.unsub());
  }

  refresh(): void {
    const v = app.save.coins;
    if (v === this.shown) return;
    const from = this.shown < 0 ? v : this.shown;
    this.shown = v;
    const obj = { n: from };
    this.scene.tweens.add({
      targets: obj,
      n: v,
      duration: dur(Math.min(800, Math.abs(v - from) * 4 + 100)),
      onUpdate: () => this.label.setText(String(Math.round(obj.n))),
    });
    if (v > from) this.scene.tweens.add({ targets: this.coin, scale: this.coin.scale * 1.2, duration: 90, yoyo: true });
  }

  coinWorldPos(): Phaser.Math.Vector2 {
    const m = this.coin.getWorldTransformMatrix();
    return new Phaser.Math.Vector2(m.tx, m.ty);
  }
}

/** Contador de vidas: número + "Cheias" / contagem decrescente / infinitas. */
export class LivesCounter extends Phaser.GameObjects.Container {
  private num: Phaser.GameObjects.Text;
  private info: Phaser.GameObjects.Text;
  private inf: Phaser.GameObjects.Image;
  private timer: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number, onTap?: () => void) {
    super(scene, x, y);
    const p = pill(scene, 200, 62);
    this.add(p);
    const heart = scene.add.image(-86, 0, 'ic_heart').setDisplaySize(80, 80);
    this.add(heart);
    this.num = txt(scene, -86, -2, '5', 30);
    this.inf = scene.add.image(-86, 0, 'ic_infinite').setDisplaySize(48, 48).setVisible(false);
    this.add([this.num, this.inf]);
    this.info = txt(scene, 18, -1, '', 28, { body: true, weight: '600' });
    this.add(this.info);
    if (onTap) {
      heart.setInteractive({ useHandCursor: true }).on('pointerdown', onTap);
    }
    scene.add.existing(this);
    this.refresh();
    this.timer = scene.time.addEvent({ delay: 500, loop: true, callback: () => this.refresh() });
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.timer.remove());
  }

  refresh(): void {
    const li = livesInfo(app.save, app.now());
    const infinite = li.infinite > 0;
    this.inf.setVisible(infinite);
    this.num.setVisible(!infinite).setText(String(li.lives));
    this.info.setText(infinite ? formatDuration(li.infinite) : li.full ? t('common.full') : formatDuration(li.nextIn));
  }
}

/** Pontinho vermelho "!" de "há algo para reclamar". */
export function badge(scene: Phaser.Scene, x: number, y: number, label = '!'): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0xff4d6d, 0.35).fillCircle(0, 0, 21);
  g.fillStyle(0xff4d6d, 1).fillCircle(0, 0, 17);
  g.lineStyle(2, 0xffffff, 0.5).strokeCircle(0, 0, 17);
  c.add(g);
  c.add(txt(scene, 0, -2, label, 24, { stroke: false }));
  scene.tweens.add({ targets: c, scale: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return c;
}

/** Mensagem curta que sobe e desaparece. */
export function toast(scene: Phaser.Scene, msg: string, y = L.H * 0.42): void {
  const c = scene.add.container(L.W / 2, y).setDepth(5000);
  const label = txt(scene, 0, 0, msg, 32, { wrap: 560 });
  const w = Math.min(660, label.width + 60);
  const h = label.height + 30;
  const g = scene.add.graphics();
  g.fillStyle(0x1d1740, 0.94).fillRoundedRect(-w / 2, -h / 2, w, h, RADIUS.card);
  g.lineStyle(2, 0xffffff, 0.16).strokeRoundedRect(-w / 2, -h / 2, w, h, RADIUS.card);
  c.add([g, label]);
  c.setScale(0.6).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: dur(180), ease: 'Back.easeOut' });
  scene.tweens.add({ targets: c, y: y - 60, alpha: 0, delay: 1400, duration: dur(400), onComplete: () => c.destroy() });
}

export class ProgressBar extends Phaser.GameObjects.Container {
  private fill: Phaser.GameObjects.Graphics;
  private value = 0;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private bw: number,
    private bh: number,
    private color = 0x22c98a,
  ) {
    super(scene, x, y);
    const g = scene.add.graphics();
    g.fillStyle(0x07041a, 0.6).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, Math.min(bh / 2, RADIUS.bar));
    g.lineStyle(2, 0xffffff, 0.12).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, Math.min(bh / 2, RADIUS.bar));
    this.fill = scene.add.graphics();
    this.add([g, this.fill]);
    scene.add.existing(this);
  }
  set(p: number): this {
    this.value = Math.max(0, Math.min(1, p));
    const w = Math.max(this.bh, this.bw * this.value);
    this.fill.clear();
    if (this.value <= 0) return this;
    this.fill.fillStyle(this.color, 1).fillRoundedRect(-this.bw / 2, -this.bh / 2, w, this.bh, Math.min(this.bh / 2, RADIUS.bar));
    this.fill.fillStyle(0xffffff, 0.35).fillRoundedRect(-this.bw / 2 + 4, -this.bh / 2 + 3, w - 8, this.bh * 0.35, Math.min(this.bh * 0.17, RADIUS.bar / 2));
    return this;
  }
}

/** Mostra um prémio como ícones com quantidades. */
export function rewardRow(scene: Phaser.Scene, r: Reward, size = 56, fontSize = 26): Phaser.GameObjects.Container {
  const items: [string, string][] = [];
  if (r.coins) items.push(['ic_coin', String(r.coins)]);
  for (const [id, n] of Object.entries(r.boosters ?? {})) if (n) items.push([`ic_${boosterIcon(id as BoosterId)}`, `x${n}`]);
  if (r.infiniteMin) items.push(['ic_heart', `${r.infiniteMin}m`]);
  if (r.speedMin) items.push(['ic_speed_badge', `${r.speedMin}m`]);
  if (r.lives) items.push(['ic_heart', `+${r.lives}`]);
  const c = scene.add.container(0, 0);
  const step = size + 22;
  items.forEach(([icon, label], i) => {
    const x = (i - (items.length - 1) / 2) * step;
    c.add(scene.add.image(x, -6, icon).setDisplaySize(size, size));
    c.add(txt(scene, x, size / 2 - 2, label, fontSize));
  });
  return c;
}

export function boosterIcon(id: BoosterId): string {
  return id;
}

/** Descrição em texto de um prémio (para leitores e janelas). */
export function rewardText(r: Reward): string {
  const parts: string[] = [];
  if (r.coins) parts.push(t('reward.coins', { n: r.coins }));
  for (const [id, n] of Object.entries(r.boosters ?? {})) if (n) parts.push(t('reward.booster', { n, name: t(`boosters.${id}`) }));
  if (r.infiniteMin) parts.push(t('reward.infinite', { m: r.infiniteMin }));
  if (r.speedMin) parts.push(t('reward.speed', { m: r.speedMin }));
  if (r.lives) parts.push(t('reward.lives', { n: r.lives }));
  return parts.join(' + ');
}

/** Interruptor ligado/desligado (Definições). */
export function toggleRow(
  scene: Phaser.Scene,
  y: number,
  w: number,
  icon: string,
  label: string,
  get: () => boolean,
  set: (v: boolean) => void,
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, y);
  const ib = scene.add.graphics();
  ib.fillStyle(0x4f7bff, 0.25).fillCircle(-w / 2 + 34, 0, 30);
  ib.lineStyle(2, 0x4f7bff, 0.8).strokeCircle(-w / 2 + 34, 0, 30);
  c.add(ib);
  c.add(scene.add.image(-w / 2 + 34, 0, icon).setDisplaySize(40, 40));
  c.add(txt(scene, -w / 2 + 80, 0, label, 30, { body: true, origin: [0, 0.5], weight: '600' }));
  const btn = new Button(scene, w / 2 - 80, 0, {
    w: 150,
    h: 64,
    color: get() ? COLORS.green : COLORS.grey,
    label: get() ? t('settings.on') : t('settings.off'),
    fontSize: 28,
    onClick: () => {
      set(!get());
      btn.bg.setTexture(get() ? `btn_${COLORS.green}_150x64` : `btn_${COLORS.grey}_150x64`);
      btn.setLabel(get() ? t('settings.on') : t('settings.off'));
    },
  });
  // garante as duas texturas
  new Button(scene, -9999, -9999, { w: 150, h: 64, color: get() ? COLORS.grey : COLORS.green, onClick: () => {} }).destroy();
  c.add(btn);
  return c;
}

/** Área com scroll vertical (arrastar com o dedo), com máscara. */
export class ScrollArea extends Phaser.GameObjects.Container {
  readonly content: Phaser.GameObjects.Container;
  private contentH = 0;
  private scrollY = 0;
  private dragging = false;
  private lastY = 0;
  private velocity = 0;
  private moved = 0;
  private maskG: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private aw: number,
    private ah: number,
  ) {
    super(scene, x, y);
    this.content = scene.add.container(0, -ah / 2);
    this.add(this.content);
    this.maskG = scene.make.graphics({}, false);
    const zone = scene.add.zone(0, 0, aw, ah).setInteractive();
    this.addAt(zone, 0);
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.start(p));
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.events.on('update', this.tick, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      scene.events.off('update', this.tick, this);
      this.maskG.destroy();
    });
    scene.add.existing(this);
  }

  /** Atualiza a máscara (chamar depois de posicionar a área no ecrã). */
  updateMask(): void {
    // posição final no mundo (ignora a escala da animação de entrada da janela)
    let x = this.x;
    let y = this.y;
    for (let p = this.parentContainer; p; p = p.parentContainer) {
      x += p.x;
      y += p.y;
    }
    // coordenadas do mundo (a câmara aplica o zoom à máscara - verificado com zoom 1 e 1,5)
    this.maskG.clear().fillStyle(0xffffff).fillRect(x - this.aw / 2, y - this.ah / 2, this.aw, this.ah);
    this.content.setMask(this.maskG.createGeometryMask());
  }

  setContentHeight(h: number): void {
    this.contentH = h;
    this.clamp();
  }

  /** true se o último toque foi um arrasto (para os botões ignorarem o clique). */
  wasDrag(): boolean {
    return this.moved > 12;
  }

  scrollTo(y: number): void {
    this.scrollY = y;
    this.clamp();
  }

  private start(p: Phaser.Input.Pointer): void {
    this.dragging = true;
    this.lastY = p.y;
    this.velocity = 0;
    this.moved = 0;
  }
  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.dragging || !p.isDown) return;
    const dy = (p.y - this.lastY) / L.K;
    this.lastY = p.y;
    this.moved += Math.abs(dy);
    this.scrollY -= dy;
    this.velocity = -dy;
    this.clamp();
  }
  private onUp(): void {
    this.dragging = false;
  }
  private tick(): void {
    if (!this.dragging && Math.abs(this.velocity) > 0.3) {
      this.scrollY += this.velocity;
      this.velocity *= 0.92;
      this.clamp();
    }
  }
  private clamp(): void {
    const max = Math.max(0, this.contentH - this.ah);
    this.scrollY = Math.max(0, Math.min(max, this.scrollY));
    this.content.y = -this.ah / 2 - this.scrollY;
  }
}

/** Linha de texto com ícone de cadeado. */
export function lockedLabel(scene: Phaser.Scene, x: number, y: number, label: string): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  c.add(scene.add.image(-60, 0, 'ic_lock').setDisplaySize(44, 44));
  c.add(txt(scene, 10, 0, label, 24, { color: INK, stroke: false, body: true, weight: '600' }));
  return c;
}
