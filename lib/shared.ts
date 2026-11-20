// Helper thuần dùng chung server + client (không đụng store, không đụng process.env).
import { ITEM_MAP, LEVELS, SELL_FEE_PCT, VEHICLES, VEHICLE_MAP, ZONE_MAP, levelForExp } from "./config";
import type { Player, ZoneId } from "./types";

export function netWorth(p: Player): number {
  let v = p.xu;
  for (const lot of p.inventory) v += lot.qty * ITEM_MAP[lot.itemId].base;
  return Math.round(v);
}

export function bagUsed(p: Player): number {
  return p.inventory.reduce((s, l) => s + l.qty * ITEM_MAP[l.itemId].slots, 0);
}

export function activeVehicle(p: Player) {
  return VEHICLE_MAP[p.activeVehicle] ?? VEHICLES[0];
}

export function bagCapacity(p: Player): number {
  return activeVehicle(p).slots;
}

export function staffEffects(p: Player) {
  let feeCut = 0;
  let theftCut = 0;
  let expMult = 1;
  let hasRunner = false;
  let hasAnalyst = false;
  for (const s of p.staff) {
    if (s.type === "analyst") {
      feeCut += 0.01 * s.level;
      hasAnalyst = true;
    } else if (s.type === "guard") {
      theftCut += [0, 0.25, 0.35, 0.5][s.level];
    } else if (s.type === "runner") {
      expMult += 0.05 * s.level;
      hasRunner = true;
    }
  }
  return { feeCut: Math.min(feeCut, 0.05), theftCut: Math.min(theftCut, 0.8), expMult, hasRunner, hasAnalyst };
}

export function levelInfo(p: Player) {
  const cur = levelForExp(p.exp);
  const next = LEVELS.find((l) => l.level === cur.level + 1) ?? null;
  const expProgress = next ? Math.min(1, Math.max(0, (p.exp - cur.exp) / (next.exp - cur.exp))) : 1;
  return {
    level: cur.level,
    name: cur.name,
    exp: p.exp,
    expForNext: next ? next.exp : null,
    expProgress,
    maxStaff: cur.maxStaff,
  };
}

// Hệ số tan của kem: giảm 6% giá trị mỗi 30s giữ hàng (nhân tốc độ tan theo thời tiết).
export function meltFactor(itemId: string, acquiredAt: number, now: number, meltMult: number): number {
  if (itemId !== "icecream") return 1;
  const periods = ((now - acquiredAt) / 1000 / 30) * meltMult;
  if (periods <= 0) return 1;
  return Math.max(0.2, Math.pow(0.94, periods));
}

export function buyPrice(itemId: string, zone: ZoneId, marketPrice: number): number {
  const z = ZONE_MAP[zone];
  const mult = (z.cheap[itemId] ?? 1) * z.buyAll;
  return Math.max(1, Math.round(marketPrice * mult));
}

export function sellPrice(itemId: string, zone: ZoneId, marketPrice: number): number {
  const z = ZONE_MAP[zone];
  const mult = (z.sellBonus[itemId] ?? 1) * z.sellAll;
  return Math.max(1, Math.round(marketPrice * mult));
}

export function sellFeeRate(p: Player, weatherFeeMult: number): number {
  const eff = staffEffects(p);
  return Math.max(0, SELL_FEE_PCT - eff.feeCut) * weatherFeeMult;
}
