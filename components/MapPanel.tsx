"use client";

import { Footprints, MapPin, Truck } from "lucide-react";
import { ZONES } from "@/lib/config";
import type { StateResponse, ZoneId } from "@/lib/types";

export default function MapPanel({
  state,
  now,
  busy,
  onTravel,
}: {
  state: StateResponse;
  now: number;
  busy: boolean;
  onTravel: (to: ZoneId) => void;
}) {
  const { player } = state;
  const travel = player.travel;
  const progress = travel ? Math.min(1, Math.max(0, (now - travel.startedAt) / travel.durationMs)) : 0;
  const dest = travel ? ZONES.find((z) => z.id === travel.to) : null;

  return (
    <section className="rounded-3xl border-2 border-sky-100 bg-white p-4 shadow-[0_6px_0_rgba(56,189,248,0.18)]">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-sky-700">
        <MapPin className="h-5 w-5" /> Bản Đồ Xóm Nhỏ
      </h2>
      <p className="mt-1 text-xs font-bold text-gray-500">
        Vùng liền kề 30s • Đi chéo 50s • Túi trống chỉ 4s đi dạo. Đang chở hàng thì không giao dịch được nha.
      </p>
      {travel && dest && (
        <div className="mt-3 rounded-2xl bg-sky-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-extrabold text-sky-700">
            <Truck className="h-4 w-4 animate-bounce" /> Đang chạy tới {dest.emoji} {dest.name}...
            <span className="ml-auto">{Math.ceil((travel.endsAt - now) / 1000)}s</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-sky-100">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-pink-400 transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs font-bold text-sky-600">
            <Footprints className="h-3 w-3" /> Xe đang lăn bánh, ngồi chill chờ xíu nha ^w^
          </div>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {ZONES.map((z) => {
          const isHere = player.zone === z.id;
          const isDest = travel?.to === z.id;
          return (
            <button
              key={z.id}
              disabled={isHere || !!travel || busy}
              onClick={() => onTravel(z.id)}
              className={`rounded-3xl border-2 p-3 text-left transition active:translate-y-1 ${
                isHere
                  ? "border-pink-300 bg-pink-100 shadow-[0_4px_0_rgba(244,114,182,0.35)]"
                  : isDest
                    ? "border-sky-300 bg-sky-100"
                    : "border-sky-100 bg-sky-50/50 hover:border-sky-300"
              } disabled:opacity-60`}
            >
              <div className="text-2xl">{z.emoji}</div>
              <div className="font-extrabold text-gray-800">{z.name}</div>
              <div className="text-xs font-semibold text-gray-500">{z.desc}</div>
              <div className="mt-1 text-xs font-extrabold text-pink-600">
                {isHere ? "📍 Bạn đang ở đây" : isDest ? "🚚 Đang tới đây..." : "Đi tới đây →"}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
