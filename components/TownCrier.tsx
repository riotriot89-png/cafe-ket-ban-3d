"use client";

import { Megaphone } from "lucide-react";
import { MARKET_EVENTS, WEATHERS } from "@/lib/config";
import type { MarketSnapshot } from "@/lib/types";

function fmtLeft(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}p${String(r).padStart(2, "0")}s` : `${r}s`;
}

export default function TownCrier({ market, now }: { market: MarketSnapshot; now: number }) {
  const w = WEATHERS.find((x) => x.id === market.weather)!;
  const e = MARKET_EVENTS.find((x) => x.id === market.event)!;
  const ticker = [
    `Thời tiết: ${w.emoji} ${w.name} — đổi sau ${fmtLeft(market.weatherEndsAt - now)}`,
    `Sự kiện: ${e.emoji} ${e.name} — ${e.desc}`,
    `Nhịp giá mới sau ${fmtLeft(market.tickEndsAt - now)} — canh bảng giá mà mua thấp bán cao nha!`,
    `Mùa ${market.seasonId} kết thúc sau ${Math.floor((market.seasonEndsAt - now) / 3600000)} giờ — tranh thủ leo top!`,
  ].join("  •  ");
  return (
    <div className="rounded-3xl border-2 border-amber-100 bg-gradient-to-r from-amber-50 via-pink-50 to-amber-50 px-3 py-2 shadow-[0_6px_0_rgba(244,114,182,0.15)]">
      <div className="flex flex-nowrap items-center gap-x-5 gap-y-1 overflow-x-auto whitespace-nowrap text-sm font-bold text-amber-900 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="flex items-center gap-1.5">
          <Megaphone className="h-4 w-4 text-pink-500" />
          <span className="text-pink-600">Loa Phường Xóm Nhỏ</span>
        </span>
        <span title={w.desc}>
          {w.emoji} {w.name}
          <span className="ml-1 rounded-full bg-white/80 px-2 py-0.5 text-xs text-amber-700">đổi sau {fmtLeft(market.weatherEndsAt - now)}</span>
        </span>
        <span title={e.desc}>
          {e.emoji} {e.name}
          <span className="ml-1 rounded-full bg-white/80 px-2 py-0.5 text-xs text-amber-700">đổi sau {fmtLeft(market.eventEndsAt - now)}</span>
        </span>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-amber-700">
          Nhịp giá sau {fmtLeft(market.tickEndsAt - now)}
        </span>
      </div>
      <div className="mt-2 hidden overflow-hidden whitespace-nowrap text-[13px] font-semibold text-pink-700 sm:block">
        <div className="inline-block animate-[marquee_28s_linear_infinite]">{ticker} &nbsp; • &nbsp; {ticker}</div>
      </div>
    </div>
  );
}
