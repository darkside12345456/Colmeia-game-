// Loja, Definições, Créditos e Pack inicial.
import Phaser from 'phaser';
import { app } from '../app';
import { cardTexture } from '../art/textures';
import { getLang, setLang, t } from '../i18n';
import { config } from '../meta/config';
import { productReward, STARTER_PACK } from '../meta/products';
import { env } from '../services/platform';
import { Button, COLORS } from '../ui/Button';
import { INK, L, txt } from '../ui/core';
import { Modal } from '../ui/Modal';
import { rewardRow, ScrollArea, toast, toggleRow } from '../ui/widgets';
import { rewardModal } from './modals';

function price(id: string): string {
  return app.iap.product(id)?.priceString ?? '—';
}

/** Compra um produto e mostra o resultado. */
export async function purchase(scene: Phaser.Scene, id: string, after?: () => void): Promise<boolean> {
  if (!app.iap.available()) {
    toast(scene, t('shop.unavailable'));
    return false;
  }
  const res = await app.buy(id);
  if (res.status === 'ok') {
    app.audio.play('coins');
    const r = productReward(id);
    if (r) rewardModal(scene, r, after);
    else {
      toast(scene, t('shop.thanks'));
      after?.();
    }
    return true;
  }
  if (res.status !== 'cancelled') toast(scene, t('shop.failed'));
  return false;
}

// ------------------------------------------------------------------ loja

export function shopModal(scene: Phaser.Scene): void {
  const h = Math.min(1200, L.H - 100);
  const m = new Modal(scene, { w: 660, h, title: t('shop.title'), ribbon: COLORS.pink });
  const areaH = h - 270;
  const area = new ScrollArea(scene, 0, -h / 2 + 70 + areaH / 2, 620, areaH);
  m.addContent(area);
  const c = area.content;
  let y = 10;
  const card = (hh: number, color = '#FFFFFF') => {
    const img = scene.add.image(0, y + hh / 2, cardTexture(scene, 600, hh, color));
    c.add(img);
    const top = y;
    y += hh + 16;
    return top;
  };
  const buyBtn = (x: number, yy: number, id: string, w = 200) => {
    const b = new Button(scene, x, yy, {
      w,
      h: 84,
      color: COLORS.green,
      label: price(id),
      fontSize: 30,
      onClick: () => {
        if (area.wasDrag()) return;
        void purchase(scene, id, () => {
          m.close(true);
          shopModal(scene);
        });
      },
    });
    b.setEnabled(app.iap.available());
    c.add(b);
    return b;
  };

  {
    const top = card(270, '#D7F0FF');
    c.add(scene.add.image(-220, top + 70, 'ic_video').setDisplaySize(100, 100));
    c.add(scene.add.image(-220, top + 70, 'ic_close').setDisplaySize(70, 70).setAlpha(0.9));
    c.add(txt(scene, 50, top + 44, t('shop.noAds'), 38));
    c.add(txt(scene, 50, top + 120, t('shop.noAdsDesc'), 21, { body: true, wrap: 420 }));
    if (app.noAds()) c.add(txt(scene, 0, top + 215, t('shop.owned'), 30, { color: '#54C143' }));
    else buyBtn(0, top + 212, 'no_ads', 240);
  }
  const packs = Object.entries(config().coinPacks);
  packs.forEach(([id, coins], i) => {
    const top = card(150);
    const n = Math.min(4, i + 1);
    for (let k = 0; k < n; k++) c.add(scene.add.image(-240 + k * 18, top + 75 - k * 6, 'ic_coin').setDisplaySize(80, 80));
    c.add(txt(scene, -40, top + 52, t(`products.${id}`), 30, { color: INK, stroke: false }));
    c.add(txt(scene, -40, top + 98, t('reward.coins', { n: coins }), 34));
    buyBtn(190, top + 75, id, 190);
  });
  area.setContentHeight(y + 10);
  scene.time.delayedCall(320, () => area.updateMask());

  m.addContent(
    new Button(scene, 0, h / 2 - 150, {
      w: 420,
      h: 84,
      color: COLORS.blue,
      icon: 'ic_restore',
      label: t('shop.restore'),
      fontSize: 30,
      onClick: () => void restorePurchases(scene),
    }),
  );
  m.addContent(txt(scene, 0, h / 2 - 72, t('shop.priceNote'), 20, { body: true, wrap: 560 }));
  if (!app.iap.available()) m.addContent(txt(scene, 0, -h / 2 + 64, t('shop.unavailable'), 20, { body: true, color: '#E8384F', wrap: 560 }));
}

