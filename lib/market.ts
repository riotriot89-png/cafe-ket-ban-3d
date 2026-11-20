// Động cơ thị trường: giá đồng bộ theo nhịp 10s cho mọi người chơi.
// Giá = dao động seeded noise + lệch cung/cầu (lưu trong store) + hệ số thời tiết/sự kiện.
import {
  EVENT_MS,
  ITEMS,
  ITEM_MAP,
  MARKET_EVENTS,
  TICK_MS,
  WEATHER_MS,
  WEATHERS,
} from "./config";
import { seededNoise } from "./util";
import type { MarketPrice, MarketSnapshot } from "./types";

export interface MarketState {
  tick: number;
  offsets: Record<string, number>; // lệch cung/cầu theo item, -0.5..0.5
  history: Record<string, number[]>; // 10 giá gần nhất / item
}

export function emptyMarketState(): MarketState {
  const offsets: Record<string, number> = {};
  const history: Record<string, number[]> = {};
  for (const it of ITEMS) {
    offsets[it.id] = 0;
    history[it.id] = [];
  }
  return { tick: -1, offsets, history };
}

export function weatherAt(now: number) {
  const idx = Math.floor(now / WEATHER_MS) % WEATHERS.length;
  const w = WEATHERS[idx];
  const endsAt = (Math.floor(now / WEATHER_MS) + 1) * WEATHER_MS;
  return { weather: w, endsAt };
}

export function eventAt(now: number) {
  const idx = Math.floor(now / EVENT_MS) % MARKET_EVENTS.length;
  const e = MARKET_EVENTS[idx];
  const endsAt = (Math.floor(now / EVENT_MS) + 1) * EVENT_MS;
  return { event: e, endsAt };
}

export function tickIndex(now: number): number {
  return Math.floor(now / TICK_MS);
}

// Hệ số giá của 1 item theo thời tiết + sự kiện (nhân các tag khớp, itemId khớp được ưu tiên).
export function itemMultiplier(itemId: string, weatherIdx: number, eventIdx: number): number {
  const item = ITEM_MAP[itemId];
  let mult = 1;
  const w = WEATHERS[weatherIdx % WEATHERS.length];
  const e = MARKET_EVENTS[eventIdx % MARKET_EVENTS.length];
  for (const tag of item.tags) {
    if (w.itemMult[tag] !== undefined) mult *= w.itemMult[tag];
    if (e.itemMult[tag] !== undefined) mult *= e.itemMult[tag];
  }
  if (w.itemMult[itemId] !== undefined) mult *= w.itemMult[itemId];
  if (e.itemMult[itemId] !== undefined) mult *= e.itemMult[itemId];
  if (e.itemMult["*"] !== undefined) mult *= e.itemMult["*"];
  return mult;
}

export function priceAtTick(itemId: string, tick: number, offset: number, now: number): number {
  const item = ITEM_MAP[itemId];
  const wIdx = Math.floor(now / WEATHER_MS) % WEATHERS.length;
  const eIdx = Math.floor(now / EVENT_MS) % MARKET_EVENTS.length;
  const w = WEATHERS[wIdx];
  const mid = (item.min + item.max) / 2;
  const amp = (item.max - item.min) / 2;
  const noise = seededNoise(`price:${itemId}`, tick) * w.volatility;
  let price = mid + noise * amp;
  price *= 1 + offset;
  price *= itemMultiplier(itemId, wIdx, eIdx);
  return Math.round(Math.max(item.min * 0.7, Math.min(item.max * 1.3, price)));
}

// Tiến nhịp thị trường: hồi lệch cung/cầu 10%/nhịp, ghi lịch sử giá.
export function advanceMarket(state: MarketState, now: number): MarketState {
  const target = tickIndex(now);
  if (state.tick >= target) return state;
  const next: MarketState = {
    tick: state.tick,
    offsets: { ...state.offsets },
    history: Object.fromEntries(Object.entries(state.history).map(([k, v]) => [k, [...v]])),
  };
  const gap = target - state.tick;
  if (gap > 50) {
    // Server mới khởi động / lâu không có request: lệch cũ đã hồi hết về 0,
    // tính thẳng 10 nhịp gần nhất thay vì replay hàng triệu nhịp.
    for (const it of ITEMS) {
      next.offsets[it.id] = 0;
      const h: number[] = [];
      for (let t = target - 9; t <= target; t++) {
        h.push(priceAtTick(it.id, t, 0, t * TICK_MS));
      }
      next.history[it.id] = h;
    }
    next.tick = target;
    return next;
  }
  let t = state.tick;
  while (t < target) {
    t += 1;
    for (const it of ITEMS) {
      next.offsets[it.id] = (next.offsets[it.id] ?? 0) * 0.9;
      const p = priceAtTick(it.id, t, next.offsets[it.id], t * TICK_MS);
      const h = next.history[it.id] ?? [];
      h.push(p);
      if (h.length > 10) h.shift();
      next.history[it.id] = h;
    }
  }
  next.tick = t;
  return next;
}

export function marketSnapshot(state: MarketState, now: number, seasonId: string, seasonEndsAt: number): MarketSnapshot {
  const tick = tickIndex(now);
  const { weather, endsAt: weatherEndsAt } = weatherAt(now);
  const { event, endsAt: eventEndsAt } = eventAt(now);
  const prices: MarketPrice[] = ITEMS.map((it) => {
    const h = state.history[it.id] ?? [];
    const price = h.length ? h[h.length - 1] : priceAtTick(it.id, tick, state.offsets[it.id] ?? 0, now);
    const prev = h.length > 1 ? h[h.length - 2] : price;
    return {
      itemId: it.id,
      price,
      prev,
      history: [...h],
      changePct: prev ? ((price - prev) / prev) * 100 : 0,
    };
  });
  return {
    tick,
    tickEndsAt: (tick + 1) * TICK_MS,
    prices,
    weather: weather.id,
    weatherEndsAt,
    event: event.id,
    eventEndsAt,
    seasonId,
    seasonEndsAt,
  };
}
