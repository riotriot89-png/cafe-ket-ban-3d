"use client";

import { Lock, Sparkles } from "lucide-react";
import { SHOP_ITEMS } from "@/lib/config";
import type { StateResponse } from "@/lib/types";

export default function ShopPanel({
  state,
  busy,
  onShop,
}: {
  state: StateResponse;
  busy: boolean;
  onShop: (action: "buy" | "equip", shopId: string) => void;
}) {
  const { player } = state;
  return (
    <section className="rounded-3xl border-2 border-fuchsia-100 bg-white p-4 shadow-[0_6px_0_rgba(232,121,249,0.18)]">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-fuchsia-700">
        <Sparkles className="h-5 w-5" /> Cửa Hàng Danh Hiệu & Sạp Xinh
      </h2>
      <p className="mt-1 text-xs font-bold text-gray-500">
        Nhiều Xu quá không biết tiêu gì? Mua danh hiệu & trang trí sạp để khoe trên bảng xếp hạng nha!
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHOP_ITEMS.map((s) => {
          const owned = (s.kind === "title" ? player.titlesOwned : player.decorsOwned).includes(s.id);
          const active = (s.kind === "title" ? player.activeTitle : player.activeDecor) === s.id;
          const locked = s.level > player.level;
          return (
            <article key={s.id} className="rounded-3xl border-2 border-fuchsia-100 bg-fuchsia-50/40 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl">{s.emoji}</div>
                  <h3 className="font-extrabold text-gray-800">{s.name}</h3>
                  <p className="text-xs font-semibold text-gray-500">{s.desc}</p>
                  <p className="mt-1 text-xs font-bold text-fuchsia-600">{s.price.toLocaleString("vi-VN")} Xu • Yêu cầu Lv.{s.level}</p>
                </div>
                {locked && (
                  <span className="flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-[11px] font-bold text-gray-600">
                    <Lock className="h-3 w-3" /> Lv.{s.level}
                  </span>
                )}
              </div>
              <div className="mt-2">
                {!owned ? (
                  <button
                    disabled={locked || busy || player.xu < s.price}
                    onClick={() => onShop("buy", s.id)}
                    className="w-full rounded-full bg-fuchsia-500 py-2 text-xs font-extrabold text-white shadow-[0_3px_0_rgba(134,25,143,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                  >
                    Mua {s.price.toLocaleString("vi-VN")} Xu
                  </button>
                ) : active ? (
                  <span className="block w-full rounded-full bg-emerald-100 py-2 text-center text-xs font-extrabold text-emerald-700">Đang trang bị ✓</span>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => onShop("equip", s.id)}
                    className="w-full rounded-full bg-emerald-500 py-2 text-xs font-extrabold text-white shadow-[0_3px_0_rgba(6,95,70,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                  >
                    Trang bị
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
