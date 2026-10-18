// Ecrã inicial (secção 6.1): jardim animado, a Mel a segurar o cubo do nível, eventos,
// contadores, botão Jogar com a dificuldade e barra de baixo.
import Phaser from 'phaser';
import { app } from '../app';
import { avatarTexture, gardenTexture } from '../art/textures';
import { formatDuration, t } from '../i18n';
import { config } from '../meta/config';
import { canPlay } from '../meta/economy';
import {
  dailyAvailable,
  eventUnlocked,
  hiveStageComplete,
  nextMidnight,
  passClaimable,
  passEnds,
  raceState,
  sunflowerClaimable,
  sunflowerEnds,
  treasureClaimableFree,
  treasureEnds,
  type EventId,
} from '../meta/events';
import { levelDifficulty, loadLevel } from '../levels';
import { Button, COLORS, iconButton } from '../ui/Button';
import { BaseScene, dur, L, txt } from '../ui/core';
import { pollen } from '../ui/fx';
import { hiveView } from '../ui/hive';
import { closeTopModal, modalOpen } from '../ui/Modal';
import { badge, CoinCounter, LivesCounter } from '../ui/widgets';
import { dailyModal, hiveModal, passModal, raceModal, sunflowerModal, treasureModal } from './eventModals';
import { settingsModal, shopModal, starterPackModal } from './menus';
import { comingSoonModal, noLivesModal } from './modals';

interface EventIcon {
  id: EventId;
  icon: string;
  open: (scene: Phaser.Scene, onChange: () => void) => void;
  ends: () => number | null;
  claimable: () => boolean;
}

let dailyShownThisSession = false;

export class HomeScene extends BaseScene {
  private eventObjs: Phaser.GameObjects.Container[] = [];
  private playTag!: Phaser.GameObjects.Text;
  private bee!: Phaser.GameObjects.Image;
  private starting = false;

  constructor() {
    super('Home');
  }

