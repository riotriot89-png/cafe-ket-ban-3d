// Đợt giao dịch xác định (deterministic): thương lái tới bán / khách mua tới mua.
// Sinh từ thời gian bằng seeded01 nên mọi người chơi thấy giống nhau, không ghi store.
// - Đợt thương lái: bắt đầu đúng mốc WAVE_MS, dài WAVE_MS.
// - Đợt khách mua: lệch nửa đợt (bắt đầu giữa đợt thương lái), dài WAVE_MS.
// Factor là hệ số nhân GIÁ GỐC — hệ số khu vực tính thêm lúc hiển thị/giao dịch.
import {
  CUSTOMER_COUNT,
  CUSTOMER_FACTOR_MAX,
  CUSTOMER_FACTOR_MIN,
  CUSTOMER_NAMES,
  CUSTOMER_QTY_MAX,
  CUSTOMER_QTY_MIN,
  ITEMS,
  MERCHANT_COUNT,
  MERCHANT_FACTOR_MAX,
  MERCHANT_FACTOR_MIN,
  MERCHANT_NAMES,
  MERCHANT_QTY_MAX,
  MERCHANT_QTY_MIN,
  OFFERS_PER_MERCHANT,
  WAVE_MS,
} from "./config";
import { seeded01 } from "./util";
import type { Customer, CustomerOffer, Merchant, MerchantOffer, WavesInfo } from "./types";

export function merchantWaveIndex(now: number): number {
  return Math.floor(now / WAVE_MS);
}

export function customerWaveIndex(now: number): number {
  return Math.floor((now - WAVE_MS / 2) / WAVE_MS);
}

function pickIdx(seed: string, n: number): number {
  return Math.min(n - 1, Math.floor(seeded01(seed, 0) * n));
}

function factorIn(seed: string, min: number, max: number): number {
  return Math.round((min + seeded01(seed, 0) * (max - min)) * 100) / 100;
}

function qtyIn(seed: string, min: number, max: number): number {
  return min + Math.floor(seeded01(seed, 0) * (max - min + 1));
}

export function getMerchantWave(now: number): WavesInfo["merchant"] {
  const waveIndex = merchantWaveIndex(now);
  const startsAt = waveIndex * WAVE_MS;
  const merchants: Merchant[] = [];
  for (let mi = 0; mi < MERCHANT_COUNT; mi++) {
    const who = MERCHANT_NAMES[pickIdx(`merchant:${waveIndex}:${mi}:name`, MERCHANT_NAMES.length)];
    const offers: MerchantOffer[] = [];
    for (let oi = 0; oi < OFFERS_PER_MERCHANT; oi++) {
      const item = ITEMS[pickIdx(`merchant:${waveIndex}:${mi}:${oi}:item`, ITEMS.length)];
      offers.push({
        id: `m:${waveIndex}:${mi}:${oi}`,
        itemId: item.id,
        qty: qtyIn(`merchant:${waveIndex}:${mi}:${oi}:qty`, MERCHANT_QTY_MIN, MERCHANT_QTY_MAX),
        factor: factorIn(`merchant:${waveIndex}:${mi}:${oi}:factor`, MERCHANT_FACTOR_MIN, MERCHANT_FACTOR_MAX),
      });
    }
    merchants.push({ id: `m:${waveIndex}:${mi}`, name: who.name, emoji: who.emoji, offers });
  }
  return { waveIndex, startsAt, endsAt: startsAt + WAVE_MS, merchants };
}

export function getCustomerWave(now: number): WavesInfo["customer"] {
  const waveIndex = customerWaveIndex(now);
  const startsAt = waveIndex * WAVE_MS + WAVE_MS / 2;
  const customers: Customer[] = [];
  for (let ci = 0; ci < CUSTOMER_COUNT; ci++) {
    const who = CUSTOMER_NAMES[pickIdx(`customer:${waveIndex}:${ci}:name`, CUSTOMER_NAMES.length)];
    const item = ITEMS[pickIdx(`customer:${waveIndex}:${ci}:item`, ITEMS.length)];
    const offer: CustomerOffer = {
      id: `c:${waveIndex}:${ci}`,
      itemId: item.id,
      qty: qtyIn(`customer:${waveIndex}:${ci}:qty`, CUSTOMER_QTY_MIN, CUSTOMER_QTY_MAX),
      factor: factorIn(`customer:${waveIndex}:${ci}:factor`, CUSTOMER_FACTOR_MIN, CUSTOMER_FACTOR_MAX),
    };
    customers.push({ id: `c:${waveIndex}:${ci}`, name: who.name, emoji: who.emoji, offer });
  }
  return { waveIndex, startsAt, endsAt: startsAt + WAVE_MS, customers };
}

export function getWaves(now: number): WavesInfo {
  return { merchant: getMerchantWave(now), customer: getCustomerWave(now) };
}

// Lấy đợt theo waveIndex đã cho (để kiểm tra giao dịch cũ): sinh lại đúng đợt đó.
export function getMerchantWaveByIndex(waveIndex: number): WavesInfo["merchant"] {
  return getMerchantWave(waveIndex * WAVE_MS + 1);
}

export function getCustomerWaveByIndex(waveIndex: number): WavesInfo["customer"] {
  return getCustomerWave(waveIndex * WAVE_MS + WAVE_MS / 2 + 1);
}

export function findMerchantOffer(
  wave: WavesInfo["merchant"],
  offerId: string,
): { merchant: Merchant; offer: MerchantOffer } | null {
  for (const m of wave.merchants) {
    const offer = m.offers.find((o) => o.id === offerId);
    if (offer) return { merchant: m, offer };
  }
  return null;
}

export function findCustomerOffer(
  wave: WavesInfo["customer"],
  offerId: string,
): { customer: Customer; offer: CustomerOffer } | null {
  for (const c of wave.customers) {
    if (c.offer.id === offerId) return { customer: c, offer: c.offer };
  }
  return null;
}

// Parse waveIndex từ id lô dạng m:{idx}:... / c:{idx}:... — dùng để tỉa lịch sử đã mua/bán.
export function waveIndexOfOfferId(offerId: string): number | null {
  const parts = offerId.split(":");
  if (parts.length < 2) return null;
  const n = Number(parts[1]);
  return Number.isInteger(n) ? n : null;
}
