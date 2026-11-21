"use client";

import { ITEM_MAP, ZONES, ZONE_MAP } from "@/lib/config";
import { CUSTOMER_AVATARS, MAP_BG, MERCHANT_AVATARS, PLAYER_SPRITE } from "@/lib/images";
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
  onOpenMerchant,
  onOpenCustomer,
}: {
  state: StateResponse;
  now: number;
  busy: boolean;
  onTravel: (to: ZoneId) => void;
  onOpenMerchant: (waveIndex: number, merchantIdx: number) => void;
  onOpenCustomer: (waveIndex: number, customerIdx: number) => void;
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
    <section className="relative h-full overflow-hidden">
      <style>{`@keyframes walk-in { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }`}</style>

      {/* Nền bản đồ 2D lấp đầy cả khung */}
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

      {/* Sạp thương lái quanh quảng trường — bấm để mở sheet đúng thương lái đó */}
      <div key={`m-${waves?.merchant?.waveIndex ?? 0}`} className="absolute inset-0">
        {merchants.map((m, i) => {
          const spot = MERCHANT_SPOTS[i % MERCHANT_SPOTS.length];
          return (
            <button
              key={m.id}
              onClick={() => onOpenMerchant(waves.merchant.waveIndex, i)}
              title={`${m.name} — bấm để xem hàng của ${m.name}`}
              className="absolute z-10 transition active:scale-95"
              style={{ left: `calc(${spot.left}% - 20px)`, top: `calc(${spot.top}% - 20px)` }}
            >
              <span className="block h-10 w-10 overflow-hidden rounded-full border-2 border-amber-200 bg-white shadow-md">
                <img
                  src={MERCHANT_AVATARS[i % MERCHANT_AVATARS.length]}
                  alt={m.name}
                  className="h-full w-full animate-bounce object-cover"
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

      {/* Khách ra vào quanh khu người chơi — bấm để mở sheet đúng khách đó */}
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
              onClick={() => onOpenCustomer(waves.customer.waveIndex, i)}
              title={`${c.name} muốn mua ${item?.name ?? ""} x${c.offer.qty} — bấm để bán cho ${c.name}`}
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
                  className="h-full w-full animate-bounce object-cover"
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

      {/* Marker người chơi: ảnh nhân vật tròn, trượt dần khi di chuyển */}
      <div
        className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear"
        style={{ left: `${markerLeft}%`, top: `${markerTop}%` }}
        title={player.nickname}
      >
        <img
          src={PLAYER_SPRITE}
          alt={player.nickname}
          className="h-11 w-11 rounded-full border-2 border-pink-500 bg-white object-cover shadow-lg"
          draggable={false}
        />
        <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-pink-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow">
          Bạn
        </span>
      </div>

      {/* Dải thông tin rẻ/bán đắt từng khu — phủ dưới map, cuộn ngang */}
      <div className="absolute bottom-2 left-2 right-2 z-20 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ZONES.map((z) => {
          const cheapEmojis = Object.keys(z.cheap)
            .map((id) => ITEM_MAP[id]?.emoji ?? "")
            .join("");
          const bonusEmojis = Object.keys(z.sellBonus)
            .map((id) => ITEM_MAP[id]?.emoji ?? "")
            .join("");
          return (
            <span key={z.id} className="shrink-0 whitespace-nowrap rounded-full border border-sky-100 bg-white/90 px-2 py-1 text-[10px] font-extrabold text-gray-600 shadow backdrop-blur">
              {z.emoji} {SHORT_NAMES[z.id]}
              {cheapEmojis && <span> · Rẻ {cheapEmojis}</span>}
              {bonusEmojis && <span> · Bán {bonusEmojis}</span>}
              {z.buyAll !== 1 && <span> · Nhập ×{z.buyAll}</span>}
              {z.sellAll !== 1 && <span> · Bán +{Math.round((z.sellAll - 1) * 100)}%</span>}
            </span>
          );
        })}
      </div>
    </section>
  );
}