  override create(): void {
    super.create();
    this.starting = false;
    this.eventObjs = [];
    this.add.image(0, 0, gardenTexture(this, L.W, L.H)).setOrigin(0, 0);
    this.clouds();
    pollen(this, 4);
    // a colmeia do jogador fica entre a Mel e o botão Jogar (mais pequena em ecrãs baixos)
    const small = L.H < 1400;
    this.add.existing(hiveView(this, 120, L.H - (small ? 470 : 560), app.save.hive.stage, small ? 0.46 : 0.6));
    this.heroBee();
    this.topBar();
    this.buildEvents();
    this.playButton();
    this.bottomBar();
    this.fadeIn();
    const off = app.onChange(() => this.refreshEvents());
    const ev = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refreshEvents() });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      ev.remove();
      app.backHandler = null;
    });
    app.backHandler = () => closeTopModal(this);
    this.time.delayedCall(dur(450), () => this.autoPopups());
  }

  private clouds(): void {
    for (let i = 0; i < 4; i++) {
      const y = 140 + i * 110 + Math.random() * 40;
      const c = this.add.image(Math.random() * L.W, y, 'cloud').setAlpha(0.85).setScale(0.6 + Math.random() * 0.6);
      const speed = 40000 + Math.random() * 40000;
      this.tweens.add({
        targets: c,
        x: { from: -150, to: L.W + 150 },
        duration: speed,
        repeat: -1,
        delay: -Math.random() * speed,
      });
    }
    // folhas a mexer no relvado
    for (let i = 0; i < 6; i++) {
      const leaf = this.add.image(60 + i * 120, L.H * 0.78 + (i % 2) * 40, 'leaf').setScale(1.2).setAngle(-20);
      this.tweens.add({ targets: leaf, angle: 15, duration: 1400 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private heroBee(): void {
    const cx = L.W / 2 + 60;
    const cy = L.H * 0.44;
    const c = this.add.container(cx, cy);
    this.bee = this.add.image(0, -90, 'bee_mel_happy').setDisplaySize(320, 320);
    const cube = this.add.image(0, 70, 'piece_sol').setDisplaySize(230, 230);
    const label = txt(this, 0, 60, t('home.levelCube', { n: app.save.level }), 44);
    if (label.width > 200) label.setScale(200 / label.width);
    c.add([this.bee, cube, label]);
    // respirar, balançar, pestanejar
    this.tweens.add({ targets: this.bee, scaleY: this.bee.scaleY * 1.035, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: c, angle: { from: -2.5, to: 2.5 }, y: cy - 10, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const blink = () => {
      this.bee.setTexture('bee_mel_blink');
      this.time.delayedCall(130, () => this.bee.setTexture('bee_mel_happy'));
      this.time.delayedCall(2500 + Math.random() * 3000, blink);
    };
    this.time.delayedCall(2000, blink);
  }

  private topBar(): void {
    const av = this.add.image(62, 70, avatarTexture(this)).setDisplaySize(100, 100);
    av.setInteractive().on('pointerdown', () => this.tweens.add({ targets: av, angle: 360, duration: 600 }));
    new CoinCounter(this, 245, 70, () => shopModal(this));
    new LivesCounter(this, 480, 70, () => noLivesModal(this));
    iconButton(this, 656, 70, 'ic_gear', COLORS.blue, () => settingsModal(this, () => this.scene.restart()), 84);
  }

  private eventList(): EventIcon[] {
    const now = () => app.now();
    const s = app.save;
    const refresh = () => this.refreshEvents();
    return [
      { id: 'daily', icon: 'ic_gift', open: (sc) => dailyModal(sc, refresh), ends: () => nextMidnight(now()), claimable: () => dailyAvailable(s, now()) },
      { id: 'treasure', icon: 'ic_crown', open: (sc) => treasureModal(sc, refresh), ends: () => treasureEnds(now()), claimable: () => treasureClaimableFree(s, now()) },
      { id: 'pass', icon: 'ic_ticket', open: (sc) => passModal(sc, refresh), ends: () => passEnds(now()), claimable: () => passClaimable(s, now()) },
      {
        id: 'race',
        icon: 'ic_race',
        open: (sc) => raceModal(sc, refresh),
        ends: () => (raceState(s, now()) === 'running' ? s.race.endsAt : null),
        claimable: () => ['won', 'lost', 'expired', 'idle'].includes(raceState(s, now())),
      },
      { id: 'sunflower', icon: 'ic_sunflower', open: (sc) => sunflowerModal(sc, refresh), ends: () => sunflowerEnds(now()), claimable: () => sunflowerClaimable(s, now()).length > 0 },
      { id: 'hive', icon: 'ic_hive', open: (sc) => hiveModal(sc, refresh), ends: () => null, claimable: () => hiveStageComplete(s) },
    ];
  }

  private buildEvents(): void {
    this.eventObjs.forEach((o) => o.destroy());
    this.eventObjs = [];
    const list = this.eventList().filter((e) => eventUnlocked(app.save, e.id));
    list.forEach((e, i) => {
      const left = i < 3;
      const x = left ? 74 : L.W - 74;
      const y = 220 + (i % 3) * 170;
      const c = this.add.container(x, y);
      c.add(new Button(this, 0, 0, { round: true, w: 108, color: '#FFF3D6', icon: e.icon, iconSize: 74, onClick: () => e.open(this, () => this.refreshEvents()) }));
      c.add(txt(this, 0, 62, t(`events.${e.id}`), 22));
      const timer = txt(this, 0, 88, '', 20, { stroke: true });
      timer.setName('timer');
      c.add(timer);
      const b = badge(this, 42, -40);
      b.setName('badge');
      c.add(b);
      c.setData('ev', e);
      this.eventObjs.push(c);
    });
    this.refreshEvents();
  }

  private refreshEvents(): void {
    for (const c of this.eventObjs) {
      const e = c.getData('ev') as EventIcon;
      const ends = e.ends();
      (c.getByName('timer') as Phaser.GameObjects.Text).setText(ends ? formatDuration(ends - app.now()) : '');
      (c.getByName('badge') as Phaser.GameObjects.Container).setVisible(e.claimable());
    }
  }

  private playButton(): void {
    const y = L.H - 300;
    const btn = new Button(this, L.W / 2, y, { w: 460, h: 140, color: COLORS.green, label: t('home.play'), fontSize: 66, onClick: () => void this.play() });
    this.tweens.add({ targets: btn, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.playTag = txt(this, L.W / 2, y - 92, '', 30);
    void levelDifficulty(app.save.level).then((d) => {
      if (!this.playTag.active) return;
      if (d === 'normal') return;
      this.playTag.setText(t(`difficulty.${d}`)).setColor(d === 'hard' ? '#F2AB27' : '#E8384F');
    });
  }

  private async play(): Promise<void> {
    if (this.starting || modalOpen(this)) return;
    if (!canPlay(app.save, app.now())) {
      noLivesModal(this, () => void this.play());
      return;
    }
    this.starting = true;
    try {
      const level = await loadLevel(app.save.level);
      this.go('Game', { level });
    } catch (e) {
      console.error(e);
      this.starting = false;
    }
  }

  private bottomBar(): void {
    const y = L.H - 92;
    const g = this.add.graphics();
    g.fillStyle(0x2e2412, 0.3).fillRoundedRect(8, y - 72, L.W - 16, 156, 40);
    g.fillStyle(0xfffdf6, 1).fillRoundedRect(8, y - 78, L.W - 16, 156, 40);
    g.lineStyle(5, 0x2e2412).strokeRoundedRect(8, y - 78, L.W - 16, 156, 40);
    const items: [string, string, () => void][] = [
      ['ic_shop', t('home.shop'), () => shopModal(this)],
      ['ic_ranking', t('home.ranking'), () => comingSoonModal(this, t('home.ranking'), 'ic_ranking')],
      ['ic_home', t('home.home'), () => {}],
      ['ic_team', t('home.team'), () => comingSoonModal(this, t('home.team'), 'ic_team')],
      ['ic_collection', t('home.collection'), () => comingSoonModal(this, t('home.collection'), 'ic_collection')],
    ];
    items.forEach(([icon, label, fn], i) => {
      const x = L.W / 2 + (i - 2) * 140;
      const home = i === 2;
      if (home) {
        const hl = this.add.graphics();
        hl.fillStyle(0xf2ab27, 1).fillRoundedRect(x - 66, y - 70, 132, 140, 30);
        hl.lineStyle(4, 0x2e2412).strokeRoundedRect(x - 66, y - 70, 132, 140, 30);
      }
      const ic = this.add.image(x, y - 14 - (home ? 8 : 0), icon).setDisplaySize(home ? 92 : 76, home ? 92 : 76);
      ic.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        app.audio.play('button');
        this.tweens.add({ targets: ic, scaleX: ic.scaleX * 1.1, scaleY: ic.scaleY * 0.88, duration: 70, yoyo: true });
        fn();
      });
      txt(this, x, y + 46, label, home ? 24 : 20);
    });
  }

  private autoPopups(): void {
    const s = app.save;
    if (s.level >= config().starterPackLevel && !s.purchases.starterPackSeen && !s.purchases.starterPackBought) {
      starterPackModal(this);
      return;
    }
    if (!dailyShownThisSession && eventUnlocked(s, 'daily') && dailyAvailable(s, app.now())) {
      dailyShownThisSession = true;
      dailyModal(this, () => this.refreshEvents());
    }
  }
}
