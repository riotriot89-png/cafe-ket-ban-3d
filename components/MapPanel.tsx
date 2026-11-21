"use client";

import { MapPin } from "lucide-react";
import { ITEM_MAP, ZONES, ZONE_MAP } from "@/lib/config";
import { CUSTOMER_AVATARS, MAP_BG, MERCHANT_AVATARS } from "@/lib/images";
import type { StateResponse, ZoneId } from "@/lib/types";
import { ZoneImage } from "./ItemImage";

// Vị trí nút khu trên map (% theo khung): farm trái-trên, bakery phải-trên,
// harbor trái-dưới, gift phải-dưới.
function zoneLeft(x: number): number {
  return 12 + x * 76;
}
function zoneTop(y: number): number {
  return 16 + y * 62;
}
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// Vị trí cố định 3 sạp thương lái quanh quảng trường giữa map.
const MERCHANT_SPOTS = [
  { left: 44, top: 34 },
  { left: 60, top: 40 },
  { left: 50, top: 60 },
];
// Vị trí khách đứng quanh từng khu (4 điểm/khu, nằm trong các hướng trống của
// khu đó — khu ở góc nên neo sát khu sẽ chồng lên nút khu, vì vậy các điểm
// được đặt tay để không chồng nút khu, không chồng sạp thương lái).
const CUSTOMER_SPOTS: Record<ZoneId, { left: number; top: number }[]> = {
  farm: [
    { left: 36, top: 14 },
    { left: 30, top: 36 },
    { left: 12, top: 40 },
    { left: 24, top: 48 },
  ],
  bakery: [
    { left: 64, top: 14 },
    { left: 70, top: 36 },
    { left: 88, top: 40 },
    { left: 76, top: 48 },
  ],
  harbor: [
    { left: 36, top: 78 },
    { left: 30, top: 56 },
    { left: 12, top: 52 },
    { left: 24, top: 44 },
  ],
  gift: [
    { left: 64, top: 78 },
    { left: 70, top: 56 },
    { left: 88, top: 52 },
    { left: 76, top: 44 },
  ],
};
// Tên ngắn để nhãn khu không tràn khỏi khung map.
const SHORT_NAMES: Record<ZoneId, string> = {
  farm: "Vườn Dâu",
  bakery: "Phố Bánh",
  harbor: "Bến Cảng",
  gift: "Quà Tặng",
};

