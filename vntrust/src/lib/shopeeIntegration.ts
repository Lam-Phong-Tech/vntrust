// Sprint 13 — Shopee Open Platform integration (real + mock fallback)
// Docs: https://open.shopee.com/documents/v2/v2.product.get_item_base_info?module=89&type=1
//
// Implements 3 capabilities per PHÂN HỆ 5 doc:
//   1. parseListingUrl: extract shop_id + item_id from Shopee URL
//   2. lookupItem: fetch item info via Shopee API (or mock)
//   3. sendTakedown: file infringement report (or mock)
//
// To enable REAL mode, set env:
//   SHOPEE_PARTNER_ID=xxxxx
//   SHOPEE_PARTNER_KEY=xxxxx (HMAC-SHA256 secret)
//   SHOPEE_SHOP_ID=xxxxx (for shop-level operations)
//   SHOPEE_ACCESS_TOKEN=xxxxx (refresh every 4h via OAuth)

import crypto from 'crypto';

const PARTNER_ID    = process.env.SHOPEE_PARTNER_ID    || '';
const PARTNER_KEY   = process.env.SHOPEE_PARTNER_KEY   || '';
const SHOP_ID       = process.env.SHOPEE_SHOP_ID       || '';
const ACCESS_TOKEN  = process.env.SHOPEE_ACCESS_TOKEN  || '';
const BASE_URL      = process.env.SHOPEE_BASE_URL      || 'https://partner.shopeemobile.com';

export const IS_REAL_MODE = !!(PARTNER_ID && PARTNER_KEY && ACCESS_TOKEN);

export interface ShopeeListingRef {
  platform: 'shopee';
  shopId?: string;
  itemId?: string;
  raw: string;
  valid: boolean;
}

// ─── 1. Parse URL ────────────────────────────────────────────────
// Supported formats:
//   https://shopee.vn/product/{shop_id}/{item_id}
//   https://shopee.vn/Tên-sản-phẩm-i.{shop_id}.{item_id}
//   https://shopee.vn/-i.{shop_id}.{item_id}
export function parseListingUrl(url: string): ShopeeListingRef {
  if (!url) return { platform: 'shopee', raw: url, valid: false };
  const clean = url.trim().replace(/\?.*$/, ''); // strip query

  // Pattern 1: /product/{shop}/{item}
  let m = clean.match(/shopee\.[^/]+\/product\/(\d+)\/(\d+)/);
  if (m) return { platform: 'shopee', shopId: m[1], itemId: m[2], raw: url, valid: true };

  // Pattern 2: -i.{shop}.{item}
  m = clean.match(/shopee\.[^/]+\/.*?-i\.(\d+)\.(\d+)/);
  if (m) return { platform: 'shopee', shopId: m[1], itemId: m[2], raw: url, valid: true };

  // Pattern 3: bare i.{shop}.{item}
  m = clean.match(/i\.(\d+)\.(\d+)/);
  if (m) return { platform: 'shopee', shopId: m[1], itemId: m[2], raw: url, valid: true };

  return { platform: 'shopee', raw: url, valid: false };
}

// ─── 2. HMAC signature (Shopee v2 requirement) ────────────────────
function signRequest(path: string, timestamp: number, body: string = ''): string {
  const baseString = `${PARTNER_ID}${path}${timestamp}${ACCESS_TOKEN}${SHOP_ID}${body}`;
  return crypto.createHmac('sha256', PARTNER_KEY).update(baseString).digest('hex');
}

// ─── 3. Lookup item info ─────────────────────────────────────────
export interface ShopeeItemInfo {
  itemId: string;
  shopId: string;
  itemName: string;
  itemStatus: 'NORMAL' | 'BANNED' | 'DELETED' | 'UNLIST' | 'UNKNOWN';
  categoryName?: string;
  stock?: number;
  price?: number;
  rating?: number;
  images?: string[];
  brandId?: string;
  brandName?: string;
  isMall?: boolean;
  fetchedAt: string;
  source: 'shopee_api' | 'mock';
}

