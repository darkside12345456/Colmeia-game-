// Ecrã de jogo (secção 2). Toda a lógica vem do motor puro (core/engine.ts);
// esta cena só desenha e anima o que o motor diz.
import Phaser from 'phaser';
import { app } from '../app';
import { BEE_COLORS } from '../art/bee';
import { frameTexture } from '../art/textures';
import { GameEngine, KIND_FLOWER, KIND_STONE, MAX_SLOTS, type Bee, type EngineEvent, type RPiece } from '../core/engine';
import { colorHex } from '../core/palette';
import { smartShuffle } from '../core/solver';
import type { LevelData } from '../core/types';
import { formatDuration, t } from '../i18n';
import { BOOSTERS, config, type BoosterId } from '../meta/config';
import { consumeSpeed, introduceBoosters, isBoosterUnlocked, recordLoss, recordWin, toggleSpeed, useBooster } from '../meta/economy';
import { eventsOnLevelEnd, trackHive } from '../meta/events';
import { FakeAdService } from '../services/ads';
import { analytics } from '../services/analytics';
import { Button, COLORS, iconButton } from '../ui/Button';
import { BaseScene, dur, INK, L, txt } from '../ui/core';
import { burst, confetti, flash, tutorialHand } from '../ui/fx';
import { closeTopModal, modalOpen } from '../ui/Modal';
import { badge, toast } from '../ui/widgets';
import {
  boosterBuyModal,
  boosterIntroModal,
  failModal,
  noSpaceModal,
  obstacleModal,
  pauseModal,
  speedModal,
  victoryModal,
} from './modals';

type State = 'intro' | 'play' | 'won' | 'blocked' | 'over';

interface PieceView {
  c: Phaser.GameObjects.Container;
  img: Phaser.GameObjects.Image;
  num: Phaser.GameObjects.Text;
  id: number;
  hiddenShown: boolean;
}

interface BeeView {
  img: Phaser.GameObjects.Image;
  carry: Phaser.GameObjects.Image | null;
  out: Phaser.Curves.QuadraticBezier;
  back: Phaser.Curves.QuadraticBezier;
}

const BEE_FRAMES = ['bee_fly_0', 'bee_fly_1', 'bee_fly_2', 'bee_fly_1'];
const OBSTACLE_TUTORIALS: [string, (l: LevelData) => boolean][] = [
  ['twins', (l) => l.columns.flat().some((p) => p.twin !== undefined)],
  ['tubes', (l) => l.columns.flat().some((p) => p.tube !== undefined)],
  ['stones', (l) => !!l.stones?.length],
  ['hidden', (l) => l.columns.flat().some((p) => p.hidden)],
  ['flowers', (l) => !!l.flowers?.length],
];

export class GameScene extends BaseScene {
  level!: LevelData;
  engine!: GameEngine;
  private state: State = 'intro';
  private mode: null | 'tweezers' | 'magnet' = null;
  // layout
  private cell = 32;
  private bx = 0;
  private by = 0;
  private door = { x: 0, y: 0 };
  private trayY = 0;
  private colX: number[] = [];
  private rowY: number[] = [];
  private boostersY = 0;
  // vistas
  private blocks: (Phaser.GameObjects.Image | null)[] = [];
  private stoneLabels = new Map<number, Phaser.GameObjects.Text>();
  private flowerDots = new Map<number, Phaser.GameObjects.Image>();
  private slotBgs: Phaser.GameObjects.Image[] = [];
  private views = new Map<number, PieceView>();
  private bees = new Map<number, BeeView>();
  private links!: Phaser.GameObjects.Graphics;
  private boosterBtns = new Map<BoosterId, { btn: Button; badge: Phaser.GameObjects.Container }>();
  private speedBtn!: Button;
  private speedLabel!: Phaser.GameObjects.Text;
  private speedGlow!: Phaser.GameObjects.Image;
  private magnetChips: Phaser.GameObjects.Container | null = null;
  private realTime = 0;
  private lastDone = -99999;
  private combo = 0;
  private deliverStreak = 0;
  private lastDeliver = 0;
  private speedSaveTimer = 0;
  private usedVideoSlot = false;
  private passReviveUsed = false;
  private hadAttempts = 0;
  private removeTutorial: (() => void) | null = null;
  private tutorialStep = '';

  constructor() {
    super('Game');
  }

  init(data: { level: LevelData }): void {
    this.level = data.level;
    this.state = 'intro';
    this.mode = null;
    this.blocks = [];
    this.stoneLabels = new Map();
    this.flowerDots = new Map();
    this.slotBgs = [];
    this.views = new Map();
    this.bees = new Map();
    this.boosterBtns = new Map();
    this.magnetChips = null;
    this.usedVideoSlot = false;
    this.passReviveUsed = false;
    this.combo = 0;
    this.lastDone = -99999;
    this.removeTutorial = null;
    this.tutorialStep = '';
  }

