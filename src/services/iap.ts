// Compras na app (secção 4.3 e 11.2). Uma compra só é entregue depois de validada pelo serviço
// (RevenueCat valida o recibo da Google do lado deles). O "Sem anúncios" vem da lista de
// entitlements devolvida pelo serviço, nunca de uma variável local.
import { t } from '../i18n';
import { formatEur, NO_ADS_ENTITLEMENT, PRODUCTS, productDef } from '../meta/products';
import { escapeHtml, overlay } from './overlay';
import { env, isNative } from './platform';

export interface StoreProduct {
  id: string;
  /** Preço já formatado pela loja (ex.: "1,99 €") */
  priceString: string;
}

export interface Transaction {
  productId: string;
  transactionId: string;
  date: number;
}

export type PurchaseResult =
  | { status: 'ok'; transaction: Transaction }
  | { status: 'cancelled' | 'error' | 'unavailable' };

export interface RestoreResult {
  ok: boolean;
  entitlements: string[];
  transactions: Transaction[];
}

export interface IapService {
  init(): Promise<void>;
  available(): boolean;
  product(id: string): StoreProduct | undefined;
  purchase(id: string): Promise<PurchaseResult>;
  restore(): Promise<RestoreResult>;
  hasEntitlement(id: string): boolean;
  /** Chamado quando os entitlements mudam (ex.: reembolso, compra noutro dispositivo). */
  onChange(cb: () => void): void;
}

// ----------------------------------------------------------------- versão FALSA (testes)

const FAKE_KEY = 'cd_fake_store';

interface FakeStore {
  entitlements: string[];
  transactions: Transaction[];
}

/** Compras simuladas. Guarda tudo à parte do save, como se fosse o "servidor" da loja. */
export class FakeIapService implements IapService {
  private store: FakeStore = { entitlements: [], transactions: [] };
  private listeners: (() => void)[] = [];
  private lang = 'pt-PT';

  async init(): Promise<void> {
    try {
      const raw = localStorage.getItem(FAKE_KEY);
      if (raw) this.store = JSON.parse(raw) as FakeStore;
    } catch {
      /* ignorar */
    }
    this.lang = document.documentElement.lang || 'pt-PT';
  }
  available(): boolean {
    return true;
  }
  product(id: string): StoreProduct | undefined {
    const p = productDef(id);
    return p ? { id, priceString: formatEur(p.priceEur, this.lang) } : undefined;
  }
  hasEntitlement(id: string): boolean {
    return this.store.entitlements.includes(id);
  }
  onChange(cb: () => void): void {
    this.listeners.push(cb);
  }

