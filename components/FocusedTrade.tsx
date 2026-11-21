"use client";

import { Lock } from "lucide-react";
import { ITEM_MAP, WEATHERS } from "@/lib/config";
import { bagCapacity, bagUsed, customerUnitPrice, meltFactor, merchantUnitPrice, sellFeeRate } from "@/lib/shared";
import type { Customer, Merchant, StateResponse } from "@/lib/types";
import ItemImage from "./ItemImage";

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Nội dung sheet tập trung cho 1 thương lái (mở từ chip thương lái trên map).
// Logic mua lô y hệt MarketBoard — chỉ hiện đúng thương lái này.
export function FocusedMerchant({
  state,
  now,
  busy,
  merchant,
  avatar,
  onTrade,
}: {
  state: StateResponse;
  now: number;
  busy: boolean;
  merchant: Merchant;
  avatar: string;
  onTrade: (action: "buy_merchant", waveIndex: number, offerId: string) => void;
}) {
  const { player, waves } = state;
  const traveling = !!player.travel;
  const boughtOffers = player.boughtOffers ?? [];
  return (
    <div>
      <p className="mb-3 rounded-2xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700">
        ⏰ Đợt mới sau <span className="text-sky-900">{fmtCountdown(waves.merchant.endsAt - now)}</span> — mỗi lô chỉ mua được 1 lần, hết đợt là đi mất đó!
      </p>
      <div className="mb-3 flex items-center gap-2">
        <img src={avatar} alt={merchant.name} className="h-12 w-12 rounded-full border-2 border-amber-200 bg-white object-cover" draggable={false} />
        <div>
          <div className="font-extrabold text-gray-800">
            {merchant.emoji} {merchant.name}
          </div>
          <div className="text-xs font-bold text-sky-600">Đang rao hàng ở quảng trường</div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {merchant.offers.map((offer) => {
          const item = ITEM_MAP[offer.itemId];
          const locked = item.level > player.level;
          const unit = merchantUnitPrice(offer.itemId, player.zone, offer.factor);
          const total = unit * offer.qty;
          const bought = boughtOffers.includes(offer.id);
          const noRoom = bagUsed(player) + offer.qty * item.slots > bagCapacity(player);
          const canBuy = !locked && !traveling && !busy && !bought && player.xu >= total && !noRoom;
          return (
            <div key={offer.id} className={`rounded-2xl border-2 p-3 ${locked ? "border-gray-100 bg-gray-50 opacity-70" : "border-white bg-white"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <ItemImage itemId={offer.itemId} emoji={item.emoji} className="h-16 w-16 rounded-2xl object-cover" />
                  <div className="mt-1 font-extrabold text-gray-800">
                    {item.name} <span className="text-pink-600">x{offer.qty}</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-500">
                    {item.slots * offer.qty} ô • Gốc {item.base.toLocaleString("vi-VN")} Xu • Lv.{item.level}
                  </div>
                </div>
                {offer.factor < 0.95 && !locked && (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-extrabold text-emerald-700">Hời! ✨</span>
                )}
                {locked && (
                  <span className="flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-[11px] font-bold text-gray-600">
                    <Lock className="h-3 w-3" /> Lv.{item.level}
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm font-bold text-gray-600">
                {unit.toLocaleString("vi-VN")} Xu/món • Tổng <span className="text-lg font-extrabold text-pink-600">{total.toLocaleString("vi-VN")} Xu</span>
              </div>
              <button
                disabled={!canBuy}
                onClick={() => onTrade("buy_merchant", waves.merchant.waveIndex, offer.id)}
                className="mt-2 w-full rounded-full bg-pink-500 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_rgba(190,24,93,0.4)] transition active:translate-y-1 active:shadow-none disabled:opacity-40"
              >
                {bought ? "Đã mua lô này rồi ✓" : locked ? "Chưa mở khóa" : player.xu < total ? "Không đủ Xu" : noRoom ? "Túi không đủ chỗ" : `Mua cả lô • ${total.toLocaleString("vi-VN")} Xu`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Nội dung sheet tập trung cho 1 khách mua (mở từ chip khách trên map).
// Logic bán y hệt MarketBoard — chỉ hiện đúng khách này.
export function FocusedCustomer({
  state,
  now,
  busy,
  customer,
  avatar,
  onTrade,
}: {
  state: StateResponse;
  now: number;
  busy: boolean;
  customer: Customer;
  avatar: string;
  onTrade: (action: "sell_customer", waveIndex: number, offerId: string) => void;
}) {
  const { player, market, waves } = state;
  const traveling = !!player.travel;
  const weather = WEATHERS.find((w) => w.id === market.weather)!;
  const feeRate = sellFeeRate(player, weather.feeMult);
  const servedCustomers = player.servedCustomers ?? [];
  const offer = customer.offer;
  const item = ITEM_MAP[offer.itemId];
  const locked = item.level > player.level;
  const lot = player.inventory.find((l) => l.itemId === offer.itemId);
  const owned = lot?.qty ?? 0;
  const melt = lot ? meltFactor(offer.itemId, lot.acquiredAt, now, weather.meltMult) : 1;
  const unit = Math.round(customerUnitPrice(offer.itemId, player.zone, offer.factor) * melt);
  const gross = unit * offer.qty;
  const revenue = gross - Math.round(gross * feeRate);
  const profit = lot ? revenue - lot.avgCost * offer.qty : 0;
  const served = servedCustomers.includes(offer.id);
  const canSell = !locked && !traveling && !busy && !served && owned >= offer.qty;
  return (
    <div>
      <p className="mb-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
        ⏰ Đợt mới sau <span className="text-emerald-900">{fmtCountdown(waves.customer.endsAt - now)}</span> — mỗi khách chỉ mua 1 lần, bán đúng món đúng số lượng họ cần nha!
      </p>
      <div className="mb-3 flex items-center gap-2">
        <img src={avatar} alt={customer.name} className="h-12 w-12 rounded-full border-2 border-emerald-200 bg-white object-cover" draggable={false} />
        <div>
          <div className="font-extrabold text-gray-800">
            {customer.emoji} {customer.name}
          </div>
          <div className="text-xs font-bold text-emerald-600">Muốn mua hàng của bạn</div>
        </div>
      </div>
      <article className={`rounded-3xl border-2 p-3 ${locked ? "border-gray-100 bg-gray-50 opacity-70" : "border-emerald-100 bg-emerald-50/40"}`}>
        <div className="flex items-start gap-2">
          <ItemImage itemId={offer.itemId} emoji={item.emoji} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
          <div>
            <div className="font-extrabold text-gray-800">
              {item.name} <span className="text-pink-600">x{offer.qty}</span>
            </div>
            <div className="text-xs font-semibold text-gray-500">
              Gốc {item.base.toLocaleString("vi-VN")} Xu • Lv.{item.level} • Bạn đang có: {owned} món
            </div>
          </div>
          {locked && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-[11px] font-bold text-gray-600">
              <Lock className="h-3 w-3" /> Lv.{item.level}
            </span>
          )}
        </div>
        <div className="mt-2 text-sm font-bold text-gray-600">
          Khách trả <span className="text-lg font-extrabold text-emerald-600">{unit.toLocaleString("vi-VN")} Xu/món</span>
        </div>
        <div className="text-xs font-bold text-gray-500">
          Thu về sau phí: {revenue.toLocaleString("vi-VN")} Xu
          {lot && owned >= offer.qty && (
            <>
              {" • "}
              <span className={profit >= 0 ? "text-emerald-600" : "text-rose-500"}>
                {profit >= 0 ? `Lãi ${profit.toLocaleString("vi-VN")} Xu` : `Lỗ ${Math.abs(profit).toLocaleString("vi-VN")} Xu`}
              </span>
            </>
          )}
          {melt < 1 && <span className="text-sky-600"> • Kem đang tan, bán nhanh đi!</span>}
        </div>
        <button
          disabled={!canSell}
          onClick={() => onTrade("sell_customer", waves.customer.waveIndex, offer.id)}
          className="mt-2 w-full rounded-full bg-emerald-500 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_rgba(6,95,70,0.4)] transition active:translate-y-1 active:shadow-none disabled:opacity-40"
        >
          {served ? "Đã bán cho khách này rồi ✓" : locked ? "Chưa mở khóa" : owned < offer.qty ? `Thiếu hàng (cần ${offer.qty}, có ${owned})` : `Bán cho khách • ${revenue.toLocaleString("vi-VN")} Xu`}
        </button>
      </article>
    </div>
  );
}
