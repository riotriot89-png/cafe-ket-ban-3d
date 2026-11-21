"use client";

import { ClipboardList, Gift, RefreshCw } from "lucide-react";
import { ITEM_MAP } from "@/lib/config";
import type { StateResponse } from "@/lib/types";
import ItemImage from "./ItemImage";

export default function QuestsPanel({
  state,
  busy,
  onClaim,
  onReroll,
}: {
  state: StateResponse;
  busy: boolean;
  onClaim: (questId: string) => void;
  onReroll: (questId: string) => void;
}) {
  const { player } = state;
  return (
    <section className="rounded-3xl border-2 border-violet-100 bg-white p-4 shadow-[0_6px_0_rgba(167,139,250,0.18)]">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-violet-700">
        <ClipboardList className="h-5 w-5" /> Đơn Hàng Xóm Nhỏ
        <span className="ml-auto text-xs font-bold text-violet-400">Xong là có đơn mới liền</span>
      </h2>
      <ul className="mt-3 space-y-2">
        {player.quests.map((q) => (
          <li key={q.id} className={`rounded-2xl border-2 px-3 py-2 ${q.done ? "border-emerald-200 bg-emerald-50" : "border-violet-100 bg-violet-50/50"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {q.itemId && ITEM_MAP[q.itemId] && (
                  <ItemImage itemId={q.itemId} emoji={ITEM_MAP[q.itemId].emoji} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0">
                  <div className="font-extrabold text-gray-800">{q.done ? "✅ " : "📋 "}{q.title}</div>
                  <div className="text-xs font-semibold text-gray-500">{q.desc}</div>
                  <div className="mt-1 text-xs font-bold text-violet-600">
                    Thưởng: +{q.rewardXu.toLocaleString("vi-VN")} Xu • +{q.rewardExp} EXP • 🎁 Rương quà
                  </div>
                </div>
              </div>
              <button
                onClick={() => onReroll(q.id)}
                disabled={busy}
                title="Đổi đơn khác"
                className="rounded-full bg-white p-1.5 text-violet-500 shadow-sm transition hover:bg-violet-100 active:translate-y-0.5 disabled:opacity-40"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-violet-100">
                <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }} />
              </div>
              <span className="text-xs font-extrabold text-violet-700">
                {q.progress}/{q.target}
              </span>
              {q.done && !q.claimed && (
                <button
                  onClick={() => onClaim(q.id)}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-[0_3px_0_rgba(6,95,70,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                >
                  <Gift className="h-3.5 w-3.5" /> Nhận thưởng
                </button>
              )}
              {q.claimed && <span className="text-xs font-extrabold text-emerald-600">Đã nhận ✓</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
