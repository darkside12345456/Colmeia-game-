// Janelas dos eventos (secção 5), cada uma com temporizador e botão "i" de regras.
import Phaser from 'phaser';
import { app } from '../app';
import { cardTexture, rivalTexture, avatarTexture } from '../art/textures';
import { formatDuration, t } from '../i18n';
import { type Reward } from '../meta/economy';
import {
  canClaimPass,
  claimDaily,
  claimPass,
  claimSunflower,
  claimTreasureStep,
  closeRace,
  completeHiveStage,
  currentTreasureStep,
  dailyAvailable,
  DAILY_REWARDS,
  HIVE_STAGES,
  hiveStageComplete,
  isPassPremium,
  nextMidnight,
  passEnds,
  passFreeReward,
  passPremiumReward,
  passTier,
  PASS_TIERS,
  RACE_GOAL,
  raceState,
  startRace,
  SUNFLOWER_MILESTONES,
  SUNFLOWER_REWARDS,
  sunflowerClaimable,
  sunflowerEnds,
  syncPass,
  syncSunflower,
  syncTreasure,
  TICKETS_PER_TIER,
  TREASURE_STEPS,
  treasureEnds,
} from '../meta/events';
import { Button, COLORS, iconButton } from '../ui/Button';
import { INK, L, txt } from '../ui/core';
import { hex, THEME } from '../ui/theme';
import { hiveView } from '../ui/hive';
import { Modal } from '../ui/Modal';
import { ProgressBar, rewardRow, ScrollArea, toast } from '../ui/widgets';
import { purchase } from './menus';
import { rewardModal, rulesModal } from './modals';

function header(scene: Phaser.Scene, m: Modal, ends: (() => number) | null, rulesTitle: string, rules: string, icon: string): void {
  m.addContent(iconButton(scene, -m.pw / 2 + 16, -m.ph / 2 + 16, 'ic_info', COLORS.blue, () => rulesModal(scene, rulesTitle, rules, icon), 70));
  if (!ends) return;
  const timer = txt(scene, 0, -m.ph / 2 + 74, '', 26, { color: INK, stroke: false });
  m.addContent(timer);
  const tick = () => timer.setText(t('common.endsIn', { time: formatDuration(ends() - app.now()) }));
  tick();
  const ev = scene.time.addEvent({ delay: 1000, loop: true, callback: tick });
  m.once(Phaser.GameObjects.Events.DESTROY, () => ev.remove());
}

function reopen(m: Modal, fn: () => void): void {
  m.close(true);
  fn();
}

function mainReward(r: Reward): [string, string] {
  if (r.coins) return ['ic_coin', String(r.coins)];
  const b = Object.entries(r.boosters ?? {});
  if (b.length > 1) return ['ic_gift', `x${b.length}`];
  if (b.length === 1) return [`ic_${b[0][0]}`, `x${b[0][1]}`];
  if (r.infiniteMin) return ['ic_heart', `${r.infiniteMin}m`];
  if (r.speedMin) return ['ic_speed_badge', `${r.speedMin}m`];
  return ['ic_gift', ''];
}

// ------------------------------------------------------------------ 1. Prémio diário

