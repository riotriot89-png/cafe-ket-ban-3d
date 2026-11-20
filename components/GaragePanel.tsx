"use client";

import { Lock, Truck } from "lucide-react";
import { VEHICLES } from "@/lib/config";
import { activeVehicle } from "@/lib/shared";
import type { StateResponse } from "@/lib/types";

export default function GaragePanel({
  state,
  busy,
  onGarage,
}: {
  state: StateResponse;
  busy: boolean;
  onGarage: (action: "rent" | "buy" | "activate", vehicleId: string) => void;
}) {
  const { player } = state;
  const active = activeVehicle(player);
  const traveling = !!player.travel;
  return (
    <section className="rounded-3xl border-2 border-orange-100 bg-white p-4 shadow-[0_6px_0_rgba(251,146,60,0.18)]">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-orange-700">
        <Truck className="h-5 w-5" /> Gara Xe Chạy Chợ
        <span className="ml-auto text-xs font-bold text-orange-400">Đang dùng: {active.emoji} {active.name}</span>
      </h2>
      <p className="mt-1 text-xs font-bold text-gray-500">Thuê theo chuyến (rẻ, linh hoạt) hoặc mua đứt (dùng lâu dài, khỏi phí thuê).</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {VEHICLES.map((v) => {
          const locked = v.level > player.level;
          const owned = player.vehiclesOwned.includes(v.id);
          const isActive = active.id === v.id;
          const isRental = player.rentalVehicle?.vehicleId === v.id;
          return (
            <article key={v.id} className={`rounded-3xl border-2 p-3 ${isActive ? "border-orange-300 bg-orange-50" : "border-orange-100 bg-orange-50/40"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl">{v.emoji}</div>
                  <h3 className="font-extrabold text-gray-800">{v.name}</h3>
                  <p className="text-xs font-semibold text-gray-500">
                    {v.slots} ô • Tốc độ x{v.speed} • Giảm trộm {Math.round(v.theftCut * 100)}% • Yêu cầu Lv.{v.level}
                  </p>
                </div>
                {locked ? (
                  <span className="flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-[11px] font-bold text-gray-600">
                    <Lock className="h-3 w-3" /> Lv.{v.level}
                  </span>
                ) : isActive ? (
                  <span className="rounded-full bg-orange-500 px-2 py-1 text-[11px] font-extrabold text-white">Đang dùng ✓</span>
                ) : owned ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-extrabold text-emerald-700">Đã mua</span>
                ) : isRental ? (
                  <span className="rounded-full bg-sky-100 px-2 py-1 text-[11px] font-extrabold text-sky-700">Đang thuê</span>
                ) : null}
              </div>
              <div className="mt-2 flex gap-2">
                {v.id !== "basket" && !owned && (
                  <>
                    <button
                      disabled={locked || traveling || busy || player.xu < v.rent}
                      onClick={() => onGarage("rent", v.id)}
                      className="flex-1 rounded-full bg-sky-500 py-2 text-xs font-extrabold text-white shadow-[0_3px_0_rgba(12,74,110,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                    >
                      Thuê {v.rent.toLocaleString("vi-VN")} Xu/chuyến
                    </button>
                    <button
                      disabled={locked || traveling || busy || player.xu < v.buy}
                      onClick={() => onGarage("buy", v.id)}
                      className="flex-1 rounded-full bg-orange-500 py-2 text-xs font-extrabold text-white shadow-[0_3px_0_rgba(154,52,18,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                    >
                      Mua đứt {v.buy.toLocaleString("vi-VN")} Xu
                    </button>
                  </>
                )}
                {owned && !isActive && (
                  <button
                    disabled={traveling || busy}
                    onClick={() => onGarage("activate", v.id)}
                    className="flex-1 rounded-full bg-emerald-500 py-2 text-xs font-extrabold text-white shadow-[0_3px_0_rgba(6,95,70,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                  >
                    Dùng xe này
                  </button>
                )}
                {v.id === "basket" && !isActive && (
                  <button
                    disabled={traveling || busy}
                    onClick={() => onGarage("activate", v.id)}
                    className="flex-1 rounded-full bg-emerald-500 py-2 text-xs font-extrabold text-white shadow-[0_3px_0_rgba(6,95,70,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                  >
                    Dùng giỏ mây
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