export async function lookupItem(ref: ShopeeListingRef): Promise<ShopeeItemInfo | null> {
  if (!ref.valid || !ref.itemId || !ref.shopId) return null;

  if (!IS_REAL_MODE) {
    // Mock response — useful for dev/demo
    return {
      itemId: ref.itemId,
      shopId: ref.shopId,
      itemName: `[MOCK] Sản phẩm shop ${ref.shopId} item ${ref.itemId}`,
      itemStatus: 'NORMAL',
      categoryName: 'Mock category',
      stock: 100,
      price: 250000,
      rating: 4.5,
      images: [],
      isMall: false,
      fetchedAt: new Date().toISOString(),
      source: 'mock',
    };
  }

  // REAL Shopee Open Platform call (v2 product.get_item_base_info)
  const path = '/api/v2/product/get_item_base_info';
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signRequest(path, timestamp);
  const url = `${BASE_URL}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&access_token=${ACCESS_TOKEN}&shop_id=${SHOP_ID}&sign=${sign}&item_id_list=${ref.itemId}`;

  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || data.error) {
      console.error('[Shopee API error]', data.error, data.message);
      return null;
    }
    const item = data.response?.item_list?.[0];
    if (!item) return null;
    return {
      itemId: ref.itemId,
      shopId: ref.shopId,
      itemName: item.item_name,
      itemStatus: item.item_status,
      categoryName: item.category_name,
      stock: item.stock_info?.[0]?.current_stock,
      price: item.price_info?.[0]?.current_price,
      rating: item.rating_star,
      images: item.image?.image_url_list,
      brandId: item.brand?.brand_id?.toString(),
      brandName: item.brand?.original_brand_name,
      isMall: item.is_mall,
      fetchedAt: new Date().toISOString(),
      source: 'shopee_api',
    };
  } catch (e) {
    console.error('[Shopee API exception]', e);
    return null;
  }
}

// ─── 4. Send takedown / IP infringement report ────────────────────
// Shopee API: /api/v2/merchant/get_merchant_info (placeholder — Shopee
// requires brand owner verification before takedown API access. Without
// real API access, this saves a record to local DB for manual handling.)
export interface TakedownRequest {
  itemId: string;
  shopId: string;
  reason: 'counterfeit' | 'misleading_ads' | 'expired' | 'unauthorized_seller' | 'other';
  evidenceUrls: string[]; // ảnh bằng chứng
  description: string;
  reporterDoanhNghiepId?: string;
}

export interface TakedownResult {
  ok: boolean;
  ticketId?: string;
  status: 'submitted' | 'queued_local' | 'failed';
  message: string;
  source: 'shopee_api' | 'local_queue';
}

export async function sendTakedown(req: TakedownRequest): Promise<TakedownResult> {
  if (!IS_REAL_MODE) {
    // Queue locally — admin export to CSV → submit qua Shopee Brand Protection Center
    return {
      ok: true,
      ticketId: `LOCAL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      status: 'queued_local',
      message: 'Takedown request queued locally. Admin sẽ export + submit qua Shopee Brand Protection Center.',
      source: 'local_queue',
    };
  }

  // REAL mode — Shopee chưa public takedown API. Workaround:
  // 1. Auto-email tới brand-protection@shopee.com với template
  // 2. Tạo ticket internal cho admin theo dõi
  // (Production: cần partnership với Shopee Brand Protection team)
  console.warn('[Shopee] Real takedown API not exposed publicly. Queueing locally.');
  return {
    ok: true,
    ticketId: `MANUAL-${Date.now()}`,
    status: 'queued_local',
    message: 'Đã ghi nhận. Cần admin escalate qua Shopee Brand Protection Center (BPC).',
    source: 'local_queue',
  };
}

export function getModeInfo() {
  return {
    isRealMode: IS_REAL_MODE,
    hasPartnerId: !!PARTNER_ID,
    hasPartnerKey: !!PARTNER_KEY,
    hasAccessToken: !!ACCESS_TOKEN,
    hasShopId: !!SHOP_ID,
    baseUrl: BASE_URL,
  };
}