export function dailyModal(scene: Phaser.Scene, onChange: () => void): void {
  const m = new Modal(scene, { w: 640, h: 940, title: t('daily.title'), ribbon: COLORS.green, onClose: onChange });
  header(scene, m, () => nextMidnight(app.now()), t('daily.title'), t('daily.rules'), 'ic_gift');
  const s = app.save;
  const avail = dailyAvailable(s, app.now());
  DAILY_REWARDS.forEach((r, i) => {
    const row = i < 4 ? 0 : 1;
    const inRow = row === 0 ? 4 : 3;
    const col = row === 0 ? i : i - 4;
    const x = (col - (inRow - 1) / 2) * 140;
    const y = -230 + row * 220;
    const isToday = i === s.daily.index && avail;
    const done = i < s.daily.index;
    const card = scene.add.image(x, y, cardTexture(scene, 128, 190, isToday ? '#22C98A' : i === 6 ? THEME.accent : THEME.card));
    m.addContent(card);
    if (isToday) scene.tweens.add({ targets: card, scale: 1.06, duration: 500, yoyo: true, repeat: -1 });
    m.addContent(txt(scene, x, y - 70, t('daily.day', { n: i + 1 }), 24, { color: INK, stroke: false }));
    const [icon, label] = mainReward(r);
    m.addContent(scene.add.image(x, y, i === 6 ? 'ic_chest' : icon).setDisplaySize(76, 76));
    m.addContent(txt(scene, x, y + 58, label, 26));
    if (done) m.addContent(scene.add.image(x + 40, y - 60, 'ic_check').setDisplaySize(50, 50));
  });
  if (avail) {
    const claim = (times: number) => {
      const r = claimDaily(s, app.now(), times);
      app.persist();
      if (r) rewardModal(scene, times > 1 ? doubled(r) : r, () => reopen(m, () => dailyModal(scene, onChange)));
    };
    m.addContent(new Button(scene, 0, 250, { w: 420, h: 100, color: COLORS.green, label: t('common.claim'), onClick: () => claim(1) }));
    m.addContent(
      new Button(scene, 0, 370, {
        w: 420,
        h: 100,
        color: COLORS.blue,
        icon: 'ic_video',
        label: t('daily.double'),
        onClick: async () => {
          if (await app.rewarded('long', 'daily_x2')) claim(2);
          else toast(scene, t('common.noVideo'));
        },
      }),
    );
  } else m.addContent(txt(scene, 0, 300, t('daily.comeBack'), 30, { body: true, wrap: 520 }));
}

function doubled(r: Reward): Reward {
  const out: Reward = { ...r };
  if (r.coins) out.coins = r.coins * 2;
  if (r.boosters) out.boosters = Object.fromEntries(Object.entries(r.boosters).map(([k, v]) => [k, (v ?? 0) * 2]));
  if (r.infiniteMin) out.infiniteMin = r.infiniteMin * 2;
  if (r.speedMin) out.speedMin = r.speedMin * 2;
  return out;
}

// ------------------------------------------------------------------ 2. Passe da Colmeia

