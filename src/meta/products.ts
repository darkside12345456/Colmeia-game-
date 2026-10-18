// Catálogo de compras na app. Os preços mostrados vêm SEMPRE da loja (Google Play) quando há
// ligação; estes são só os preços de referência para o modo de testes e para o caso offline.
import { config } from './config';
import { applyReward, MINUTE, type Reward } from './economy';
import { grantPassPremium, TREASURE_STEPS } from './events';
import type { SaveData } from './state';

export type ProductKind = 'nonConsumable' | 'consumable';

export interface ProductDef {
  id: string;
  kind: ProductKind;
  /** preço de referência em euros (o real vem da loja) */
  priceEur: number;
}

export const PRODUCTS: ProductDef[] = [
  { id: 'no_ads', kind: 'nonConsumable', priceEur: 3.99 },
  { id: 'starter_pack', kind: 'consumable', priceEur: 1.99 },
  { id: 'coins_s', kind: 'consumable', priceEur: 0.99 },
  { id: 'coins_m', kind: 'consumable', priceEur: 4.99 },
  { id: 'coins_l', kind: 'consumable', priceEur: 9.99 },
  { id: 'coins_xl', kind: 'consumable', priceEur: 19.99 },
  { id: 'pass_season', kind: 'consumable', priceEur: 4.99 },
  { id: 'treasure_1', kind: 'consumable', priceEur: 1.99 },
  { id: 'treasure_2', kind: 'consumable', priceEur: 2.99 },
  { id: 'treasure_3', kind: 'consumable', priceEur: 4.99 },
];

export const NO_ADS_ENTITLEMENT = 'no_ads';

export const STARTER_PACK: Reward = {
  coins: 1500,
  boosters: { slot: 2, shuffle: 2, tweezers: 2, magnet: 2 },
  infiniteMin: 60,
};

export function productDef(id: string): ProductDef | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function formatEur(v: number, lang: string): string {
  return new Intl.NumberFormat(lang === 'en' ? 'en-IE' : 'pt-PT', { style: 'currency', currency: 'EUR' }).format(v);
}

/** O que cada produto dá (para mostrar e para entregar). */
export function productReward(id: string): Reward | null {
  if (id in config().coinPacks) return { coins: config().coinPacks[id] };
  if (id === 'starter_pack') return STARTER_PACK;
  const step = TREASURE_STEPS.find((s) => s.product === id);
  if (step) return step.reward;
  return null;
}

/**
 * Entrega uma compra JÁ VALIDADA pelo serviço de compras.
 * O id da transação evita entregar duas vezes a mesma compra.
 * Devolve false se a transação já tinha sido entregue.
 */
export function deliverPurchase(s: SaveData, productId: string, transactionId: string, now: number): boolean {
  if (s.purchases.processedTx.includes(transactionId)) return false;
  s.purchases.processedTx.push(transactionId);
  if (s.purchases.processedTx.length > 200) s.purchases.processedTx.splice(0, s.purchases.processedTx.length - 200);
  if (productId === 'no_ads') {
    s.purchases.noAdsCache = true;
    return true;
  }
  if (productId === 'pass_season') {
    grantPassPremium(s, now);
    return true;
  }
  if (productId === 'starter_pack') s.purchases.starterPackBought = true;
  if (productId.startsWith('treasure_')) {
    // o passo pago só avança se for o passo atual da corrente
    const step = TREASURE_STEPS[s.treasure.step];
    if (step?.product === productId) s.treasure.step++;
  }
  const r = productReward(productId);
  if (r) applyReward(s, r, now);
  return true;
}

export const ONE_HOUR = 60 * MINUTE;
