// Janelas do jogo: vitória, nível falhado, sem espaço, sem vidas, pausa, acelerar 2x,
// reforços, tutoriais de obstáculos, regras e prémios.
import Phaser from 'phaser';
import { app } from '../app';
import { boxTexture } from '../art/textures';
import { formatDuration, t } from '../i18n';
import { config, type BoosterId } from '../meta/config';
import {
  addCoins,
  addLives,
  boosterVideosLeft,
  buyBooster,
  canPlay,
  grantBoosterFromVideo,
  livesInfo,
  MINUTE,
  recordInterstitialShown,
  recordLongSpeedAd,
  recordShortSpeedAd,
  shortAdsProgress,
  shouldShowInterstitial,
  speedActivationsLeft,
  maxSpeedMs,
  spendCoins,
  type Reward,
} from '../meta/economy';
import { eventUnlocked, isPassPremium } from '../meta/events';
import { analytics } from '../services/analytics';
import { loadLevel } from '../levels';
import { Button, COLORS } from '../ui/Button';
import { dur, INK, L, txt } from '../ui/core';
import { burst, confetti, flyIcons } from '../ui/fx';
import { Modal } from '../ui/Modal';
import { CoinCounter, rewardRow, toast } from '../ui/widgets';
import { passModal } from './eventModals';
import type { GameScene } from './GameScene';
import { shopModal } from './menus';

function bodyText(scene: Phaser.Scene, y: number, s: string, size = 30, wrap = 520): Phaser.GameObjects.Text {
  return txt(scene, 0, y, s, size, { body: true, wrap, lineSpacing: 6 });
}

// ------------------------------------------------------------------ vitória

