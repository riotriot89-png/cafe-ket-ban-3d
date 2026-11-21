"use client";

import { ArrowDownRight, ArrowUpRight, Lock, ShoppingBag, TrendingUp } from "lucide-react";
import { ITEMS, ITEM_MAP, WEATHERS, ZONE_MAP } from "@/lib/config";
import { bagCapacity, bagUsed, customerUnitPrice, meltFactor, merchantUnitPrice, sellFeeRate } from "@/lib/shared";
import type { StateResponse } from "@/lib/types";
import ItemImage from "./ItemImage";
import Sparkline from "./Sparkline";

export type MarketSubTab = "merchant" | "customer" | "prices";

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function MarketBoard({
  state,
  now,
  busy,
  onTrade,
  subTab,
  onSubTabChange,
}: {
  state: StateResponse;
  now: number;
  busy: boolean;
  onTrade: (action: "buy_merchant" | "sell_customer", waveIndex: number, offerId: string) => void;
  subTab: MarketSubTab;
  onSubTabChange: (t: MarketSubTab) => void;
}) {
  const { player, market, waves } = state;
  const traveling = !!player.travel;
  const zone = ZONE_MAP[player.zone];
  const weather = WEATHERS.find((w) => w.id === market.weather)!;
  const feeRate = sellFeeRate(player, weather.feeMult);
  const priceOf = (id: string) => market.prices.find((p) => p.itemId === id);
  const hintOf = (id: string) => state.analystHints?.find((h) => h.itemId === id);
  const boughtOffers = player.boughtOffers ?? [];
  const servedCustomers = player.servedCustomers ?? [];

  const tabs: { id: MarketSubTab; label: string }[] = [
    { id: "merchant", label: "🛒 Thương lái" },
    { id: "customer", label: "🧑 Khách mua" },
    { id: "prices", label: "📈 Bảng giá" },
  ];

  return (
    <section className="rounded-3xl border-2 border-pink-100 bg-white p-4 shadow-[0_6px_0_rgba(244,114,182,0.18)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-pink-700">
          <ShoppingBag className="h-5 w-5" /> Chợ Xóm Nhỏ — {zone.emoji} {zone.name}
        </h2>
        <span className="text-xs font-bold text-pink-400">Mua bán theo đợt, mỗi đợt 3 phút ^w^</span>
      </div>
      {traveling && (
        <div className="mb-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
          Đang di chuyển, không giao dịch được đâu — chờ tới nơi đã nha!
        </div>
      )}

      <div className="mb-3 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onSubTabChange(t.id)}
            className={`flex-1 rounded-full py-2 text-sm font-extrabold transition ${
              subTab === t.id ? "bg-pink-500 text-white shadow-[0_3px_0_rgba(190,24,93,0.4)]" : "bg-pink-50 text-pink-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "merchant" && (
        <div>
          <p className="mb-3 rounded-2xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700">
            ⏰ Thương lái đang ở chợ! Đợt mới sau <span className="text-sky-900">{fmtCountdown(waves.merchant.endsAt - now)}</span> — mỗi lô chỉ mua được 1 lần, hết đợt là đi mất đó!
          </p>
          <div className="space-y-3">
            {waves.merchant.merchants.map((m) => (
              <article key={m.id} className="rounded-3xl border-2 border-sky-100 bg-sky-50/40 p-3">
                <h3 className="font-extrabold text-gray-800">
                  {m.emoji} {m.name} <span className="text-xs font-bold text-sky-600">• đang rao hàng</span>
                </h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {m.offers.map((offer) => {
                    const item = ITEM_MAP[offer.itemId];
                    const locked = item.level > player.level;
                    const unit = merchantUnitPrice(offer.itemId, player.zone, offer.factor);
                    const total = unit * offer.qty;
                    const bought = boughtOffers.includes(offer.id);
                    const noRoom = bagUsed(player) + offer.qty * item.slots > bagCapacity(player);
                    const canBuy = !locked && !traveling && !busy && !bought && player.xu >= total && !noRoom;
                    return (
                      <div key={offer.id} className={`rounded-2xl border-2 p-3 ${locked ? "border-gray-100 bg-gray-50 opacity-70" : "border-white bg-white"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <ItemImage itemId={offer.itemId} emoji={item.emoji} className="h-16 w-16 rounded-2xl object-cover" />
                            <div className="mt-1 font-extrabold text-gray-800">{item.name} <span className="text-pink-600">x{offer.qty}</span></div>
                            <div className="text-xs font-semibold text-gray-500">
                              {item.slots * offer.qty} ô • Gốc {item.base.toLocaleString("vi-VN")} Xu • Lv.{item.level}
                            </div>
                          </div>
                          {offer.factor < 0.95 && !locked && (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-extrabold text-emerald-700">Hời! ✨</span>
                          )}
                          {locked && (
                            <span className="flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-[11px] font-bold text-gray-600">
                              <Lock className="h-3 w-3" /> Lv.{item.level}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm font-bold text-gray-600">
                          {unit.toLocaleString("vi-VN")} Xu/món • Tổng <span className="text-lg font-extrabold text-pink-600">{total.toLocaleString("vi-VN")} Xu</span>
                        </div>
                        <button
                          disabled={!canBuy}
                          onClick={() => onTrade("buy_merchant", waves.merchant.waveIndex, offer.id)}
                          className="mt-2 w-full rounded-full bg-pink-500 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_rgba(190,24,93,0.4)] transition active:translate-y-1 active:shadow-none disabled:opacity-40"
                        >
                          {bought ? "Đã mua lô này rồi ✓" : locked ? "Chưa mở khóa" : player.xu < total ? "Không đủ Xu" : noRoom ? "Túi không đủ chỗ" : `Mua cả lô • ${total.toLocaleString("vi-VN")} Xu`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {subTab === "customer" && (
        <div>
          <p className="mb-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            ⏰ Khách đang đi chợ! Đợt mới sau <span className="text-emerald-900">{fmtCountdown(waves.customer.endsAt - now)}</span> — mỗi khách chỉ mua 1 lần, bán đúng món đúng số lượng họ cần nha!
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {waves.customer.customers.map((c) => {
              const offer = c.offer;
              const item = ITEM_MAP[offer.itemId];
              const locked = item.level > player.level;
              const lot = player.inventory.find((l) => l.itemId === offer.itemId);
              const owned = lot?.qty ?? 0;
              const melt = lot ? meltFactor(offer.itemId, lot.acquiredAt, now, weather.meltMult) : 1;
              const unit = Math.round(customerUnitPrice(offer.itemId, player.zone, offer.factor) * melt);
              const gross = unit * offer.qty;
              const revenue = gross - Math.round(gross * feeRate);
              const profit = lot ? revenue - lot.avgCost * offer.qty : 0;
              const served = servedCustomers.includes(offer.id);
              const canSell = !locked && !traveling && !busy && !served && owned >= offer.qty;
              return (
                <article key={c.id} className={`rounded-3xl border-2 p-3 ${locked ? "border-gray-100 bg-gray-50 opacity-70" : "border-emerald-100 bg-emerald-50/40"}`}>
                  <h3 className="font-extrabold text-gray-800">
                    {c.emoji} {c.name} <span className="text-xs font-bold text-emerald-600">• muốn mua</span>
                  </h3>
                  <div className="mt-2 flex items-start gap-2">
                    <ItemImage itemId={offer.itemId} emoji={item.emoji} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                    <div>
                      <div className="font-extrabold text-gray-800">{item.name} <span className="text-pink-600">x{offer.qty}</span></div>
                      <div className="text-xs font-semibold text-gray-500">Gốc {item.base.toLocaleString("vi-VN")} Xu • Lv.{item.level} • Bạn đang có: {owned} món</div>
                    </div>
                    {locked && (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-[11px] font-bold text-gray-600">
                        <Lock className="h-3 w-3" /> Lv.{item.level}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-bold text-gray-600">
                    Khách trả <span className="text-lg font-extrabold text-emerald-600">{unit.toLocaleString("vi-VN")} Xu/món</span>
                  </div>
                  <div className="text-xs font-bold text-gray-500">
                    Thu về sau phí: {revenue.toLocaleString("vi-VN")} Xu
                    {lot && owned >= offer.qty && (
                      <>
                        {" • "}
                        <span className={profit >= 0 ? "text-emerald-600" : "text-rose-500"}>
                          {profit >= 0 ? `Lãi ${profit.toLocaleString("vi-VN")} Xu` : `Lỗ ${Math.abs(profit).toLocaleString("vi-VN")} Xu`}
                        </span>
                      </>
                    )}
                    {melt < 1 && <span className="text-sky-600"> • Kem đang tan, bán nhanh đi!</span>}
                  </div>
                  <button
                    disabled={!canSell}
                    onClick={() => onTrade("sell_customer", waves.customer.waveIndex, offer.id)}
                    className="mt-2 w-full rounded-full bg-emerald-500 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_rgba(6,95,70,0.4)] transition active:translate-y-1 active:shadow-none disabled:opacity-40"
                  >
                    {served ? "Đã bán cho khách này rồi ✓" : locked ? "Chưa mở khóa" : owned < offer.qty ? `Thiếu hàng (cần ${offer.qty}, có ${owned})` : `Bán cho khách • ${revenue.toLocaleString("vi-VN")} Xu`}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {subTab === "prices" && (
        <div>
          <p className="mb-3 rounded-2xl bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700">
            📈 Bảng giá chỉ để tham khảo — muốn mua thì chờ đợt Thương lái, muốn bán thì chờ đợt Khách mua nha!
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ITEMS.map((item) => {
              const mp = priceOf(item.id);
              const locked = item.level > player.level;
              const owned = player.inventory.find((l) => l.itemId === item.id)?.qty ?? 0;
              const hint = hintOf(item.id);
              const change = mp?.changePct ?? 0;
              return (
                <article key={item.id} className={`rounded-3xl border-2 p-3 ${locked ? "border-gray-100 bg-gray-50 opacity-70" : "border-pink-100 bg-pink-50/40"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <ItemImage itemId={item.id} emoji={item.emoji} className="h-16 w-16 rounded-2xl object-cover" />
                      <h3 className="mt-1 font-extrabold text-gray-800">{item.name}</h3>
                      <p className="text-xs font-semibold text-gray-500">
                        {item.slots} ô • Gốc {item.base.toLocaleString("vi-VN")} Xu • Lv.{item.level}
                      </p>
                    </div>
                    {locked ? (
                      <span className="flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-[11px] font-bold text-gray-600">
                        <Lock className="h-3 w-3" /> Lv.{item.level}
                      </span>
                    ) : (
                      <span className={`flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-extrabold ${change >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
                        {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {change >= 0 ? "+" : ""}
                        {change.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div>
                      <div className="text-2xl font-extrabold text-gray-900">{mp ? mp.price.toLocaleString("vi-VN") : "—"} <span className="text-xs font-bold text-gray-500">Xu</span></div>
                      {hint && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs font-bold text-violet-600">
                          <TrendingUp className="h-3 w-3" /> Thỏ Kiểm Giá: nhịp tới có thể {hint.dir === "up" ? "tăng 📈" : "giảm 📉"}
                        </div>
                      )}
                    </div>
                    <Sparkline data={mp?.history ?? []} />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-amber-700">{item.trait}</p>
                  {item.melt && <p className="text-xs font-bold text-sky-600">🧊 Đang có trong túi sẽ tan dần theo thời gian!</p>}
                  {owned > 0 && <p className="text-xs font-bold text-gray-600">Bạn đang giữ: {owned} món</p>}
                </article>
              );
            })}
          </div>
        </div>
      )}
      <p className="mt-3 text-xs font-semibold text-gray-400">* Giá chợ thay đổi mỗi 10 giây cho cả xóm. Thương lái & khách mua tới theo đợt 3 phút — mua rẻ đợt này, chờ khách trả cao đợt sau mới lời to!</p>
    </section>
  );
}
