"use client";

import { Users } from "lucide-react";
import { STAFF_DEFS } from "@/lib/config";
import type { StateResponse, StaffType } from "@/lib/types";

function staffEffectText(type: StaffType, level: number): string {
  if (type === "analyst") return `Giảm ${level}% phí giao dịch + gợi ý xu hướng giá.`;
  if (type === "guard") return `Giảm ${[0, 25, 35, 50][level]}% tỉ lệ bị trộm vặt.`;
  return `Tự chốt lời hàng lãi ≥30% + tăng ${level * 5}% EXP.`;
}

export default function StaffPanel({
  state,
  busy,
  onStaff,
}: {
  state: StateResponse;
  busy: boolean;
  onStaff: (action: "hire" | "upgrade", staffType: StaffType, mode?: "rent" | "owned") => void;
}) {
  const { player } = state;
  const maxStaff = state.levelInfo.maxStaff;
  return (
    <section className="rounded-3xl border-2 border-teal-100 bg-white p-4 shadow-[0_6px_0_rgba(45,212,191,0.18)]">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-teal-700">
        <Users className="h-5 w-5" /> Đội Nhân Viên Dễ Thương
        <span className="ml-auto text-xs font-bold text-teal-500">
          {player.staff.length}/{maxStaff} người (Lv.{player.level})
        </span>
      </h2>
      <p className="mt-1 text-xs font-bold text-gray-500">Thuê theo ca 5 phút (rẻ, tự hết hạn) hoặc tuyển dài hạn (đắt một lần, ở mãi + nâng cấp được).</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STAFF_DEFS.map((s) => {
          const owned = player.staff.find((m) => m.type === s.type);
          return (
            <article key={s.type} className="rounded-3xl border-2 border-teal-100 bg-teal-50/40 p-3">
              <div className="text-2xl">{s.emoji}</div>
              <h3 className="font-extrabold text-gray-800">{s.name}</h3>
              <p className="text-xs font-semibold text-gray-500">{s.desc}</p>
              {owned ? (
                <div className="mt-2">
                  <div className="text-xs font-extrabold text-teal-700">
                    Cấp {owned.level} • {owned.mode === "rent" ? "Thuê theo ca" : "Tuyển dài hạn"} {staffEffectText(s.type, owned.level)}
                  </div>
                  {owned.mode === "owned" && owned.level < 3 && (
                    <button
                      disabled={busy || player.xu < s.upgrade[owned.level - 1]}
                      onClick={() => onStaff("upgrade", s.type)}
                      className="mt-2 w-full rounded-full bg-teal-500 py-2 text-xs font-extrabold text-white shadow-[0_3px_0_rgba(17,94,89,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                    >
                      Nâng cấp {s.upgrade[owned.level - 1].toLocaleString("vi-VN")} Xu
                    </button>
                  )}
                  {owned.mode === "owned" && owned.level >= 3 && <div className="mt-2 text-xs font-extrabold text-teal-600">Đã đạt cấp tối đa ⭐</div>}
                  {owned.mode === "rent" && owned.expiresAt && (
                    <div className="mt-2 text-xs font-bold text-gray-500">Hết ca sau {Math.max(0, Math.ceil((owned.expiresAt - state.now) / 1000))}s</div>
                  )}
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={busy || player.staff.length >= maxStaff || player.xu < s.rent}
                    onClick={() => onStaff("hire", s.type, "rent")}
                    className="flex-1 rounded-full bg-sky-500 py-2 text-xs font-extrabold text-white shadow-[0_3px_0_rgba(12,74,110,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                  >
                    Thuê {s.rent.toLocaleString("vi-VN")} Xu/ca
                  </button>
                  <button
                    disabled={busy || player.staff.length >= maxStaff || player.xu < s.buy}
                    onClick={() => onStaff("hire", s.type, "owned")}
                    className="flex-1 rounded-full bg-teal-600 py-2 text-xs font-extrabold text-white shadow-[0_3px_0_rgba(17,94,89,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                  >
                    Tuyển {s.buy.toLocaleString("vi-VN")} Xu
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
