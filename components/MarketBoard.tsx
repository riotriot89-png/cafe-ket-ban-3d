"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Lock, Minus, Plus, ShoppingBag, TrendingUp } from "lucide-react";
import { ITEMS, ZONE_MAP } from "@/lib/config";
import { buyPrice, sellPrice } from "@/lib/shared";
import type { StateResponse } from "@/lib/types";
import Sparkline from "./Sparkline";

export default function MarketBoard({
  state,
  busy,
  onTrade,
}: {
  state: StateResponse;
  busy: boolean;
  onTrade: (itemId: string, action: "buy" | "sell", qty: number) => void;
}) {
  const { player, market } = state;
  const [qty, setQty] = useState<Record<string, number>>({});
  const traveling = !!player.travel;
  const zone = ZONE_MAP[player.zone];
  const priceOf = (id: string) => market.prices.find((p) => p.itemId === id);
  const hintOf = (id: string) => state.analystHints?.find((h) => h.itemId === id);

  const getQty = (id: string) => qty[id] ?? 1;
  const setItemQty = (id: string, v: number) => setQty((q) => ({ ...q, [id]: Math.max(1, Math.min(99, v)) }));

  return (
    <section className="rounded-3xl border-2 border-pink-100 bg-white p-4 shadow-[0_6px_0_rgba(244,114,182,0.18)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-pink-700">
          <ShoppingBag className="h-5 w-5" /> Chợ Xóm Nhỏ — {zone.emoji} {zone.name}
        </h2>
        <span className="text-xs font-bold text-pink-400">Giá cập nhật mỗi 10 giây cho cả xóm ^w^</span>
      </div>
      {traveling && (
        <div className="mb-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
          Đang di chuyển, không giao dịch được đâu — chờ tới nơi đã nha!
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ITEMS.map((item) => {
          const mp = priceOf(item.id);
          const locked = item.level > player.level;
          const bp = mp ? buyPrice(item.id, player.zone, mp.price) : item.base;
          const sp = mp ? sellPrice(item.id, player.zone, mp.price) : item.base;
          const owned = player.inventory.find((l) => l.itemId === item.id)?.qty ?? 0;
          const hint = hintOf(item.id);
          const change = mp?.changePct ?? 0;
          const q = getQty(item.id);
          const canBuy = !locked && !traveling && !busy && player.xu >= bp * q;
          const canSell = !locked && !traveling && !busy && owned >= q;
          return (
            <article key={item.id} className={`rounded-3xl border-2 p-3 ${locked ? "border-gray-100 bg-gray-50 opacity-70" : "border-pink-100 bg-pink-50/40"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-2xl leading-none">{item.emoji}</div>
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
                  <div className="text-xs font-bold text-gray-500">
                    Mua <span className="text-pink-600">{bp.toLocaleString("vi-VN")}</span> • Bán <span className="text-emerald-600">{sp.toLocaleString("vi-VN")}</span> Xu
                  </div>
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

              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center rounded-full border-2 border-pink-200 bg-white">
                  <button aria-label="Giảm" className="p-1.5 text-pink-600 hover:text-pink-800 disabled:opacity-40" disabled={q <= 1} onClick={() => setItemQty(item.id, q - 1)}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-extrabold">{q}</span>
                  <button aria-label="Tăng" className="p-1.5 text-pink-600 hover:text-pink-800" onClick={() => setItemQty(item.id, q + 1)}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  disabled={!canBuy}
                  onClick={() => onTrade(item.id, "buy", q)}
                  className="flex-1 rounded-full bg-pink-500 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_rgba(190,24,93,0.4)] transition active:translate-y-1 active:shadow-none disabled:opacity-40"
                >
                  Mua • {(bp * q).toLocaleString("vi-VN")} Xu
                </button>
                <button
                  disabled={!canSell}
                  onClick={() => onTrade(item.id, "sell", q)}
                  className="flex-1 rounded-full bg-emerald-500 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_rgba(6,95,70,0.4)] transition active:translate-y-1 active:shadow-none disabled:opacity-40"
                >
                  Bán • {(sp * q).toLocaleString("vi-VN")} Xu
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-semibold text-gray-400">* Giá mua/bán đã tính hệ số khu vực bạn đang đứng. Mua nhiều làm giá tăng, bán xả làm giá giảm — cả xóm cùng chịu chung nhịp giá.</p>
    </section>
  );
}