  override create(): void {
    super.create();
    this.engine = new GameEngine(this.level);
    this.hadAttempts = app.save.stats.attemptsOnLevel;
    this.add.rectangle(0, 0, L.W, L.H, 0xfbf6ea).setOrigin(0, 0);
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xcdebfa, 0xcdebfa, 0xfbf6ea, 0xfbf6ea, 1).fillRect(0, 0, L.W, L.H * 0.5);
    this.layout();
    this.buildTop();
    this.buildBoard();
    this.buildTray();
    this.links = this.add.graphics().setDepth(26);
    this.renderColumns(false);
    this.buildBoosters();
    this.fadeIn();
    analytics.log('level_start', { level: this.level.id, difficulty: this.level.difficulty });
    app.backHandler = () => {
      if (closeTopModal(this)) return true;
      if (this.state === 'play') pauseModal(this);
      return true;
    };
    if (!app.noAds() && config().ads.bannerEnabled) {
      void app.ads.showBanner().then(() => this.drawFakeBanner());
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      app.backHandler = null;
      void app.ads.hideBanner();
      app.persist();
    });
    this.time.delayedCall(dur(500), () => this.startIntroFlow());
  }

  /** No modo de testes o banner é um retângulo desenhado no espaço reservado. */
  private drawFakeBanner(): void {
    if (!(app.ads instanceof FakeAdService) || !app.ads.bannerVisible || !this.sys.isActive()) return;
    const h = this.bannerSpace() - 12;
    this.add.rectangle(0, L.H - h, L.W, h, 0x2e2412).setOrigin(0, 0).setDepth(90);
    txt(this, L.W / 2, L.H - h / 2, t('ads.fakeBanner'), 26, { stroke: false, color: '#FBF6EA', body: true }).setDepth(91);
  }

  // ------------------------------------------------------------------ layout

  private bannerSpace(): number {
    return !app.noAds() && config().ads.bannerEnabled ? 112 : 16;
  }

  private layout(): void {
    const top = 112;
    const bottom = L.H - this.bannerSpace();
    this.boostersY = bottom - 66;
    const piecesH = 320;
    const piecesTop = this.boostersY - 70 - piecesH;
    this.trayY = piecesTop - 70;
    const doorY = this.trayY - 92;
    const boardBottom = doorY - 34;
    const availH = boardBottom - top - 40;
    const availW = 650;
    const { w, h } = this.level;
    this.cell = Math.floor(Math.min(availW / w, availH / h, 64));
    const bw = this.cell * w;
    const bh = this.cell * h;
    this.bx = (L.W - bw) / 2;
    this.by = top + 20 + (availH - bh) / 2;
    this.door = { x: L.W / 2, y: doorY };
    this.colX = [0, 1, 2, 3].map((i) => L.W / 2 + (i - 1.5) * 160);
    this.rowY = [piecesTop + 62, piecesTop + 168, piecesTop + 258];
  }

  private cellPos(i: number): { x: number; y: number } {
    const x = i % this.level.w;
    const y = Math.floor(i / this.level.w);
    return { x: this.bx + (x + 0.5) * this.cell, y: this.by + (y + 0.5) * this.cell };
  }

  // ------------------------------------------------------------------ topo

  private buildTop(): void {
    iconButton(this, 62, 62, 'ic_pause', COLORS.blue, () => this.state === 'play' && pauseModal(this), 88).setDepth(50);
    txt(this, L.W / 2, 50, t('common.level', { n: this.level.id }), 46).setDepth(50);
    const diff = this.level.difficulty;
    if (diff !== 'normal') {
      txt(this, L.W / 2, 94, t(`difficulty.${diff}`), 26, { color: diff === 'hard' ? '#F2AB27' : '#E8384F' }).setDepth(50);
    }
    this.speedGlow = this.add.image(L.W - 66, 62, 'px_dot').setDisplaySize(160, 160).setTint(0x8fd3ff).setAlpha(0).setDepth(49);
    this.speedBtn = new Button(this, L.W - 66, 60, {
      round: true,
      w: 96,
      color: COLORS.blue,
      icon: 'ic_speed',
      iconSize: 54,
      onClick: () => this.onSpeedButton(),
    });
    this.speedBtn.setDepth(50);
    this.speedLabel = txt(this, L.W - 66, 118, '', 24).setDepth(50);
    this.refreshSpeed();
  }

  private onSpeedButton(): void {
    if (this.state !== 'play' && this.state !== 'intro') return;
    const sp = app.save.speed;
    if (sp.msLeft > 0) {
      const on = toggleSpeed(app.save);
      toast(this, t(on ? 'game.speedOn' : 'game.speedOff'), this.trayY - 40);
      app.persist();
      this.refreshSpeed();
    } else speedModal(this, () => this.refreshSpeed());
  }

  refreshSpeed(): void {
    const sp = app.save.speed;
    const active = sp.on && sp.msLeft > 0;
    this.speedLabel.setText(sp.msLeft > 0 ? formatDuration(sp.msLeft) : '2x');
    this.speedLabel.setColor(active ? '#FFFFFF' : '#D7E9F7');
    this.speedGlow.setAlpha(active ? 0.8 : 0);
    if (this.speedBtn.icon) this.speedBtn.icon.setTint(active ? 0xffffff : sp.msLeft > 0 ? 0x9ab4c8 : 0xffffff);
  }

  // ------------------------------------------------------------------ quadro

  private buildBoard(): void {
    const { w, h } = this.level;
    const bw = this.cell * w;
    const bh = this.cell * h;
    this.add.image(L.W / 2, this.by + bh / 2 + 4, frameTexture(this, Math.round(bw + 44), Math.round(bh + 52))).setDepth(5);
    this.add.image(this.door.x, this.door.y + 6, 'hive_door').setDisplaySize(200, 110).setDepth(6);
    const e = this.engine;
    const blockSize = this.cell * 0.98;
    for (let i = 0; i < w * h; i++) {
      const k = e.kind[i];
      if (k === 0) {
        this.blocks.push(null);
        continue;
      }
      const { x, y } = this.cellPos(i);
      const colorId = this.level.colors[e.color[i]];
      const key = k === KIND_STONE ? 'stone' : k === KIND_FLOWER ? `bud_${colorId}` : `block_${colorId}`;
      const img = this.add.image(x, y, key).setDisplaySize(blockSize, blockSize).setDepth(10);
      this.blocks.push(img);
      // entrada em onda
      const d = (Math.floor(i / w) + (i % w)) * 12;
      img.setScale(0.01);
      this.tweens.add({ targets: img, scaleX: blockSize / 64, scaleY: blockSize / 64, delay: dur(d), duration: dur(260), ease: 'Back.easeOut' });
      if (k === KIND_STONE) {
        const lab = txt(this, x, y, String(e.stoneLeft(i)), Math.max(14, this.cell * 0.55)).setDepth(11);
        this.stoneLabels.set(i, lab);
      }
      if (k === KIND_FLOWER) {
        const lockHex = colorHex(this.level.colors[e.flowerLock[i]]);
        const dot = this.add
          .image(x + this.cell * 0.28, y - this.cell * 0.28, 'px_dot')
          .setDisplaySize(this.cell * 0.55, this.cell * 0.55)
          .setTint(Phaser.Display.Color.HexStringToColor(lockHex).color)
          .setDepth(11);
        this.flowerDots.set(i, dot);
      }
    }
  }

  // ------------------------------------------------------------------ bandeja e colunas

  private slotX(s: number, n = this.engine.capacity): number {
    const step = Math.min(124, 690 / n);
    return L.W / 2 + (s - (n - 1) / 2) * step;
  }

  private slotSize(n = this.engine.capacity): number {
    return Math.min(112, 690 / n - 10);
  }

  private buildTray(): void {
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0x2e2412, 0.25).fillRoundedRect(10, this.trayY - 66, L.W - 20, 140, 36);
    g.fillStyle(0xf2ead3, 1).fillRoundedRect(10, this.trayY - 70, L.W - 20, 136, 36);
    g.lineStyle(4, 0x2e2412, 0.6).strokeRoundedRect(10, this.trayY - 70, L.W - 20, 136, 36);
    this.layoutSlots(false);
  }

  private layoutSlots(animate: boolean): void {
    const n = this.engine.capacity;
    while (this.slotBgs.length < n) {
      const img = this.add.image(L.W / 2, this.trayY, 'slot').setDepth(21);
      if (animate) {
        img.setScale(0.01);
      }
      this.slotBgs.push(img);
    }
    const sz = this.slotSize();
    this.slotBgs.forEach((img, s) => {
      const target = { x: this.slotX(s), scale: sz / 120 };
      if (animate) this.tweens.add({ targets: img, x: target.x, scaleX: target.scale, scaleY: target.scale, duration: dur(300), ease: 'Back.easeOut' });
      else img.setPosition(target.x, this.trayY).setScale(target.scale);
    });
    for (let s = 0; s < n; s++) {
      const id = this.engine.slots[s];
      if (id < 0) continue;
      const v = this.views.get(id);
      if (v) this.tweens.add({ targets: v.c, x: this.slotX(s), scale: this.slotSize() / 128, duration: dur(300) });
    }
  }

  private makeView(id: number): PieceView {
    const p = this.engine.pieces.get(id)!;
    const c = this.add.container(0, 0).setDepth(30);
    const img = this.add.image(0, 0, `piece_${this.level.colors[p.color]}`);
    const num = txt(this, 0, -4, String(p.remaining), 54);
    c.add([img, num]);
    const v: PieceView = { c, img, num, id, hiddenShown: false };
    img.setInteractive({ useHandCursor: true });
    img.on('pointerdown', () => this.onPieceDown(v));
    this.views.set(id, v);
    return v;
  }

  private setHidden(v: PieceView, hidden: boolean): void {
    const p = this.engine.pieces.get(v.id)!;
    if (hidden === v.hiddenShown) return;
    v.hiddenShown = hidden;
    v.img.setTexture(hidden ? 'piece_hidden' : `piece_${this.level.colors[p.color]}`);
    v.num.setText(hidden ? '?' : String(p.remaining));
  }

  /** Posiciona as peças nas colunas (frente + 2 de trás, esbatidas). */
  private renderColumns(animate: boolean): void {
    const visible = new Set<number>();
    this.engine.columns.forEach((col, ci) => {
      col.slice(0, 3).forEach((id, depth) => {
        visible.add(id);
        let v = this.views.get(id);
        const isNew = !v;
        if (!v) v = this.makeView(id);
        if (this.engine.slotOf(id) >= 0) return;
        const p = this.engine.pieces.get(id)!;
        const scale = depth === 0 ? 112 / 128 : 92 / 128;
        const x = this.colX[ci];
        const y = this.rowY[depth];
        const front = depth === 0;
        this.setHidden(v, p.hidden && !front);
        v.c.setDepth(30 - depth);
        const alpha = front ? 1 : 0.55;
        v.img.setTint(front ? 0xffffff : 0xd8d0c0);
        if (!animate || isNew) {
          v.c.setPosition(x, isNew && animate ? y + 60 : y).setScale(scale).setAlpha(isNew && animate ? 0 : alpha);
          if (isNew && animate) this.tweens.add({ targets: v.c, y, alpha, duration: dur(260), ease: 'Quad.easeOut' });
        } else {
          this.tweens.add({ targets: v.c, x, y, scale, alpha, duration: dur(240), ease: 'Back.easeOut' });
        }
      });
    });
    // vistas de peças que deixaram de estar visíveis nas colunas (e não estão na bandeja)
    for (const [id, v] of this.views) {
      if (!visible.has(id) && this.engine.slotOf(id) < 0) {
        v.c.destroy();
        this.views.delete(id);
      }
    }
  }

  /** Barras das gémeas e tubos (redesenhadas a cada frame). */
  private drawLinks(): void {
    const g = this.links;
    g.clear();
    const e = this.engine;
    const pos = (id: number) => this.views.get(id)?.c;
    for (const p of e.pieces.values()) {
      if (p.twin >= 0 && p.id < p.twin) {
        const a = pos(p.id);
        const b = pos(p.twin);
        if (a && b && e.slotOf(p.id) < 0 && e.slotOf(p.twin) < 0 && a.visible && b.visible) {
          g.lineStyle(20, 0x2e2412, 1).lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(12, 0xf2ab27, 1).lineBetween(a.x, a.y, b.x, b.y);
          g.fillStyle(0xffffff, 0.6).fillCircle((a.x + b.x) / 2, (a.y + b.y) / 2, 5);
        }
      }
      if (p.tubeChild >= 0) {
        const a = pos(p.id);
        const b = pos(p.tubeChild);
        if (a && b) {
          g.lineStyle(30, 0x2e2412, 0.9).lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(20, 0x8fd3ff, 0.85).lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(6, 0xffffff, 0.6).lineBetween(a.x - 5, a.y, b.x - 5, b.y);
        }
      }
    }
  }

  // ------------------------------------------------------------------ toques

  private onPieceDown(v: PieceView): void {
    if (this.state !== 'play' || modalOpen(this)) return;
    const e = this.engine;
    const id = v.id;
    if (e.slotOf(id) >= 0) return;
    // resposta imediata: a peça afunda
    this.tweens.add({ targets: v.c, scaleY: v.c.scaleY * 0.86, scaleX: v.c.scaleX * 1.08, duration: 50, yoyo: true });
    if (this.mode === 'tweezers') {
      if (!e.canTweezers(id)) {
        this.feedbackError(v, t('game.noSpace'));
        return;
      }
      useBooster(app.save, 'tweezers');
      this.afterBoosterUse('tweezers');
      e.tweezers(id);
      this.setMode(null);
      this.handleEvents(e.flush());
      this.renderColumns(true);
      return;
    }
    const col = e.columnOf(id);
    if (col < 0 || e.columns[col][0] !== id) {
      this.feedbackError(v, '');
      return;
    }
    const check = e.checkTap(col);
    if (check !== 'ok') {
      const p = e.pieces.get(id)!;
      const msg =
        check === 'tube' ? t('game.tube') : check === 'twinNotFront' ? t('game.twinNotFront') : p.twin >= 0 ? t('game.noSpaceTwin') : t('game.noSpace');
      this.feedbackError(v, msg);
      return;
    }
    app.audio.play('tap');
    app.haptics.light();
    e.tap(col);
    this.handleEvents(e.flush());
    this.renderColumns(true);
    if (this.tutorialStep === 'tap') this.finishTapTutorial();
  }

  private feedbackError(v: PieceView, msg: string): void {
    app.audio.play('error');
    const x = v.c.x;
    this.tweens.add({ targets: v.c, x: x + 10, duration: 50, yoyo: true, repeat: 2, onComplete: () => v.c.setX(x) });
    if (msg) toast(this, msg, this.trayY - 40);
  }

  // ------------------------------------------------------------------ eventos do motor

  private handleEvents(events: EngineEvent[]): void {
    for (const ev of events) {
      switch (ev.type) {
        case 'enter':
          this.onEnter(ev.pieceId, ev.slot, ev.source);
          break;
        case 'launch':
          this.onLaunch(ev.bee);
          break;
        case 'pickup':
          this.onPickup(ev.bee);
          break;
        case 'deliver':
          this.onDeliver(ev.bee, ev.pieceId, ev.remaining);
          break;
        case 'pieceDone':
          this.onPieceDone(ev.pieceId);
          break;
        case 'stoneBreak':
          this.onStoneBreak(ev.cell);
          break;
        case 'flowerOpen':
          this.onFlowerOpen(ev.cell);
          break;
        case 'magnet':
          this.onMagnet(ev.color, ev.cells);
          break;
        case 'columnRemove': {
          const v = this.views.get(ev.pieceId);
          if (v) this.popView(v);
          this.renderColumns(true);
          break;
        }
        case 'pieceUpdate': {
          const v = this.views.get(ev.pieceId);
          const p = this.engine.pieces.get(ev.pieceId)!;
          if (v && !v.hiddenShown) {
            v.num.setText(String(p.remaining));
            this.pulse(v);
          }
          break;
        }
        case 'shuffle':
          this.renderColumns(true);
          break;
        case 'slotAdded':
          this.layoutSlots(true);
          break;
      }
    }
  }

  private onEnter(id: number, slot: number, source: string): void {
    let v = this.views.get(id);
    if (!v) {
      v = this.makeView(id);
      const col = this.engine.columnOf(id);
      v.c.setPosition(this.colX[Math.max(0, col)] ?? L.W / 2, this.rowY[2]);
    }
    this.setHidden(v, false);
    v.img.setTint(0xffffff);
    v.c.setAlpha(1).setDepth(35);
    const p = this.engine.pieces.get(id)!;
    v.num.setText(String(p.remaining));
    const tx = this.slotX(slot);
    const ty = this.trayY;
    const sc = this.slotSize() / 128;
    const sx = v.c.x;
    const sy = v.c.y;
    const peak = Math.min(sy, ty) - (source === 'tube' ? 40 : 120);
    const o = { t: 0 };
    this.tweens.add({
      targets: o,
      t: 1,
      duration: dur(source === 'tube' ? 320 : 380),
      ease: 'Quad.easeInOut',
      onUpdate: () => {
        const k = o.t;
        v.c.x = sx + (tx - sx) * k;
        v.c.y = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * peak + k * k * ty;
        v.c.setScale(v.c.scaleX + (sc - v.c.scaleX) * 0.25);
      },
      onComplete: () => {
        v.c.setPosition(tx, ty).setScale(sc).setDepth(32);
        this.tweens.add({ targets: v.c, scaleY: sc * 0.85, scaleX: sc * 1.1, duration: 70, yoyo: true });
        app.audio.play('slot');
      },
    });
  }

  private beeSize(): number {
    return Phaser.Math.Clamp(this.cell * 1.25, 34, 58);
  }

  private onLaunch(bee: Bee): void {
    const target = this.cellPos(bee.cell);
    const side = bee.id % 2 === 0 ? 1 : -1;
    const bend = 70 + (bee.id % 5) * 22;
    const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const m = mid(this.door, target);
    const dx = target.x - this.door.x;
    const dy = target.y - this.door.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    const out = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(this.door.x, this.door.y),
      new Phaser.Math.Vector2(m.x + nx * bend * side, m.y + ny * bend * side),
      new Phaser.Math.Vector2(target.x, target.y),
    );
    const back = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(target.x, target.y),
      new Phaser.Math.Vector2(m.x - nx * bend * 0.7 * side, m.y - ny * bend * 0.7 * side),
      new Phaser.Math.Vector2(this.door.x, this.door.y + 4),
    );
    const s = this.beeSize();
    const img = this.add.image(this.door.x, this.door.y, BEE_FRAMES[0]).setDisplaySize(s, s).setDepth(60);
    this.bees.set(bee.id, { img, carry: null, out, back });
  }

  private onPickup(bee: Bee): void {
    const block = this.blocks[bee.cell];
    const bv = this.bees.get(bee.id);
    if (block) {
      this.blocks[bee.cell] = null;
      block.setDepth(59);
      // o bloco salta um pouco quando a abelha o apanha
      const base = block.scaleX;
      this.tweens.add({ targets: block, scaleX: base * 1.3, scaleY: base * 1.3, duration: 70, yoyo: true });
      if (bv) bv.carry = block;
      else block.destroy();
    }
    // atualiza contadores das pedras
    for (const [cell, lab] of this.stoneLabels) lab.setText(String(this.engine.stoneLeft(cell)));
  }

  private onDeliver(bee: Bee, pieceId: number, remaining: number): void {
    const bv = this.bees.get(bee.id);
    if (bv) {
      bv.img.destroy();
      bv.carry?.destroy();
      this.bees.delete(bee.id);
    }
    const v = this.views.get(pieceId);
    if (v) {
      v.num.setText(String(remaining));
      this.pulse(v);
    }
    // som de entrega com tom a subir com as entregas seguidas
    if (this.realTime - this.lastDeliver < 450) this.deliverStreak++;
    else this.deliverStreak = 0;
    this.lastDeliver = this.realTime;
    if (this.deliverStreak % 2 === 0) app.audio.play('deliver', this.deliverStreak / 2 + this.combo * 3);
  }

  private pulse(v: PieceView): void {
    this.tweens.killTweensOf(v.num);
    v.num.setScale(1.3);
    this.tweens.add({ targets: v.num, scale: 1, duration: dur(160), ease: 'Quad.easeOut' });
  }

  private popView(v: PieceView): void {
    const p = this.engine.pieces.get(v.id);
    const color = p ? Phaser.Display.Color.HexStringToColor(colorHex(this.level.colors[p.color])).color : 0xffffff;
    burst(this, v.c.x, v.c.y, color);
    this.views.delete(v.id);
    this.tweens.add({
      targets: v.c,
      scale: v.c.scale * 1.35,
      alpha: 0,
      duration: dur(220),
      ease: 'Quad.easeOut',
      onComplete: () => v.c.destroy(),
    });
  }

  private onPieceDone(pieceId: number): void {
    const v = this.views.get(pieceId);
    if (v) this.popView(v);
    app.audio.play('pieceDone');
    app.haptics.medium();
    // combo: duas peças a terminar seguidas
    if (this.realTime - this.lastDone < 1600) {
      this.combo++;
      const names = ['game.combo1', 'game.combo2', 'game.combo3', 'game.combo4'];
      const label = t(names[Math.min(this.combo - 1, names.length - 1)]);
      app.audio.play('combo', this.combo);
      const ct = txt(this, L.W / 2, this.trayY - 120, label, 64 + Math.min(this.combo, 4) * 6, {
        color: ['#F2AB27', '#F2059F', '#0293F2', '#54C143'][Math.min(this.combo - 1, 3)],
      }).setDepth(200);
      ct.setScale(0.3);
      this.tweens.add({ targets: ct, scale: 1, duration: dur(260), ease: 'Back.easeOut' });
      this.tweens.add({ targets: ct, y: ct.y - 70, alpha: 0, delay: dur(700), duration: dur(400), onComplete: () => ct.destroy() });
    } else this.combo = 0;
    this.lastDone = this.realTime;
  }

  private onStoneBreak(cell: number): void {
    const img = this.blocks[cell];
    const lab = this.stoneLabels.get(cell);
    lab?.destroy();
    this.stoneLabels.delete(cell);
    const { x, y } = this.cellPos(cell);
    burst(this, x, y, 0x5b4a3a, 10, 12);
    if (img) {
      img.setTexture(`block_${this.level.colors[this.engine.color[cell]]}`);
      this.tweens.add({ targets: img, angle: { from: -15, to: 0 }, duration: dur(260), ease: 'Back.easeOut' });
    }
  }

  private onFlowerOpen(cell: number): void {
    const img = this.blocks[cell];
    this.flowerDots.get(cell)?.destroy();
    this.flowerDots.delete(cell);
    const { x, y } = this.cellPos(cell);
    burst(this, x, y, 0xf7a8cf, 10, 12);
    if (img) {
      img.setTexture(`block_${this.level.colors[this.engine.color[cell]]}`);
      const sc = img.scaleX;
      img.setScale(sc * 0.3);
      this.tweens.add({ targets: img, scaleX: sc, scaleY: sc, duration: dur(320), ease: 'Back.easeOut' });
    }
  }

  private onMagnet(color: number, cells: number[]): void {
    const hex = Phaser.Display.Color.HexStringToColor(colorHex(this.level.colors[color])).color;
    cells.forEach((cell, k) => {
      const img = this.blocks[cell];
      this.blocks[cell] = null;
      if (!img) return;
      img.setDepth(70);
      const from = { x: img.x, y: img.y };
      const ctrl = { x: (from.x + this.door.x) / 2 + Phaser.Math.Between(-140, 140), y: Math.min(from.y, this.door.y) - 60 };
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(from.x, from.y),
        new Phaser.Math.Vector2(ctrl.x, ctrl.y),
        new Phaser.Math.Vector2(this.door.x, this.door.y),
      );
      const o = { t: 0 };
      this.tweens.add({
        targets: o,
        t: 1,
        delay: dur(k * 12),
        duration: dur(520),
        ease: 'Quad.easeIn',
        onUpdate: () => {
          const p = curve.getPoint(o.t);
          img.setPosition(p.x, p.y);
          img.setScale(img.scaleX * 0.985);
        },
        onComplete: () => img.destroy(),
      });
    });
    burst(this, this.door.x, this.door.y, hex, 24, 70);
    app.audio.play('chest');
    for (const [cell, lab] of this.stoneLabels) lab.setText(String(this.engine.stoneLeft(cell)));
  }

  // ------------------------------------------------------------------ ciclo

  override update(_time: number, delta: number): void {
    // tempo real (o Phaser suaviza o delta quando os fps descem, o que abrandaria o jogo)
    const dt = Math.min(this.game.loop.rawDelta || delta, 100);
    this.realTime += dt;
    const running = this.state === 'play' && !modalOpen(this) && !app.adShowing && this.tutorialStep !== 'block';
    if (running) {
      const fast = consumeSpeed(app.save, dt);
      const events = this.engine.advance(dt * (fast ? 2 : 1));
      this.handleEvents(events);
      this.speedSaveTimer += dt;
      if (this.speedSaveTimer > 1000) {
        this.speedSaveTimer = 0;
        this.refreshSpeed();
        if (app.save.speed.msLeft > 0 || fast) app.persist();
      }
      if (this.engine.isWon()) this.onWin();
      else if (this.engine.isBlocked()) this.onBlocked();
    }
    this.drawBees();
    this.drawLinks();
  }

  private drawBees(): void {
    const e = this.engine;
    const frame = BEE_FRAMES[Math.floor(e.time / 45) % BEE_FRAMES.length];
    for (const [id, bv] of this.bees) {
      const b = e.bees.get(id);
      if (!b) continue;
      let p: Phaser.Math.Vector2;
      let tan: Phaser.Math.Vector2;
      if (e.time < b.t1) {
        const k = Phaser.Math.Clamp((e.time - b.t0) / (b.t1 - b.t0), 0, 1);
        p = bv.out.getPoint(k);
        tan = bv.out.getTangent(k);
      } else {
        const k = Phaser.Math.Clamp((e.time - b.t1) / (b.t2 - b.t1), 0, 1);
        p = bv.back.getPoint(k);
        tan = bv.back.getTangent(k);
      }
      const bob = Math.sin(e.time / 90 + id) * 3;
      bv.img.setPosition(p.x, p.y + bob);
      bv.img.setTexture(frame);
      bv.img.setFlipX(tan.x < 0);
      bv.img.setRotation(Phaser.Math.Clamp(tan.y * 0.35, -0.35, 0.35) * (tan.x < 0 ? -1 : 1));
      if (bv.carry) {
        const cs = Math.max(14, this.cell * 0.62);
        bv.carry.setDisplaySize(cs, cs);
        bv.carry.setPosition(p.x, p.y + bob + this.beeSize() * 0.38);
      }
    }
  }

  // ------------------------------------------------------------------ reforços

  private buildBoosters(): void {
    const y = this.boostersY;
    BOOSTERS.forEach((id, i) => {
      const x = L.W / 2 + (i - 1.5) * 168;
      const btn = new Button(this, x, y, { w: 140, h: 104, color: '#FFFFFF', icon: `ic_${id}`, iconSize: 78, onClick: () => this.onBooster(id) });
      btn.setDepth(80);
      const b = badge(this, x + 56, y - 40, '0').setDepth(81);
      this.tweens.killTweensOf(b);
      this.boosterBtns.set(id, { btn, badge: b });
    });
    this.refreshBoosters();
  }

  refreshBoosters(): void {
    for (const [id, { btn, badge: b }] of this.boosterBtns) {
      const unlocked = isBoosterUnlocked(app.save, id);
      const n = app.save.boosters[id];
      btn.icon?.setAlpha(unlocked ? 1 : 0.35);
      b.removeAll(true);
      if (!unlocked) {
        b.add(this.add.image(0, 0, 'ic_lock').setDisplaySize(46, 46));
        b.add(txt(this, -56, 70, t('boosters.lockedAt', { n: config().boosters.unlockLevel[id] }), 20, { color: INK, stroke: false }));
      } else {
        const g = this.add.graphics();
        g.fillStyle(0x2e2412, 1).fillCircle(0, 2, 22);
        g.fillStyle(n > 0 ? 0x0293f2 : 0x54c143, 1).fillCircle(0, 0, 20);
        b.add(g);
        if (n > 0) b.add(txt(this, 0, -2, String(n), 26, { stroke: false }));
        else b.add(this.add.image(0, 0, 'ic_plus').setDisplaySize(30, 30));
      }
      btn.bg.setTint(this.mode !== null && ((this.mode === 'tweezers' && id === 'tweezers') || (this.mode === 'magnet' && id === 'magnet')) ? 0xbfe6ff : 0xffffff);
    }
  }

  private onBooster(id: BoosterId): void {
    if (this.state !== 'play') return;
    if (!isBoosterUnlocked(app.save, id)) {
      toast(this, t('common.locked', { n: config().boosters.unlockLevel[id] }), this.trayY - 40);
      return;
    }
    if (this.mode) {
      const same = (this.mode === 'tweezers' && id === 'tweezers') || (this.mode === 'magnet' && id === 'magnet');
      this.setMode(null);
      if (same) return;
    }
    if (app.save.boosters[id] <= 0) {
      boosterBuyModal(this, id, () => this.refreshBoosters());
      return;
    }
    const e = this.engine;
    if (id === 'slot') {
      if (e.capacity >= 6) {
        toast(this, t('boosters.maxSlots'), this.trayY - 40);
        return;
      }
      useBooster(app.save, 'slot');
      e.addSlot();
      this.handleEvents(e.flush());
      this.afterBoosterUse(id);
    } else if (id === 'shuffle') {
      useBooster(app.save, 'shuffle');
      smartShuffle(e, this.level);
      this.handleEvents(e.flush());
      this.afterBoosterUse(id);
    } else if (id === 'tweezers') {
      if (e.freeSlots() === 0) {
        toast(this, t('game.noSpace'), this.trayY - 40);
        return;
      }
      this.setMode('tweezers');
      toast(this, t('game.pickPiece'), this.trayY - 40);
    } else if (id === 'magnet') {
      this.openMagnetChooser();
    }
  }

  private afterBoosterUse(id: BoosterId): void {
    trackHive(app.save, 'booster', 1);
    analytics.log('booster_use', { booster: id, level: this.level.id });
    app.persist();
    this.refreshBoosters();
  }

  private setMode(m: null | 'tweezers' | 'magnet'): void {
    this.mode = m;
    this.magnetChips?.destroy();
    this.magnetChips = null;
    // na pinça, todas as peças visíveis ficam ativas
    for (const v of this.views.values()) {
      if (this.engine.slotOf(v.id) >= 0) continue;
      if (m === 'tweezers') v.c.setAlpha(1);
    }
    if (!m) this.renderColumns(true);
    this.refreshBoosters();
  }

  private openMagnetChooser(): void {
    const e = this.engine;
    const colors = this.level.colors.map((_, c) => c).filter((c) => e.countReachable(c) > 0);
    if (colors.length === 0) {
      toast(this, t('game.noReach'), this.trayY - 40);
      return;
    }
    this.setMode('magnet');
    const c = this.add.container(L.W / 2, this.boostersY - 110).setDepth(300);
    const w = Math.min(690, colors.length * 86 + 40);
    const g = this.add.graphics();
    g.fillStyle(0x2e2412, 0.9).fillRoundedRect(-w / 2, -70, w, 140, 30);
    c.add(g);
    c.add(txt(this, 0, -48, t('game.pickColor'), 26));
    colors.forEach((col, i) => {
      const x = (i - (colors.length - 1) / 2) * 86;
      const chip = this.add.image(x, 18, `piece_${this.level.colors[col]}`).setDisplaySize(70, 70).setInteractive({ useHandCursor: true });
      chip.on('pointerdown', () => {
        useBooster(app.save, 'magnet');
        this.afterBoosterUse('magnet');
        this.setMode(null);
        e.magnet(col);
        this.handleEvents(e.flush());
        this.renderColumns(true);
      });
      c.add(chip);
    });
    c.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: dur(180), ease: 'Back.easeOut' });
    this.magnetChips = c;
  }

  /** "+1 ranhura" vindo do ecrã "Sem espaço" (vídeo, moedas ou Passe). */
  continueWithSlot(source: 'video' | 'coins' | 'pass'): void {
    if (source === 'video') this.usedVideoSlot = true;
    if (source === 'pass') this.passReviveUsed = true;
    this.engine.addSlot();
    this.handleEvents(this.engine.flush());
    this.state = 'play';
  }

  canVideoSlot(): boolean {
    return !this.usedVideoSlot && this.engine.capacity < MAX_SLOTS;
  }
  canPassRevive(): boolean {
    return !this.passReviveUsed && this.engine.capacity < MAX_SLOTS;
  }
  canAddSlot(): boolean {
    return this.engine.capacity < MAX_SLOTS;
  }
  traySnapshot(): RPiece[] {
    return this.engine.slots.map((id) => this.engine.pieces.get(id)!).filter(Boolean);
  }

  // ------------------------------------------------------------------ fim do nível

  private onWin(): void {
    this.state = 'won';
    this.setMode(null);
    const firstTry = this.hadAttempts === 0;
    const blocks = this.engine.picks;
    const coins = recordWin(app.save, this.level.difficulty, blocks);
    eventsOnLevelEnd(app.save, true, firstTry, this.level.difficulty, blocks, app.now());
    app.persist();
    void app.saveService.flush();
    analytics.log('level_win', { level: this.level.id });
    app.audio.play('win');
    const bh = this.cell * this.level.h;
    flash(this, L.W / 2, this.by + bh / 2, this.cell * this.level.w + 30, bh + 30);
    confetti(this, L.W / 2, this.by + bh * 0.6, 90);
    this.celebrateBees();
    this.time.delayedCall(dur(1500), () => victoryModal(this, coins));
  }

  private celebrateBees(): void {
    const chars = Object.keys(BEE_COLORS);
    for (let i = 0; i < 6; i++) {
      const img = this.add.image(this.door.x, this.door.y, 'bee_mel_celebrate').setDisplaySize(90, 90).setDepth(90);
      if (i > 0) img.setTexture(`bee_${chars[i % chars.length]}_celebrate`);
      const tx = 120 + Math.random() * (L.W - 240);
      const ty = this.by + 80 + Math.random() * 300;
      this.tweens.add({ targets: img, x: tx, y: ty, duration: dur(700), ease: 'Back.easeOut', delay: i * 80 });
      this.tweens.add({ targets: img, y: ty - 30, angle: 10, duration: 300, yoyo: true, repeat: -1, delay: 700 + i * 80, ease: 'Sine.easeInOut' });
    }
  }

  private onBlocked(): void {
    this.state = 'blocked';
    this.setMode(null);
    app.audio.play('error');
    noSpaceModal(this);
  }

  /** Desistir (fechar "Sem espaço" ou sair pela pausa): perde 1 vida. */
  failLevel(showModal = true): void {
    if (this.state === 'over' || this.state === 'won') return;
    this.state = 'over';
    const blocks = this.engine.picks;
    const hadInfinite = app.save.infiniteLivesUntil > app.now();
    recordLoss(app.save, app.now(), blocks);
    eventsOnLevelEnd(app.save, false, false, this.level.difficulty, blocks, app.now());
    app.persist();
    void app.saveService.flush();
    analytics.log('level_fail', { level: this.level.id });
    app.audio.play('lose');
    if (showModal) failModal(this, hadInfinite);
  }

  quitToHome(): void {
    this.go('Home');
  }

  // ------------------------------------------------------------------ início / tutoriais

  private async startIntroFlow(): Promise<void> {
    // 1) reforços novos (3 grátis + explicação)
    for (const id of introduceBoosters(app.save)) {
      app.persist();
      this.refreshBoosters();
      await boosterIntroModal(this, id);
      await this.pointAt(this.boosterBtns.get(id)!.btn, '');
    }
    // 2) obstáculos novos
    for (const [key, has] of OBSTACLE_TUTORIALS) {
      if (has(this.level) && !app.save.seen[`obs_${key}`]) {
        app.save.seen[`obs_${key}`] = true;
        app.persist();
        await obstacleModal(this, key);
      }
    }
    this.state = 'play';
    // 3) tutorial dos primeiros níveis
    if (this.level.id === 1 && !app.save.seen.tut_tap) this.startTapTutorial();
    else if (this.level.id === 2 && !app.save.seen.tut_tray) {
      app.save.seen.tut_tray = true;
      app.persist();
      this.tutorialStep = 'block';
      void this.pointAt({ x: L.W / 2, y: this.trayY, w: L.W - 30, h: 150 }, t('tutorial.tray')).then(() => (this.tutorialStep = ''));
    }
  }

  private startTapTutorial(): void {
    const e = this.engine;
    const col = e.legalTaps().find((c) => e.countReachable(e.pieces.get(e.columns[c][0])!.color) > 0) ?? 0;
    const x = this.colX[col];
    const y = this.rowY[0];
    this.tutorialStep = 'tap';
    this.removeTutorial = tutorialHand(this, x, y, { x, y, w: 140, h: 140 }, t('tutorial.tap'));
  }

  private finishTapTutorial(): void {
    this.tutorialStep = '';
    this.removeTutorial?.();
    this.removeTutorial = null;
    app.save.seen.tut_tap = true;
    app.persist();
    this.time.delayedCall(400, () => toast(this, t('tutorial.bees'), this.by + 60));
  }

  /** Aponta para algo e espera um toque para continuar. */
  private pointAt(target: { x: number; y: number; w?: number; h?: number }, text: string): Promise<void> {
    return new Promise((resolve) => {
      const w = target.w ?? 160;
      const h = target.h ?? 130;
      const remove = tutorialHand(this, target.x, target.y, { x: target.x, y: target.y, w, h }, text || undefined);
      const zone = this.add.zone(0, 0, L.W, L.H).setOrigin(0, 0).setInteractive().setDepth(2003);
      this.time.delayedCall(350, () =>
        zone.once('pointerdown', () => {
          remove();
          zone.destroy();
          resolve();
        }),
      );
    });
  }
}