export default function MapPanel({
  state,
  now,
  busy,
  onTravel,
  onGoToCustomers,
  onGoToMerchants,
}: {
  state: StateResponse;
  now: number;
  busy: boolean;
  onTravel: (to: ZoneId) => void;
  onGoToCustomers?: () => void;
  onGoToMerchants?: () => void;
}) {
  const { player, waves } = state;
  const travel = player.travel;
  const servedCustomers = player.servedCustomers ?? [];

  // Marker người chơi: đứng ở khu hiện tại, đang di chuyển thì trượt dần tới khu đích.
  const fromZone = ZONE_MAP[player.zone];
  const toZone = travel ? ZONE_MAP[travel.to] : fromZone;
  const progress = travel ? clamp((now - travel.startedAt) / travel.durationMs, 0, 1) : 0;
  const markerLeft = zoneLeft(fromZone.x) + (zoneLeft(toZone.x) - zoneLeft(fromZone.x)) * progress + 9;
  const markerTop = zoneTop(fromZone.y) + (zoneTop(toZone.y) - zoneTop(fromZone.y)) * progress - 9;

  const customers = waves?.customer?.customers ?? [];
  const merchants = waves?.merchant?.merchants ?? [];
  const customerSpots = CUSTOMER_SPOTS[player.zone];

  return (
    <section className="rounded-3xl border-2 border-sky-100 bg-white p-4 shadow-[0_6px_0_rgba(56,189,248,0.18)]">
      <style>{`@keyframes walk-in { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-sky-700">
        <MapPin className="h-5 w-5" /> Bản Đồ Xóm Nhỏ
      </h2>
      <p className="mt-1 text-xs font-bold text-gray-500">
        Vùng liền kề 30s • Đi chéo 50s • Túi trống chỉ 4s đi dạo. Bấm vào khu để chạy tới, bấm vào khách/thương lái để mở chợ nha!
      </p>

      {/* Khung bản đồ 2D */}
      <div className="relative mt-3 aspect-square overflow-hidden rounded-3xl border-2 border-sky-100 sm:aspect-[16/10]">
        <img src={MAP_BG} alt="Bản đồ xóm nhỏ" className="absolute inset-0 h-full w-full object-cover" draggable={false} />

        {/* Nút 4 khu vực */}
        {ZONES.map((z) => {
          const isHere = player.zone === z.id;
          const isDest = travel?.to === z.id;
          return (
            <button
              key={z.id}
              disabled={isHere || !!travel || busy}
              onClick={() => onTravel(z.id)}
              title={`${z.name} — ${z.desc}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition active:scale-95 disabled:opacity-100"
              style={{ left: `${zoneLeft(z.x)}%`, top: `${zoneTop(z.y)}%` }}
            >
              <span className={`block h-16 w-16 overflow-hidden rounded-2xl border-2 bg-white shadow-md sm:h-20 sm:w-20 ${isHere ? "border-pink-400 ring-2 ring-pink-300" : "border-white"}`}>
                <ZoneImage zoneId={z.id} emoji={z.emoji} className="h-full w-full object-cover" />
              </span>
              <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-1.5 py-0.5 text-[11px] font-extrabold text-gray-700 shadow">
                {z.emoji} {SHORT_NAMES[z.id]}
              </span>
              {isHere && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-pink-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow">
                  📍 Bạn ở đây
                </span>
              )}
              {isDest && (
                <span className="absolute -right-2 -top-2 rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow">
                  🚚
                </span>
              )}
            </button>
          );
        })}

        {/* Sạp thương lái quanh quảng trường */}
        <div key={`m-${waves?.merchant?.waveIndex ?? 0}`} className="absolute inset-0">
          {merchants.map((m, i) => {
            const spot = MERCHANT_SPOTS[i % MERCHANT_SPOTS.length];
            return (
              <button
                key={m.id}
                onClick={onGoToMerchants}
                title={`${m.name} — bấm để mở tab Thương lái`}
                className="absolute z-10 transition active:scale-95"
                style={{ left: `calc(${spot.left}% - 20px)`, top: `calc(${spot.top}% - 20px)` }}
              >
                <span className="block h-10 w-10 overflow-hidden rounded-full border-2 border-amber-200 bg-white shadow-md">
                  <img
                    src={MERCHANT_AVATARS[i % MERCHANT_AVATARS.length]}
                    alt={m.name}
                    className="h-full w-full object-cover animate-bounce"
                    style={{ animationDelay: `${i * 0.25}s` }}
                    draggable={false}
                  />
                </span>
                <span className="absolute left-1/2 top-full mt-0.5 max-w-20 -translate-x-1/2 truncate whitespace-nowrap rounded-full bg-white/90 px-1 py-0.5 text-[10px] font-extrabold text-amber-700 shadow">
                  {m.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Khách ra vào quanh khu người chơi */}
        <div key={`c-${waves?.customer?.waveIndex ?? 0}`} className="absolute inset-0">
          {customers.map((c, i) => {
            const spot = customerSpots[i % customerSpots.length];
            const left = spot.left;
            const top = spot.top;
            const item = ITEM_MAP[c.offer.itemId];
            const served = servedCustomers.includes(c.offer.id);
            return (
              <button
                key={c.id}
                onClick={onGoToCustomers}
                title={`${c.name} muốn mua ${item?.name ?? ""} x${c.offer.qty} — bấm để mở tab Khách mua`}
                className={`absolute z-10 transition active:scale-95 ${served ? "opacity-60" : ""}`}
                style={{ left: `calc(${left}% - 20px)`, top: `calc(${top}% - 20px)`, animation: `walk-in 1s ease-out ${i * 0.15}s both` }}
              >
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-pink-200 bg-white/95 px-1.5 py-0.5 text-[11px] font-extrabold text-gray-700 shadow">
                  {item?.emoji ?? "🛍️"} ×{c.offer.qty}
                </span>
                <span className="relative block h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
                  <img
                    src={CUSTOMER_AVATARS[i % CUSTOMER_AVATARS.length]}
                    alt={c.name}
                    className="h-full w-full object-cover animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                    draggable={false}
                  />
                  {served && (
                    <span className="absolute -right-1 -top-1 text-sm" title="Đã phục vụ rồi">
                      💖
                    </span>
                  )}
                </span>
                <span className="absolute left-1/2 top-full mt-0.5 max-w-20 -translate-x-1/2 truncate whitespace-nowrap rounded-full bg-white/90 px-1 py-0.5 text-[10px] font-extrabold text-pink-600 shadow">
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Marker người chơi */}
        <div
          className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear"
          style={{ left: `${markerLeft}%`, top: `${markerTop}%` }}
          title={player.nickname}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-pink-500 bg-white text-lg shadow-lg">🧺</span>
          <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-pink-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow">
            Bạn
          </span>
        </div>
      </div>

      {/* Thông tin rẻ/đắt từng khu (giữ lại từ bản cũ) */}
      <div className="mt-3 space-y-2">
        {ZONES.map((z) => {
          const cheapNames = Object.keys(z.cheap).map((id) => ITEM_MAP[id]?.name ?? id);
          const bonusNames = Object.keys(z.sellBonus).map((id) => ITEM_MAP[id]?.name ?? id);
          return (
            <div key={z.id} className="rounded-2xl bg-sky-50/70 px-3 py-2 text-xs font-bold text-gray-600">
              <span className="font-extrabold text-gray-800">
                {z.emoji} {z.name}
              </span>
              {cheapNames.length > 0 && <span> • Rẻ: {cheapNames.join(", ")}</span>}
              {bonusNames.length > 0 && <span> • Bán đắt: {bonusNames.join(", ")}</span>}
              {z.buyAll !== 1 && <span> • Nhập hàng ×{z.buyAll}</span>}
              {z.sellAll !== 1 && <span> • Bán +{Math.round((z.sellAll - 1) * 100)}%</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