export function passModal(scene: Phaser.Scene, onChange?: () => void): void {
  const s = app.save;
  syncPass(s, app.now());
  const h = Math.min(1220, L.H - 90);
  const m = new Modal(scene, { w: 660, h, title: t('pass.title'), ribbon: COLORS.purple, onClose: onChange });
  header(scene, m, () => passEnds(app.now()), t('pass.title'), t('pass.rules'), 'ic_crown');
  const premium = isPassPremium(s, app.now());
  const tier = passTier(s);
  // bilhetes e progresso
  m.addContent(scene.add.image(-230, -h / 2 + 140, 'ic_ticket').setDisplaySize(70, 70));
  m.addContent(txt(scene, -150, -h / 2 + 140, t('pass.tickets', { n: s.pass.tickets }), 28, { origin: [0, 0.5] }));
  const bar = new ProgressBar(scene, 150, -h / 2 + 140, 220, 26, 0x8b5cf6).set((s.pass.tickets % TICKETS_PER_TIER) / TICKETS_PER_TIER);
  m.addContent(bar);
  if (premium) m.addContent(txt(scene, 0, -h / 2 + 200, t('pass.owned'), 30, { color: '#FFB020' }));
  else {
    m.addContent(
      new Button(scene, 0, -h / 2 + 205, {
        w: 520,
        h: 88,
        color: COLORS.purple,
        icon: 'ic_crown',
        label: `${t('pass.buy')} - ${app.iap.product('pass_season')?.priceString ?? '—'}`,
        fontSize: 28,
        onClick: () => void purchase(scene, 'pass_season', () => reopen(m, () => passModal(scene, onChange))),
      }).setEnabled(app.iap.available()),
    );
  }
  m.addContent(txt(scene, -150, -h / 2 + 270, t('pass.free'), 28));
  m.addContent(txt(scene, 150, -h / 2 + 270, t('pass.premium'), 28, { color: '#FFB020' }));
  const areaTop = -h / 2 + 300;
  const areaH = h / 2 - 40 - areaTop;
  const area = new ScrollArea(scene, 0, areaTop + areaH / 2, 620, areaH);
  m.addContent(area);
  const c = area.content;
  const rowH = 140;
  for (let k = 0; k < PASS_TIERS; k++) {
    const y = k * rowH + rowH / 2;
    const reached = k < tier;
    const g = scene.add.graphics();
    g.fillStyle(reached ? 0x8b5cf6 : 0x5a5480, 1).fillCircle(0, y, 30);
    g.lineStyle(2, 0xffffff, 0.3).strokeCircle(0, y, 30);
    if (k < PASS_TIERS - 1) g.lineStyle(10, reached ? 0x8b5cf6 : 0x463c82).lineBetween(0, y + 30, 0, y + rowH - 30);
    c.add(g);
    c.add(txt(scene, 0, y - 2, String(k + 1), 28));
    for (const prem of [false, true]) {
      const x = prem ? 160 : -160;
      const r = prem ? passPremiumReward(k) : passFreeReward(k);
      c.add(scene.add.image(x, y, cardTexture(scene, 230, 120, prem ? THEME.accent : THEME.card)));
      const [icon, label] = mainReward(r);
      c.add(scene.add.image(x - 60, y - 4, icon).setDisplaySize(64, 64));
      c.add(txt(scene, x - 60, y + 34, label, 22));
      const claimedList = prem ? s.pass.premium : s.pass.free;
      if (claimedList.includes(k)) c.add(scene.add.image(x + 55, y - 4, 'ic_check').setDisplaySize(56, 56));
      else if (prem && !premium) c.add(scene.add.image(x + 55, y - 4, 'ic_lock').setDisplaySize(56, 56));
      else if (canClaimPass(s, k, prem, app.now())) {
        const b = new Button(scene, x + 50, y - 4, {
          w: 110,
          h: 70,
          color: COLORS.green,
          label: t('common.claim'),
          fontSize: 22,
          onClick: () => {
            if (area.wasDrag()) return;
            const got = claimPass(s, k, prem, app.now());
            app.persist();
            if (got) rewardModal(scene, got, () => reopen(m, () => passModal(scene, onChange)));
          },
        });
        c.add(b);
      } else c.add(scene.add.image(x + 55, y - 4, 'ic_lock').setDisplaySize(44, 44).setAlpha(0.4));
    }
  }
  area.setContentHeight(PASS_TIERS * rowH);
  area.scrollTo(Math.max(0, (tier - 1) * rowH));
  area.updateMask();
}

// ------------------------------------------------------------------ 3. Tesouro da Rainha

