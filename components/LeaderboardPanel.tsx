"use client";

import { Crown, Trophy } from "lucide-react";
import { SHOP_ITEMS } from "@/lib/config";
import type { StateResponse } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPanel({ state }: { state: StateResponse }) {
  const entries = state.leaderboard;
  const season = state.season;
  const hoursLeft = Math.max(0, Math.floor((season.endsAt - state.now) / 3600000));
  return (
    <section className="rounded-3xl border-2 border-yellow-100 bg-white p-4 shadow-[0_6px_0_rgba(250,204,21,0.25)]">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-yellow-700">
        <Trophy className="h-5 w-5" /> Bảng Xếp Hạng Xóm Nhỏ
      </h2>
      <p className="mt-1 text-xs font-bold text-gray-500">
        Mùa {season.id} • Kết thúc sau {hoursLeft} giờ • Xếp theo tài sản kiếm được trong mùa này.
      </p>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm font-bold text-gray-400">Chưa có ai lên bảng... Bạn sẽ là người đầu tiên leo top đó! ^w^</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {entries.map((e, i) => (
            <li
              key={e.playerId}
              className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold ${
                i === 0 ? "bg-yellow-100 text-yellow-900" : i < 3 ? "bg-amber-50 text-gray-800" : "bg-gray-50 text-gray-700"
              } ${e.playerId === state.player.id ? "ring-2 ring-pink-400" : ""}`}
            >
              <span className="w-6 text-center">{MEDALS[i] ?? `#${i + 1}`}</span>
              <span className="flex-1 truncate">
                {i === 0 && <Crown className="mr-1 inline h-4 w-4 text-yellow-600" />}
                {e.nickname}
                {e.title && <span className="ml-1 text-xs text-pink-500">{SHOP_ITEMS.find((s) => s.id === e.title)?.emoji} {SHOP_ITEMS.find((s) => s.id === e.title)?.name}</span>}
                {e.playerId === state.player.id && <span className="ml-1 text-xs text-pink-600">(bạn)</span>}
              </span>
              <span className="text-xs text-gray-500">Lv.{e.level}</span>
              <span className="text-pink-600">{e.seasonScore.toLocaleString("vi-VN")} Xu</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