export function victoryModal(scene: GameScene, coins: number): void {
  const counter = new CoinCounter(scene, L.W / 2, 70).setDepth(1500);
  const m = new Modal(scene, { w: 620, h: 780, title: t('win.title'), ribbon: COLORS.green, onClose: () => finish() });
  const bee = scene.add.image(0, -200, 'bee_mel_celebrate').setDisplaySize(280, 280);
  m.addContent(bee);
  scene.tweens.add({ targets: bee, y: -215, angle: 6, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const coinIcon = scene.add.image(-60, -6, 'ic_coin').setDisplaySize(96, 96);
  m.addContent(coinIcon);
  const amount = txt(scene, 40, -10, `+${coins}`, 64);
  m.addContent(amount);
  let total = coins;
  let done = false;
  const x2 = new Button(scene, 0, 130, {
    w: 420,
    h: 100,
    color: COLORS.blue,
    icon: 'ic_video',
    label: t('win.double'),
    onClick: async () => {
      x2.setEnabled(false);
      if (await app.rewarded('long', 'win_x2')) {
        addCoins(app.save, coins);
        total += coins;
        amount.setText(`+${total}`);
        app.persist();
        scene.tweens.add({ targets: amount, scale: 1.3, duration: 120, yoyo: true });
        x2.setVisible(false);
      } else {
        toast(scene, t('common.noVideo'));
        x2.setEnabled(true);
      }
    },
  });
  m.addContent(x2);
  m.addContent(
    new Button(scene, 0, 260, {
      w: 420,
      h: 104,
      color: COLORS.green,
      label: t('win.next'),
      onClick: () => finish(),
    }),
  );
  function finish(): void {
    if (done) return;
    done = true;
    const from = coinIcon.getWorldTransformMatrix();
    flyIcons(scene, 'ic_coin', { x: from.tx, y: from.ty }, counter.coinWorldPos(), Math.ceil(total / 10));
    counter.refresh();
    scene.time.delayedCall(dur(1300), async () => {
      if (shouldShowInterstitial(app.save, app.now(), app.noAds())) {
        await app.interstitial();
        recordInterstitialShown(app.save, app.now());
        app.persist();
      }
      scene.quitToHome();
    });
  }
}

// ------------------------------------------------------------------ nível falhado

export function failModal(scene: GameScene, hadInfinite: boolean): void {
  const m = new Modal(scene, { w: 620, h: 700, title: t('fail.title'), ribbon: COLORS.red, onClose: () => scene.quitToHome() });
  m.addContent(scene.add.image(0, -150, 'bee_mel_sad').setDisplaySize(260, 260));
  m.addContent(bodyText(scene, 30, hadInfinite ? t('fail.infinite') : t('fail.lifeLost'), 32));
  if (!hadInfinite) {
    const heart = scene.add.image(0, 100, 'ic_heart').setDisplaySize(80, 80);
    m.addContent(heart);
    m.addContent(txt(scene, 0, 96, '-1', 30));
  }
  m.addContent(new Button(scene, -140, 230, { w: 250, h: 100, color: COLORS.blue, label: t('common.home'), onClick: () => scene.quitToHome() }));
  m.addContent(
    new Button(scene, 140, 230, {
      w: 250,
      h: 100,
      color: COLORS.green,
      label: t('common.retry'),
      onClick: () => {
        if (!canPlay(app.save, app.now())) {
          noLivesModal(scene, () => void restartLevel(scene));
          return;
        }
        m.close(true);
        void restartLevel(scene);
      },
    }),
  );
}

async function restartLevel(scene: GameScene): Promise<void> {
  const level = await loadLevel(scene.level.id);
  scene.go('Game', { level });
}

// ------------------------------------------------------------------ sem espaço

export function noSpaceModal(scene: GameScene): void {
  const premium = isPassPremium(app.save, app.now());
  const passOn = eventUnlocked(app.save, 'pass');
  const m = new Modal(scene, { w: 640, h: 900, title: t('nospace.title'), ribbon: COLORS.red, onClose: () => scene.failLevel() });
  m.addContent(bodyText(scene, -300, t('nospace.text'), 28));
  // bandeja cheia em miniatura
  const tray = scene.traySnapshot();
  const step = Math.min(96, 560 / Math.max(1, tray.length));
  tray.forEach((p, i) => {
    const x = (i - (tray.length - 1) / 2) * step;
    m.addContent(scene.add.image(x, -200, `piece_${scene.level.colors[p.color]}`).setDisplaySize(step - 10, step - 10));
    m.addContent(txt(scene, x, -203, String(p.remaining), 30));
  });
  let y = -70;
  if (scene.canVideoSlot()) {
    m.addContent(
      new Button(scene, 0, y, {
        w: 520,
        h: 100,
        color: COLORS.blue,
        icon: 'ic_video',
        label: t('nospace.video'),
        onClick: async () => {
          if (await app.rewarded('long', 'nospace_slot')) {
            m.close(true);
            scene.continueWithSlot('video');
          } else toast(scene, t('common.noVideo'));
        },
      }),
    );
    y += 125;
  }
  if (scene.canAddSlot()) {
    const cost = config().continueCost;
    const b = new Button(scene, 0, y, {
      w: 520,
      h: 100,
      color: COLORS.honey,
      icon: 'ic_coin',
      label: `${t('nospace.continue')}  ${cost}`,
      onClick: () => {
        if (!spendCoins(app.save, cost)) {
          toast(scene, t('common.notEnoughCoins'));
          return;
        }
        app.persist();
        m.close(true);
        scene.continueWithSlot('coins');
      },
    });
    m.addContent(b);
    y += 125;
  }
  if (passOn && scene.canPassRevive()) {
    if (premium) {
      m.addContent(
        new Button(scene, 0, y, {
          w: 520,
          h: 100,
          color: COLORS.purple,
          icon: 'ic_crown',
          label: t('nospace.passFree'),
          onClick: () => {
            m.close(true);
            scene.continueWithSlot('pass');
          },
        }),
      );
    } else {
      // banner do Passe
      const banner = new Button(scene, 0, y, {
        w: 520,
        h: 90,
        color: COLORS.purple,
        icon: 'ic_crown',
        label: t('nospace.pass'),
        fontSize: 30,
        onClick: () => passModal(scene),
      });
      m.addContent(banner);
    }
  }
  m.addContent(
    new Button(scene, 0, 360, {
      w: 300,
      h: 84,
      color: COLORS.grey,
      label: t('nospace.giveUp'),
      fontSize: 30,
      onClick: () => m.close(),
    }),
  );
}

// ------------------------------------------------------------------ sem vidas

export function noLivesModal(scene: Phaser.Scene, onLife?: () => void): void {
  const m = new Modal(scene, { w: 600, h: 680, title: t('nolives.title'), ribbon: COLORS.red });
  m.addContent(scene.add.image(0, -170, 'ic_heart').setDisplaySize(200, 200));
  const n = txt(scene, 0, -175, '0', 70);
  m.addContent(n);
  m.addContent(bodyText(scene, -20, t('nolives.text'), 28));
  const next = txt(scene, 0, 60, '', 34, { color: INK, stroke: false });
  m.addContent(next);
  const tick = () => {
    const li = livesInfo(app.save, app.now());
    n.setText(String(li.lives));
    next.setText(li.full ? t('common.full') : t('nolives.next', { time: formatDuration(li.nextIn) }));
    if (li.lives > 0 || li.infinite > 0) {
      timer.remove();
      m.close(true);
      onLife?.();
    }
  };
  const timer = scene.time.addEvent({ delay: 500, loop: true, callback: tick });
  m.once(Phaser.GameObjects.Events.DESTROY, () => timer.remove());
  tick();
  m.addContent(
    new Button(scene, 0, 190, {
      w: 480,
      h: 100,
      color: COLORS.blue,
      icon: 'ic_video',
      label: t('nolives.video'),
      onClick: async () => {
        if (await app.rewarded('long', 'nolives_life')) {
          addLives(app.save, 1, app.now());
          app.persist();
          tick();
        } else toast(scene, t('common.noVideo'));
      },
    }),
  );
}

// ------------------------------------------------------------------ pausa

export function pauseModal(scene: GameScene): void {
  const m = new Modal(scene, { w: 600, h: 720, title: t('game.pause'), ribbon: COLORS.blue });
  m.addContent(new Button(scene, 0, -170, { w: 420, h: 104, color: COLORS.green, label: t('game.resume'), onClick: () => m.close() }));
  const snd = new Button(scene, -110, -30, {
    round: true,
    w: 110,
    color: app.save.settings.sound ? COLORS.blue : COLORS.grey,
    icon: 'ic_sound',
    onClick: () => {
      app.save.settings.sound = !app.save.settings.sound;
      app.applySettings();
      app.persist();
      m.close(true);
      pauseModal(scene);
    },
  });
  const mus = new Button(scene, 110, -30, {
    round: true,
    w: 110,
    color: app.save.settings.music ? COLORS.blue : COLORS.grey,
    icon: 'ic_music',
    onClick: () => {
      app.save.settings.music = !app.save.settings.music;
      app.applySettings();
      app.persist();
      m.close(true);
      pauseModal(scene);
    },
  });
  m.addContent(snd);
  m.addContent(mus);
  m.addContent(bodyText(scene, 110, t('game.quitWarn'), 26));
  m.addContent(
    new Button(scene, 0, 220, {
      w: 420,
      h: 96,
      color: COLORS.red,
      label: t('game.quit'),
      onClick: () => {
        m.close(true);
        scene.failLevel(false);
        scene.quitToHome();
      },
    }),
  );
}

// ------------------------------------------------------------------ acelerar 2x (anúncios)

export function speedModal(scene: Phaser.Scene, onChange?: () => void): void {
  const m = new Modal(scene, { w: 640, h: 900, title: t('speed.title'), ribbon: COLORS.blue, onClose: onChange });
  const icon = scene.add.image(0, -280, 'ic_speed_badge').setDisplaySize(150, 150);
  m.addContent(icon);
  scene.tweens.add({ targets: icon, scale: icon.scale * 1.08, duration: 500, yoyo: true, repeat: -1 });
  m.addContent(bodyText(scene, -160, t('speed.desc', { min: config().speedBoost.minutes }), 30));
  const saved = txt(scene, 0, -80, '', 30, { color: '#8EB0FF', stroke: false });
  m.addContent(saved);
  const needed = config().speedBoost.shortAdsNeeded;
  const status = bodyText(scene, 310, '', 24);
  m.addContent(status);
  const shortBtn = new Button(scene, 0, 20, {
    w: 540,
    h: 104,
    color: COLORS.blue,
    icon: 'ic_video',
    label: t('speed.short', { n: needed }),
    onClick: () => void watch('short'),
  });
  const progress = txt(scene, 0, 90, '', 26, { color: INK, stroke: false, body: true });
  m.addContent(shortBtn);
  m.addContent(progress);
  m.addContent(txt(scene, 0, 135, t('speed.or'), 28, { color: INK, stroke: false }));
  const longBtn = new Button(scene, 0, 205, {
    w: 540,
    h: 104,
    color: COLORS.purple,
    icon: 'ic_video',
    label: t('speed.long'),
    onClick: () => void watch('long'),
  });
  m.addContent(longBtn);
  m.addContent(bodyText(scene, 380, t('speed.note'), 22));

  const refresh = () => {
    const sp = app.save.speed;
    saved.setText(sp.msLeft > 0 ? t('speed.left', { time: formatDuration(sp.msLeft) }) : '');
    const prog = shortAdsProgress(app.save, app.now());
    progress.setText(prog.watched > 0 ? t('speed.oneMore') : t('speed.shortProgress', { w: prog.watched, n: prog.needed }));
    const limit = speedActivationsLeft(app.save, app.now()) <= 0;
    const full = sp.msLeft >= maxSpeedMs() - MINUTE;
    shortBtn.setEnabled(!limit && !full);
    longBtn.setEnabled(!limit && !full);
    status.setText(limit ? t('speed.limit') : full ? t('speed.full') : '');
    onChange?.();
  };

  async function watch(kind: 'short' | 'long'): Promise<void> {
    const ok = await app.rewarded(kind, kind === 'short' ? 'speed_2x_short' : 'speed_2x_long');
    if (!ok) {
      toast(scene, t('common.noVideo'));
      return;
    }
    const activated = kind === 'short' ? recordShortSpeedAd(app.save, app.now()) : recordLongSpeedAd(app.save, app.now());
    app.persist();
    if (activated) {
      analytics.log('speed_boost', { kind });
      app.audio.play('combo', 3);
      toast(scene, t('speed.activated'));
      refresh();
      m.close();
    } else refresh();
  }
  refresh();
}

// ------------------------------------------------------------------ reforços

export function boosterBuyModal(scene: Phaser.Scene, id: BoosterId, onDone: () => void): void {
  const m = new Modal(scene, { w: 600, h: 760, title: t('boosters.buyTitle', { name: t(`boosters.${id}`) }), ribbon: COLORS.honey, onClose: onDone });
  m.addContent(scene.add.image(0, -200, `ic_${id}`).setDisplaySize(170, 170));
  m.addContent(bodyText(scene, -60, t(`boosters.${id}Desc`), 30));
  const price = config().boosters.prices[id];
  m.addContent(
    new Button(scene, 0, 80, {
      w: 420,
      h: 104,
      color: COLORS.honey,
      icon: 'ic_coin',
      label: String(price),
      onClick: () => {
        if (!buyBooster(app.save, id)) {
          toast(scene, t('common.notEnoughCoins'));
          shopModal(scene);
          return;
        }
        app.persist();
        app.audio.play('coins');
        m.close();
      },
    }),
  );
  const left = boosterVideosLeft(app.save, id, app.now());
  const vb = new Button(scene, 0, 210, {
    w: 420,
    h: 100,
    color: COLORS.blue,
    icon: 'ic_video',
    label: t('boosters.videoLeft', { n: left }),
    onClick: async () => {
      if (await app.rewarded('long', `booster_${id}`)) {
        grantBoosterFromVideo(app.save, id, app.now());
        app.persist();
        m.close();
      } else toast(scene, t('common.noVideo'));
    },
  });
  vb.setEnabled(left > 0);
  m.addContent(vb);
  if (left <= 0) m.addContent(bodyText(scene, 300, t('boosters.noVideosLeft'), 22));
}

export function boosterIntroModal(scene: Phaser.Scene, id: BoosterId): Promise<void> {
  return new Promise((resolve) => {
    const m = new Modal(scene, { w: 600, h: 720, title: t('boosters.newTitle'), ribbon: COLORS.green, onClose: () => resolve() });
    const icon = scene.add.image(0, -170, `ic_${id}`).setDisplaySize(190, 190);
    m.addContent(icon);
    scene.tweens.add({ targets: icon, angle: { from: -8, to: 8 }, duration: 600, yoyo: true, repeat: -1 });
    m.addContent(txt(scene, 0, -30, t(`boosters.${id}`), 46));
    m.addContent(bodyText(scene, 50, t(`boosters.${id}Desc`), 28));
    m.addContent(bodyText(scene, 130, t('boosters.gift', { n: config().boosters.freeOnUnlock }), 28));
    m.addContent(new Button(scene, 0, 240, { w: 360, h: 100, color: COLORS.green, label: t('tutorial.gotIt'), onClick: () => m.close() }));
  });
}

export function obstacleModal(scene: Phaser.Scene, key: string): Promise<void> {
  return new Promise((resolve) => {
    const m = new Modal(scene, { w: 620, h: 720, title: t(`tutorial.${key}`), ribbon: COLORS.purple, onClose: () => resolve() });
    const ill = scene.add.container(0, -150);
    m.addContent(ill);
    const g = scene.add.graphics();
    ill.add(g);
    if (key === 'twins') {
      g.lineStyle(22, 0x07041a, 0.45).lineBetween(-80, 0, 80, 0);
      g.lineStyle(14, 0xffb020).lineBetween(-80, 0, 80, 0);
      ill.add(scene.add.image(-80, 0, 'piece_rosa').setDisplaySize(110, 110));
      ill.add(scene.add.image(80, 0, 'piece_azul').setDisplaySize(110, 110));
      ill.add(txt(scene, -80, -4, '12', 44));
      ill.add(txt(scene, 80, -4, '9', 44));
    } else if (key === 'tubes') {
      g.lineStyle(32, 0x07041a, 0.45).lineBetween(0, -60, 0, 60);
      g.lineStyle(22, 0x8fd3ff).lineBetween(0, -60, 0, 60);
      ill.add(scene.add.image(0, -60, 'piece_verde').setDisplaySize(100, 100));
      ill.add(scene.add.image(0, 70, 'piece_violeta').setDisplaySize(90, 90).setAlpha(0.7));
      ill.add(txt(scene, 0, -64, '8', 44));
      ill.add(txt(scene, 0, 66, '15', 38));
    } else if (key === 'stones') {
      ill.add(scene.add.image(0, 0, 'stone').setDisplaySize(140, 140));
      ill.add(txt(scene, 0, 0, '25', 56));
    } else if (key === 'boxes') {
      ill.add(scene.add.image(0, 0, 'block_sol').setDisplaySize(70, 70).setPosition(-110, 0));
      ill.add(scene.add.image(110, 0, 'block_sol').setDisplaySize(70, 70));
      ill.add(scene.add.image(0, 0, boxTexture(scene, 2, 2)).setDisplaySize(140, 140));
      ill.add(txt(scene, 0, -2, '2', 64));
    } else if (key === 'locks') {
      ill.add(scene.add.image(-110, 0, 'ic_key').setDisplaySize(110, 110));
      ill.add(scene.add.image(-40, 30, 'block_azul').setDisplaySize(50, 50));
      ill.add(scene.add.image(80, 0, 'piece_rosa').setDisplaySize(130, 130).setTint(0x8f88b0));
      ill.add(txt(scene, 80, -4, '14', 50));
      ill.add(scene.add.image(122, -42, 'ic_lock').setDisplaySize(70, 70));
    } else if (key === 'hidden') {
      ill.add(scene.add.image(0, 0, 'piece_hidden').setDisplaySize(130, 130));
      ill.add(txt(scene, 0, -4, '?', 64));
    } else {
      ill.add(scene.add.image(0, 0, 'bud_rosa').setDisplaySize(140, 140));
      ill.add(scene.add.image(48, -48, 'px_dot').setDisplaySize(70, 70).setTint(0x4f7bff));
    }
    m.addContent(bodyText(scene, 60, t(`tutorial.${key}Text`), 30));
    m.addContent(new Button(scene, 0, 240, { w: 360, h: 100, color: COLORS.green, label: t('tutorial.gotIt'), onClick: () => m.close() }));
  });
}

// ------------------------------------------------------------------ genéricas

export function rulesModal(scene: Phaser.Scene, title: string, text: string, icon: string): void {
  const m = new Modal(scene, { w: 620, h: 820, title, ribbon: COLORS.blue });
  m.addContent(scene.add.image(0, -230, icon).setDisplaySize(170, 170));
  m.addContent(bodyText(scene, 40, text, 28, 540));
  m.addContent(new Button(scene, 0, 320, { w: 300, h: 92, color: COLORS.green, label: t('common.ok'), onClick: () => m.close() }));
}

export function comingSoonModal(scene: Phaser.Scene, title: string, icon: string): void {
  const m = new Modal(scene, { w: 600, h: 600, title, ribbon: COLORS.blue });
  m.addContent(scene.add.image(0, -120, icon).setDisplaySize(170, 170));
  m.addContent(txt(scene, 0, 30, t('common.comingSoon'), 44));
  m.addContent(bodyText(scene, 110, t('common.comingSoonText'), 26));
  m.addContent(scene.add.image(200, 170, 'bee_azu_happy').setDisplaySize(120, 120));
}

/** "Recebeste!" com baú a abanar e a abrir com luz. */
export function rewardModal(scene: Phaser.Scene, reward: Reward, onDone?: () => void): void {
  const m = new Modal(scene, { w: 600, h: 640, title: t('reward.got'), ribbon: COLORS.green, onClose: onDone });
  const rays = scene.add.image(0, -120, 'px_star').setDisplaySize(380, 380).setTint(0xfff3b0).setAlpha(0.8);
  m.addContent(rays);
  scene.tweens.add({ targets: rays, angle: 360, duration: 6000, repeat: -1 });
  const chest = scene.add.image(0, -120, 'ic_chest').setDisplaySize(200, 200);
  m.addContent(chest);
  scene.tweens.add({ targets: chest, angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: 4 });
  app.audio.play('chest');
  const row = rewardRow(scene, reward, 72, 32);
  row.setPosition(0, 90).setAlpha(0).setScale(0.5);
  m.addContent(row);
  scene.time.delayedCall(dur(550), () => {
    scene.tweens.add({ targets: row, alpha: 1, scale: 1, duration: dur(300), ease: 'Back.easeOut' });
    const wm = chest.getWorldTransformMatrix();
    burst(scene, wm.tx, wm.ty, 0xf7c531, 24, 1200);
    confetti(scene, L.W / 2, L.H * 0.45, 40, 1200);
  });
  m.addContent(new Button(scene, 0, 230, { w: 320, h: 96, color: COLORS.green, label: t('common.ok'), onClick: () => m.close() }));
}