export function treasureModal(scene: Phaser.Scene, onChange?: () => void): void {
  const s = app.save;
  syncTreasure(s, app.now());
  const h = Math.min(1200, L.H - 90);
  const m = new Modal(scene, { w: 660, h, title: t('treasure.title'), ribbon: COLORS.honey, onClose: onChange });
  header(scene, m, () => treasureEnds(app.now()), t('treasure.title'), t('treasure.rules'), 'ic_crown');
  m.addContent(scene.add.image(-220, -h / 2 + 170, 'bee_rainha_happy').setDisplaySize(170, 170));
  const areaTop = -h / 2 + 110;
  const areaH = h / 2 - 30 - areaTop;
  const area = new ScrollArea(scene, 60, areaTop + areaH / 2, 520, areaH);
  m.addContent(area);
  const c = area.content;
  const stepH = 175;
  const g = scene.add.graphics();
  c.add(g);
  TREASURE_STEPS.forEach((step, i) => {
    const x = i % 2 === 0 ? -90 : 90;
    const y = i * stepH + stepH / 2 + 10;
    if (i < TREASURE_STEPS.length - 1) {
      const nx = (i + 1) % 2 === 0 ? -90 : 90;
      g.lineStyle(12, 0x463c82).lineBetween(x, y, nx, y + stepH);
    }
    const state = i < s.treasure.step ? 'done' : i === s.treasure.step ? 'current' : 'locked';
    const color = step.kind === 'paid' ? THEME.accent : step.kind === 'video' ? '#4F7BFF' : THEME.card;
    const card = scene.add.image(x, y, cardTexture(scene, 300, 160, color)).setAlpha(state === 'locked' ? 0.6 : 1);
    c.add(card);
    const row = rewardRow(scene, step.reward, 46, 20);
    row.setPosition(x, y - 30);
    c.add(row);
    if (state === 'done') c.add(scene.add.image(x + 120, y - 55, 'ic_check').setDisplaySize(54, 54));
    else if (state === 'locked') c.add(scene.add.image(x, y + 45, 'ic_lock').setDisplaySize(50, 50));
    else {
      const claimNow = () => {
        const r = claimTreasureStep(s, app.now());
        app.persist();
        if (r) rewardModal(scene, r, () => reopen(m, () => treasureModal(scene, onChange)));
      };
      let b: Button;
      if (step.kind === 'free') b = new Button(scene, x, y + 45, { w: 220, h: 70, color: COLORS.green, label: t('common.free'), fontSize: 26, onClick: () => !area.wasDrag() && claimNow() });
      else if (step.kind === 'video')
        b = new Button(scene, x, y + 45, {
          w: 220,
          h: 70,
          color: COLORS.blue,
          icon: 'ic_video',
          iconSize: 44,
          label: t('common.watchVideo'),
          fontSize: 22,
          onClick: async () => {
            if (area.wasDrag()) return;
            if (await app.rewarded('long', 'treasure_video')) claimNow();
            else toast(scene, t('common.noVideo'));
          },
        });
      else
        b = new Button(scene, x, y + 45, {
          w: 220,
          h: 70,
          color: COLORS.green,
          label: app.iap.product(step.product!)?.priceString ?? '—',
          fontSize: 26,
          onClick: () => !area.wasDrag() && void purchase(scene, step.product!, () => reopen(m, () => treasureModal(scene, onChange))),
        }).setEnabled(app.iap.available());
      c.add(b);
      scene.tweens.add({ targets: card, scale: 1.04, duration: 500, yoyo: true, repeat: -1 });
    }
  });
  if (!currentTreasureStep(s, app.now())) m.addContent(txt(scene, 0, h / 2 - 60, t('treasure.done'), 26, { body: true, wrap: 560 }));
  area.setContentHeight(TREASURE_STEPS.length * stepH + 40);
  area.scrollTo(Math.max(0, (s.treasure.step - 1) * stepH));
  area.updateMask();
}

// ------------------------------------------------------------------ 4. Corrida das Flores