async function restorePurchases(scene: Phaser.Scene): Promise<void> {
  const r = await app.restore();
  if (!r.ok) toast(scene, t('shop.unavailable'));
  else toast(scene, r.restored > 0 ? t('shop.restored') : t('shop.nothingToRestore'));
}

// ------------------------------------------------------------------ pack inicial (1 vez)

export function starterPackModal(scene: Phaser.Scene): void {
  app.save.purchases.starterPackSeen = true;
  app.persist();
  const m = new Modal(scene, { w: 620, h: 760, title: t('starter.title'), ribbon: COLORS.pink });
  m.addContent(scene.add.image(0, -210, 'ic_gift').setDisplaySize(200, 200));
  m.addContent(txt(scene, 0, -70, t('starter.text'), 28, { body: true, wrap: 520 }));
  const row = rewardRow(scene, STARTER_PACK, 64, 28);
  row.setPosition(0, 40);
  m.addContent(row);
  m.addContent(
    new Button(scene, 0, 180, {
      w: 420,
      h: 104,
      color: COLORS.green,
      label: price('starter_pack'),
      onClick: () => void purchase(scene, 'starter_pack', () => m.close(true)),
    }).setEnabled(app.iap.available()),
  );
  m.addContent(new Button(scene, 0, 300, { w: 300, h: 80, color: COLORS.grey, label: t('starter.later'), fontSize: 28, onClick: () => m.close() }));
}

// ------------------------------------------------------------------ definições

export function settingsModal(scene: Phaser.Scene, onLangChange: () => void): void {
  const h = Math.min(1180, L.H - 100);
  const m = new Modal(scene, { w: 640, h, title: t('settings.title'), ribbon: COLORS.blue });
  const w = 560;
  const s = app.save.settings;
  const rows: Phaser.GameObjects.Container[] = [];
  rows.push(
    toggleRow(scene, 0, w, 'ic_sound', t('settings.sound'), () => s.sound, (v) => {
      s.sound = v;
      app.applySettings();
      app.persist();
    }),
  );
  rows.push(
    toggleRow(scene, 0, w, 'ic_music', t('settings.music'), () => s.music, (v) => {
      s.music = v;
      app.applySettings();
      app.persist();
    }),
  );
  rows.push(
    toggleRow(scene, 0, w, 'ic_vibration', t('settings.vibration'), () => s.vibration, (v) => {
      s.vibration = v;
      app.applySettings();
      app.persist();
    }),
  );
  rows.push(
    toggleRow(scene, 0, w, 'ic_motion', t('settings.reducedMotion'), () => app.reducedMotion(), (v) => {
      s.reducedMotion = v;
      app.persist();
    }),
  );
  const top = -h / 2 + 110;
  rows.forEach((r, i) => {
    r.y = top + i * 92;
    m.addContent(r);
  });
  let y = top + rows.length * 92 + 20;
  const link = (icon: string, label: string, onClick: () => void, color = COLORS.blue) => {
    m.addContent(new Button(scene, 0, y, { w: 520, h: 84, color, icon, iconSize: 50, label, fontSize: 28, onClick }));
    y += 100;
  };
  link('ic_globe', `${t('settings.language')}: ${t('settings.langName')}`, () => {
    const next = getLang() === 'pt-PT' ? 'en' : 'pt-PT';
    s.lang = next;
    setLang(next);
    app.persist();
    m.close(true);
    onLangChange();
  });
  link('ic_shield', t('settings.privacy'), () => void app.ads.showPrivacyOptions(), COLORS.teal);
  link('ic_doc', t('settings.privacyPolicy'), () => openUrl(env.privacyUrl), COLORS.teal);
  link('ic_restore', t('settings.restore'), () => void restorePurchases(scene), COLORS.teal);
  link('ic_mail', t('settings.support'), () => openUrl(`mailto:${env.supportEmail}`), COLORS.teal);
  link('ic_star', t('settings.credits'), () => creditsModal(scene), COLORS.honey);
  m.addContent(txt(scene, 0, h / 2 - 50, `${t('settings.version', { v: env.version })}  ·  ${env.supportEmail}`, 20, { body: true }));
}

function openUrl(url: string): void {
  if (!url) return;
  try {
    window.open(url, '_blank', 'noopener');
  } catch {
    /* sem browser */
  }
}

export function creditsModal(scene: Phaser.Scene): void {
  const m = new Modal(scene, { w: 640, h: 900, title: t('credits.title'), ribbon: COLORS.honey });
  m.addContent(scene.add.image(0, -300, 'bee_mel_happy').setDisplaySize(170, 170));
  m.addContent(txt(scene, 0, 60, t('credits.text'), 24, { body: true, wrap: 560, lineSpacing: 6 }));
}