  purchase(id: string): Promise<PurchaseResult> {
    const p = this.product(id);
    if (!p) return Promise.resolve({ status: 'error' });
    return new Promise((resolve) => {
      const el = overlay(`
        <span class="tag">${escapeHtml(t('iap.fakeTag'))}</span>
        <h2>${escapeHtml(t('iap.fakeTitle'))}</h2>
        <p><b>${escapeHtml(t(`products.${id}`))}</b></p>
        <p style="font-size:22px;font-weight:800">${escapeHtml(p.priceString)}</p>
        <p style="font-size:13px">${escapeHtml(t('iap.fakeNote'))}</p>
        <div><button class="no">${escapeHtml(t('common.cancel'))}</button><button class="ok">${escapeHtml(t('iap.confirm'))}</button></div>`);
      (el.querySelector('.no') as HTMLButtonElement).onclick = () => {
        el.remove();
        resolve({ status: 'cancelled' });
      };
      (el.querySelector('.ok') as HTMLButtonElement).onclick = () => {
        el.remove();
        const tx: Transaction = { productId: id, transactionId: `fake-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: Date.now() };
        this.store.transactions.push(tx);
        if (productDef(id)?.kind === 'nonConsumable' && !this.store.entitlements.includes(id)) this.store.entitlements.push(id);
        this.persist();
        resolve({ status: 'ok', transaction: tx });
      };
    });
  }

  async restore(): Promise<RestoreResult> {
    return { ok: true, entitlements: [...this.store.entitlements], transactions: [...this.store.transactions] };
  }

  private persist(): void {
    try {
      localStorage.setItem(FAKE_KEY, JSON.stringify(this.store));
    } catch {
      /* ignorar */
    }
    this.listeners.forEach((l) => l());
  }
}

// ----------------------------------------------------------------- versão REAL (RevenueCat)

type RC = typeof import('@revenuecat/purchases-capacitor');
type CustomerInfo = import('@revenuecat/purchases-capacitor').CustomerInfo;
type RcProduct = import('@revenuecat/purchases-capacitor').PurchasesStoreProduct;

export class RevenueCatIapService implements IapService {
  private rc: RC | null = null;
  private products = new Map<string, RcProduct>();
  private entitlements: string[] = [];
  private listeners: (() => void)[] = [];

  async init(): Promise<void> {
    if (!env.revenueCatKey) {
      console.warn('[iap] falta VITE_REVENUECAT_PUBLIC_KEY');
      return;
    }
    try {
      this.rc = await import('@revenuecat/purchases-capacitor');
      const { Purchases, PRODUCT_CATEGORY } = this.rc;
      // Só a chave PÚBLICA do SDK entra na app (secção 11.1).
      await Purchases.configure({ apiKey: env.revenueCatKey });
      await Purchases.addCustomerInfoUpdateListener((info) => this.setInfo(info));
      const { customerInfo } = await Purchases.getCustomerInfo();
      this.setInfo(customerInfo);
      const { products } = await Purchases.getProducts({
        productIdentifiers: PRODUCTS.map((p) => p.id),
        type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
      });
      for (const p of products) this.products.set(p.identifier, p);
    } catch (e) {
      console.warn('[iap] RevenueCat indisponível', e);
    }
  }

  private setInfo(info: CustomerInfo): void {
    this.entitlements = Object.keys(info.entitlements.active);
    this.listeners.forEach((l) => l());
  }

  available(): boolean {
    return !!this.rc && this.products.size > 0;
  }
  product(id: string): StoreProduct | undefined {
    const p = this.products.get(id);
    return p ? { id, priceString: p.priceString } : undefined;
  }
  hasEntitlement(id: string): boolean {
    return this.entitlements.includes(id);
  }
  onChange(cb: () => void): void {
    this.listeners.push(cb);
  }

  async purchase(id: string): Promise<PurchaseResult> {
    const product = this.products.get(id);
    if (!this.rc || !product) return { status: 'unavailable' };
    try {
      const res = await this.rc.Purchases.purchaseStoreProduct({ product });
      this.setInfo(res.customerInfo);
      // A RevenueCat só resolve depois de validar o recibo e confirmar (acknowledge) a compra.
      return {
        status: 'ok',
        transaction: {
          productId: res.productIdentifier,
          transactionId: res.transaction.transactionIdentifier,
          date: Date.parse(res.transaction.purchaseDate) || Date.now(),
        },
      };
    } catch (e) {
      const err = e as { userCancelled?: boolean | null; code?: string };
      if (err.userCancelled) return { status: 'cancelled' };
      console.warn('[iap] compra falhou', err.code);
      return { status: 'error' };
    }
  }

  async restore(): Promise<RestoreResult> {
    if (!this.rc) return { ok: false, entitlements: [], transactions: [] };
    try {
      const { customerInfo } = await this.rc.Purchases.restorePurchases();
      this.setInfo(customerInfo);
      return {
        ok: true,
        entitlements: [...this.entitlements],
        transactions: customerInfo.nonSubscriptionTransactions.map((tx) => ({
          productId: tx.productIdentifier,
          transactionId: tx.transactionIdentifier,
          date: Date.parse(tx.purchaseDate) || 0,
        })),
      };
    } catch {
      return { ok: false, entitlements: [], transactions: [] };
    }
  }
}

export function createIapService(): IapService {
  return env.iapMode === 'real' && isNative ? new RevenueCatIapService() : new FakeIapService();
}

export { NO_ADS_ENTITLEMENT };