export function raceModal(scene: Phaser.Scene, onChange?: () => void): void {
  const s = app.save;
  const st = raceState(s, app.now());
  const m = new Modal(scene, { w: 660, h: 1000, title: t('race.title'), ribbon: COLORS.pink, onClose: onChange });
  header(scene, m, st === 'running' ? () => s.race.endsAt : null, t('race.title'), t('race.rules'), 'ic_race');
  m.addContent(txt(scene, 0, -400, t('race.goal', { n: RACE_GOAL }), 26, { body: true, wrap: 560 }));
  if (st === 'idle') {
    m.addContent(scene.add.image(0, -170, 'ic_race').setDisplaySize(220, 220));
    m.addContent(txt(scene, 0, 30, t('race.rules'), 24, { body: true, wrap: 560 }));
    m.addContent(
      new Button(scene, 0, 330, {
        w: 440,
        h: 104,
        color: COLORS.green,
        label: t('race.start'),
        onClick: () => {
          startRace(s, app.now());
          app.persist();
          reopen(m, () => raceModal(scene, onChange));
        },
      }),
    );
    return;
  }
  const lanes = [{ name: t('race.you'), tex: avatarTexture(scene), progress: s.race.player }, ...s.race.rivals.map((r, i) => ({ name: r.name, tex: rivalTexture(scene, i), progress: r.progress }))];
  lanes.forEach((ln, i) => {
    const y = -300 + i * 120;
    const g = scene.add.graphics();
    g.fillStyle(i === 0 ? hex(THEME.accent) : 0xffffff, i === 0 ? 0.16 : 0.06).fillRoundedRect(-300, y - 50, 600, 100, 24);
    g.lineStyle(2, i === 0 ? hex(THEME.accent) : 0xffffff, i === 0 ? 0.6 : 0.14).strokeRoundedRect(-300, y - 50, 600, 100, 24);
    m.addContent(g);
    m.addContent(scene.add.image(-250, y, ln.tex).setDisplaySize(80, 80));
    m.addContent(txt(scene, -200, y - 26, ln.name, 22, { origin: [0, 0.5], color: INK, stroke: false }));
    for (let k = 0; k < RACE_GOAL; k++) {
      const fx = -150 + k * 95 + 40;
      const reached = k < ln.progress;
      m.addContent(scene.add.image(fx, y + 14, 'ic_flower').setDisplaySize(52, 52).setAlpha(reached ? 1 : 0.25));
    }
  });
  if (st === 'running') return;
  const msg = st === 'won' ? t('race.won') : st === 'lost' ? t('race.lost') : t('race.expired');
  m.addContent(txt(scene, 0, 330, msg, 32, { color: st === 'won' ? '#22C98A' : INK, stroke: st === 'won' }));
  m.addContent(
    new Button(scene, 0, 420, {
      w: 420,
      h: 96,
      color: COLORS.green,
      label: st === 'won' ? t('race.open') : t('race.close'),
      onClick: () => {
        const r = closeRace(s, app.now());
        app.persist();
        if (r) rewardModal(scene, r, () => reopen(m, () => raceModal(scene, onChange)));
        else reopen(m, () => raceModal(scene, onChange));
      },
    }),
  );
}

// ------------------------------------------------------------------ 5. Subida ao Girassol

