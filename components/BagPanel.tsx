"use client";

import { Backpack, Snowflake } from "lucide-react";
import { ITEM_MAP, WEATHERS } from "@/lib/config";
import { meltFactor, sellPrice } from "@/lib/shared";
import type { StateResponse } from "@/lib/types";

export default function BagPanel({
  state,
  now,
  busy,
  onSell,
}: {
  state: StateResponse;
  now: number;
  busy: boolean;
  onSell: (itemId: string, qty: number) => void;
}) {
  const { player, market } = state;
  const weather = WEATHERS.find((w) => w.id === market.weather)!;
  const priceOf = (id: string) => market.prices.find((p) => p.itemId === id)?.price ?? ITEM_MAP[id].base;

  return (
    <section className="rounded-3xl border-2 border-amber-100 bg-white p-4 shadow-[0_6px_0_rgba(245,158,11,0.18)]">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-amber-700">
        <Backpack className="h-5 w-5" /> Túi Mù Của Bạn
        <span className="ml-auto text-sm font-bold text-amber-500">
          {state.bagSlotsUsed}/{state.bagSlotsTotal} ô
        </span>
      </h2>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-amber-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-pink-400 transition-all"
          style={{ width: `${state.bagSlotsTotal ? Math.min(100, (state.bagSlotsUsed / state.bagSlotsTotal) * 100) : 0}%` }}
        />
      </div>
      {player.inventory.length === 0 ? (
        <p className="mt-3 text-sm font-bold text-gray-400">Túi đang trống trơn... Mua vài món ở chợ rồi chạy hàng đi bán lời nha! (Túi trống thì di chuyển chỉ mất 4 giây đó UwU)</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {player.inventory.map((lot) => {
            const item = ITEM_MAP[lot.itemId];
            const melt = meltFactor(lot.itemId, lot.acquiredAt, now, weather.meltMult);
            const unitSell = Math.round(sellPrice(lot.itemId, player.zone, priceOf(lot.itemId)) * melt);
            const profitPct = ((unitSell - lot.avgCost) / lot.avgCost) * 100;
            return (
              <li key={lot.itemId} className="flex items-center gap-3 rounded-2xl border-2 border-amber-100 bg-amber-50/50 px-3 py-2">
                <span className="text-2xl">{item.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-extrabold text-gray-800">
                    {item.name} <span className="text-pink-600">x{lot.qty}</span>
                  </div>
                  <div className="text-xs font-bold text-gray-500">
                    Vốn TB {lot.avgCost.toLocaleString("vi-VN")} • Bán {unitSell.toLocaleString("vi-VN")} Xu/món •{" "}
                    <span className={profitPct >= 0 ? "text-emerald-600" : "text-rose-500"}>
                      {profitPct >= 0 ? "+" : ""}
                      {profitPct.toFixed(1)}%
                    </span>
                  </div>
                  {melt < 1 && (
                    <div className="flex items-center gap-1 text-xs font-bold text-sky-600">
                      <Snowflake className="h-3 w-3" /> Đang tan! Đã mất {Math.round((1 - melt) * 100)}% giá trị — bán nhanh đi!
                    </div>
                  )}
                </div>
                <button
                  disabled={busy || !!player.travel}
                  onClick={() => onSell(lot.itemId, lot.qty)}
                  className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-[0_3px_0_rgba(6,95,70,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                >
                  Bán hết
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
