// Shared types for TÚI MÙ CHẠY CHỢ (server + client)

export type ZoneId = "farm" | "bakery" | "harbor" | "gift";
export type WeatherId = "sunny" | "rain" | "storm" | "fog" | "blazing" | "night";
export type StaffType = "analyst" | "guard" | "runner";

export interface InventoryLot {
  itemId: string;
  qty: number;
  avgCost: number; // giá vốn trung bình / món
  acquiredAt: number; // ms epoch — dùng cho hàng dễ tan
}

export interface Quest {
  id: string;
  kind: "sell_qty" | "profit_once" | "travel_weather" | "upgrade_vehicle" | "hire_staff";
  title: string;
  desc: string;
  target: number;
  progress: number;
  itemId?: string;
  weatherId?: WeatherId;
  staffType?: StaffType;
  rewardXu: number;
  rewardExp: number;
  done: boolean;
  claimed: boolean;
}

export interface StaffMember {
  type: StaffType;
  level: number; // 1..3
  mode: "rent" | "owned";
  expiresAt: number | null; // thuê theo ca
}

export interface Player {
  id: string;
  nickname: string;
  xu: number;
  exp: number;
  level: number;
  zone: ZoneId;
  inventory: InventoryLot[];
  vehiclesOwned: string[]; // vehicle ids đã mua đứt
  activeVehicle: string; // vehicle id đang dùng
  rentalVehicle: { vehicleId: string; tripsLeft: number } | null; // thuê theo chuyến
  staff: StaffMember[];
  quests: Quest[];
  titlesOwned: string[];
  activeTitle: string | null;
  decorsOwned: string[];
  activeDecor: string | null;
  seasonId: string;
  seasonBaseline: number; // tài sản ròng lúc bắt đầu mùa
  seasonScore: number; // tài sản ròng mùa này - baseline
  totalProfit: number;
  totalSold: number;
  travel: { to: ZoneId; endsAt: number; startedAt: number; durationMs: number } | null;
  events: GameEvent[];
  createdAt: number;
  lastActionAt: number;
  boughtOffers?: string[]; // id lô thương lái đã mua (tỉa theo đợt trong resolvePlayer)
  servedCustomers?: string[]; // id lô khách mua đã phục vụ
}

export interface GameEvent {
  id: string;
  kind: "info" | "good" | "bad" | "quest" | "level";
  text: string;
  at: number;
}

export interface MarketPrice {
  itemId: string;
  price: number; // giá thị trường hiện tại (chưa nhân hệ số khu vực)
  prev: number; // giá nhịp trước
  history: number[]; // 10 nhịp gần nhất
  changePct: number;
}

// ---------- Đợt giao dịch (waves) ----------
export interface MerchantOffer {
  id: string; // m:{waveIndex}:{merchantIdx}:{offerIdx}
  itemId: string;
  qty: number; // số lượng cả lô — mua là mua hết lô
  factor: number; // hệ số nhân giá gốc (chưa nhân hệ số khu vực)
}

export interface Merchant {
  id: string;
  name: string;
  emoji: string;
  offers: MerchantOffer[];
}

export interface CustomerOffer {
  id: string; // c:{waveIndex}:{customerIdx}
  itemId: string;
  qty: number; // số lượng khách muốn mua
  factor: number; // hệ số nhân giá gốc (chưa nhân hệ số khu vực)
}

export interface Customer {
  id: string;
  name: string;
  emoji: string;
  offer: CustomerOffer;
}

export interface WavesInfo {
  merchant: { waveIndex: number; startsAt: number; endsAt: number; merchants: Merchant[] };
  customer: { waveIndex: number; startsAt: number; endsAt: number; customers: Customer[] };
}

export interface MarketSnapshot {
  tick: number;
  tickEndsAt: number;
  prices: MarketPrice[];
  weather: WeatherId;
  weatherEndsAt: number;
  event: string; // event id
  eventEndsAt: number;
  seasonId: string;
  seasonEndsAt: number;
}

export interface LeaderboardEntry {
  playerId: string;
  nickname: string;
  level: number;
  netWorth: number;
  seasonScore: number;
  title: string | null;
  decor: string | null;
}

export interface StateResponse {
  now: number;
  player: Player;
  market: MarketSnapshot;
  waves: WavesInfo;
  season: { id: string; endsAt: number };
  leaderboard: LeaderboardEntry[];
  netWorth: number;
  bagSlotsUsed: number;
  bagSlotsTotal: number;
  levelInfo: {
    level: number;
    name: string;
    exp: number;
    expForNext: number | null;
    expProgress: number; // 0..1 trong cấp hiện tại
    maxStaff: number;
  };
  analystHints?: { itemId: string; dir: "up" | "down" }[];
}