export function sunflowerModal(scene: Phaser.Scene, onChange?: () => void): void {
  const s = app.save;
  syncSunflower(s, app.now());
  const h = Math.min(1150, L.H - 90);
  const m = new Modal(scene, { w: 640, h, title: t('sunflower.title'), ribbon: COLORS.honey, onClose: onChange });
  header(scene, m, () => sunflowerEnds(app.now()), t('sunflower.title'), t('sunflower.rules'), 'ic_sunflower');
  m.addContent(txt(scene, 110, -h / 2 + 150, t('sunflower.steps', { n: s.sunflower.steps }), 34));
  const top = -h / 2 + 200;
  const bottom = h / 2 - 70;
  const n = SUNFLOWER_MILESTONES.length;
  const stepY = (bottom - top) / (n - 1);
  const g = scene.add.graphics();
  g.lineStyle(18, 0x22c98a, 0.85).lineBetween(-100, top, -100, bottom);
  m.addContent(g);
  m.addContent(scene.add.image(-100, top - 40, 'ic_sunflower').setDisplaySize(150, 150));
  const claimable = sunflowerClaimable(s, app.now());
  SUNFLOWER_MILESTONES.forEach((ms, i) => {
    const y = bottom - i * stepY;
    const reached = s.sunflower.steps >= ms;
    const node = scene.add.graphics();
    node.fillStyle(reached ? 0xffb020 : 0x463c82, 1).fillCircle(-100, y, 34);
    node.lineStyle(2, 0xffffff, 0.35).strokeCircle(-100, y, 34);
    m.addContent(node);
    m.addContent(txt(scene, -100, y - 2, String(ms), 28));
    m.addContent(scene.add.image(-10, y, cardTexture(scene, 120, 90)).setOrigin(0, 0.5));
    const [icon, label] = mainReward(SUNFLOWER_REWARDS[i]);
    m.addContent(scene.add.image(28, y - 8, icon).setDisplaySize(52, 52));
    m.addContent(txt(scene, 72, y + 18, label, 20));
    if (s.sunflower.claimed.includes(i)) m.addContent(scene.add.image(180, y, 'ic_check').setDisplaySize(52, 52));
    else if (claimable.includes(i))
      m.addContent(
        new Button(scene, 210, y, {
          w: 150,
          h: 70,
          color: COLORS.green,
          label: t('common.claim'),
          fontSize: 24,
          onClick: () => {
            const r = claimSunflower(s, i, app.now());
            app.persist();
            if (r) rewardModal(scene, r, () => reopen(m, () => sunflowerModal(scene, onChange)));
          },
        }),
      );
    else m.addContent(scene.add.image(180, y, 'ic_lock').setDisplaySize(44, 44).setAlpha(0.5));
  });
  // posição da Mel no caule
  const ms = SUNFLOWER_MILESTONES;
  let pos = bottom + 40;
  for (let i = 0; i < ms.length; i++) {
    const prev = i === 0 ? 0 : ms[i - 1];
    if (s.sunflower.steps >= ms[i]) pos = bottom - i * stepY;
    else {
      const frac = (s.sunflower.steps - prev) / (ms[i] - prev);
      pos = i === 0 ? bottom + 40 - frac * 40 : bottom - (i - 1) * stepY - frac * stepY;
      break;
    }
  }
  const bee = scene.add.image(-190, pos, 'bee_mel_happy').setDisplaySize(100, 100);
  m.addContent(bee);
  scene.tweens.add({ targets: bee, y: pos - 10, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

// ------------------------------------------------------------------ 6. Construir a Colmeia

export function hiveModal(scene: Phaser.Scene, onChange?: () => void): void {
  const s = app.save;
  const h = Math.min(1150, L.H - 90);
  const m = new Modal(scene, { w: 640, h, title: t('hive.title'), ribbon: COLORS.honey, onClose: onChange });
  header(scene, m, null, t('hive.title'), t('hive.rules'), 'ic_hive');
  m.addContent(hiveView(scene, 0, -h / 2 + 260, s.hive.stage, 0.62));
  const stage = HIVE_STAGES[s.hive.stage];
  if (!stage) {
    m.addContent(txt(scene, 0, 120, t('hive.allDone'), 34, { body: true, wrap: 520 }));
    return;
  }
  m.addContent(txt(scene, 0, -h / 2 + 440, t('hive.stage', { n: s.hive.stage + 1, m: HIVE_STAGES.length }), 26, { color: INK, stroke: false }));
  m.addContent(txt(scene, 0, -h / 2 + 490, t(`hive.stages.${stage.id}`), 40));
  stage.tasks.forEach((task, i) => {
    const y = -h / 2 + 600 + i * 120;
    m.addContent(scene.add.image(0, y, cardTexture(scene, 560, 104)));
    m.addContent(scene.add.image(-230, y - 4, `ic_${task.material}`).setDisplaySize(64, 64));
    m.addContent(txt(scene, -180, y - 22, t(`hive.tasks.${task.type}`, { n: task.n }), 24, { origin: [0, 0.5], color: INK, stroke: false }));
    const prog = s.hive.progress[task.id] ?? 0;
    const done = s.hive.done.includes(task.id);
    const bar = new ProgressBar(scene, 10, y + 22, 300, 22).set(done ? 1 : prog / task.n);
    m.addContent(bar);
    m.addContent(txt(scene, 210, y + 20, done ? '' : `${prog}/${task.n}`, 20, { color: INK, stroke: false }));
    if (done) m.addContent(scene.add.image(225, y, 'ic_check').setDisplaySize(56, 56));
  });
  const mats = ['cera', 'petala', 'galho', 'folha'];
  mats.forEach((mat, i) => {
    const x = (i - 1.5) * 130;
    const y = h / 2 - 200;
    m.addContent(scene.add.image(x - 22, y, `ic_${mat}`).setDisplaySize(50, 50));
    m.addContent(txt(scene, x + 22, y, String(s.hive.materials[mat] ?? 0), 28));
  });
  const btn = new Button(scene, 0, h / 2 - 90, {
    w: 440,
    h: 100,
    color: COLORS.green,
    label: t('hive.complete'),
    onClick: () => {
      const r = completeHiveStage(s, app.now());
      app.persist();
      if (r) rewardModal(scene, r, () => reopen(m, () => hiveModal(scene, onChange)));
    },
  });
  btn.setEnabled(hiveStageComplete(s));
  m.addContent(btn);
}
