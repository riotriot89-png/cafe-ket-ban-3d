// Cấu hình tập trung — thêm món/thời tiết/sự kiện/xe/nhân viên chỉ cần sửa file này.
import type { StaffType, WeatherId, ZoneId } from "./types";

// ---------- Hằng số vận hành ----------
export const TICK_MS = 10_000; // nhịp giá 10s
export const WEATHER_MS = 4 * 60_000; // thời tiết đổi mỗi 4 phút
export const EVENT_MS = 3 * 60_000; // sự kiện đổi mỗi 3 phút
export const START_XU = 1_000;
export const SELL_FEE_PCT = 0.02; // phí sạp 2% khi bán
export const SUPPLY_DEMAND_PCT = 0.003; // mua/bán 1 món làm giá lệch 0.3%
export const SUPPLY_RECOVERY = 0.1; // mỗi nhịp hồi 10% về cân bằng
export const ACTION_MIN_GAP_MS = 300; // chống spam request
export const RENTAL_TRIPS = 1; // thuê xe = dùng cho 1 chuyến
export const STAFF_RENT_MS = 5 * 60_000; // thuê nhân viên theo ca 5 phút

// ---------- 8 cấp độ thương lái ----------
export interface LevelDef {
  level: number;
  name: string;
  exp: number;
  maxStaff: number;
  note: string;
}
export const LEVELS: LevelDef[] = [
  { level: 1, name: "Tập Sự Giỏ Xinh", exp: 0, maxStaff: 1, note: "Mở khóa hàng Lv.1" },
  { level: 2, name: "Người Chạy Chợ Nhanh Nhẹn", exp: 250, maxStaff: 1, note: "Mở khóa hàng Lv.2" },
  { level: 3, name: "Lái Buôn Phố Nhỏ", exp: 700, maxStaff: 2, note: "Mở khóa hàng Lv.3" },
  { level: 4, name: "Thương Nhân Sành Sỏi", exp: 1600, maxStaff: 2, note: "Mở khóa hàng Lv.4 + Xe Tải Nhỏ" },
  { level: 5, name: "Đầu Cơ Đại Gia", exp: 3500, maxStaff: 3, note: "Mở khóa hàng Lv.5 + Xe Tải Lớn" },
  { level: 6, name: "Ông Trùm Chợ Phiên", exp: 7000, maxStaff: 3, note: "Mở khóa hàng Lv.6" },
  { level: 7, name: "Huyền Thoại Chạy Hàng", exp: 14000, maxStaff: 4, note: "Mở khóa hàng Lv.7 + Siêu Xe Tải" },
  { level: 8, name: "Vua Sàn Giao Dịch Xinh", exp: 25000, maxStaff: 5, note: "Mở khóa toàn bộ + đặc quyền tối đa" },
];

export function levelForExp(exp: number): LevelDef {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (exp >= l.exp) cur = l;
  return cur;
}

// ---------- 14 mặt hàng ----------
export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  slots: number;
  base: number; // giá gốc
  min: number; // biên độ thấp
  max: number; // biên độ cao
  level: number;
  trait: string;
  melt?: boolean; // dễ tan
  risky?: boolean; // rủi ro kiểm tra khi cập bến
  tags: string[]; // nhóm để thời tiết/sự kiện tác động: sweet, drink, ice, farm, collect, sea, rare, energy
}

export const ITEMS: ItemDef[] = [
  { id: "strawberry", name: "Dâu Tây Mọng Nước", emoji: "🍓", slots: 1, base: 50, min: 35, max: 85, level: 1, trait: "Cơ bản, an toàn.", tags: ["farm", "fruit"] },
  { id: "mochi", name: "Bánh Mochi Kem", emoji: "🍡", slots: 1, base: 80, min: 55, max: 130, level: 1, trait: "Xoay vòng vốn nhanh.", tags: ["sweet"] },
  { id: "milktea", name: "Trà Sữa Trân Châu", emoji: "🧋", slots: 2, base: 150, min: 100, max: 250, level: 1, trait: "Nhạy cảm với nắng/mưa.", tags: ["drink", "sweet"] },
  { id: "radish", name: "Củ Cải Cầu Vồng", emoji: "🥕", slots: 2, base: 220, min: 140, max: 360, level: 2, trait: "Nông sản hiếm vùng mây.", tags: ["farm", "rare"] },
  { id: "plush", name: "Mô Hình Thú Bông Mini", emoji: "🧸", slots: 3, base: 340, min: 220, max: 580, level: 2, trait: "Dễ tạo sóng giá.", tags: ["collect"] },
  { id: "icecream", name: "Kem Tươi Tan Chảy", emoji: "🍦", slots: 1, base: 480, min: 300, max: 850, level: 2, trait: "Dễ tan: giảm 6% giá trị mỗi 30s giữ hàng.", melt: true, tags: ["ice", "sweet", "drink"] },
  { id: "pearl", name: "Ngọc Trai Hồng", emoji: "🦪", slots: 2, base: 650, min: 420, max: 1100, level: 3, trait: "Hàng đẹp từ Bến Cảng.", tags: ["sea", "rare"] },
  { id: "macaron", name: "Bánh Macaron Hoàng Gia", emoji: "🍪", slots: 2, base: 820, min: 520, max: 1400, level: 3, trait: "Hợp bán ở Thị Trấn Quà Tặng.", tags: ["sweet", "collect"] },
  { id: "musicbox", name: "Hộp Nhạc Pha Lê", emoji: "🎵", slots: 4, base: 1100, min: 700, max: 1900, level: 4, trait: "Lợi nhuận tốt.", tags: ["collect"] },
  { id: "mushroom", name: "Nấm Linh Chi Ngủ Ngày", emoji: "🍄", slots: 3, base: 1500, min: 950, max: 2600, level: 5, trait: "Dược liệu quý hiếm.", tags: ["rare", "farm"] },
  { id: "treasure", name: "Kho Báu Bí Ẩn", emoji: "💎", slots: 5, base: 2000, min: 1250, max: 3500, level: 5, trait: "Rủi ro kiểm tra: 15% bị trừ 20% giá trị lô khi tới nơi.", risky: true, tags: ["sea", "collect", "rare"] },
  { id: "hourglass", name: "Đồng Hồ Cát Thời Gian", emoji: "⏳", slots: 4, base: 2600, min: 1700, max: 4500, level: 6, trait: "Giá trị sưu tầm cao.", tags: ["collect", "rare"] },
  { id: "energy", name: "Lõi Năng Lượng Lậu", emoji: "🔋", slots: 5, base: 3400, min: 2200, max: 5900, level: 7, trait: "Lời đậm nhưng dễ thu hút trộm cắp/kiểm tra.", risky: true, tags: ["energy", "rare"] },
  { id: "dragon", name: "Rồng Con Ngủ Đông", emoji: "🐉", slots: 8, base: 5000, min: 3200, max: 8800, level: 8, trait: "Món hàng siêu cấp đua top đại gia.", tags: ["collect", "rare"] },
];
export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// ---------- 4 khu vực ----------
export interface ZoneDef {
  id: ZoneId;
  name: string;
  emoji: string;
  desc: string;
  x: number;
  y: number;
  cheap: Record<string, number>; // itemId -> hệ số mua (<1 là rẻ)
  buyAll: number; // hệ số mua chung
  sellBonus: Record<string, number>; // itemId -> hệ số bán (>1 là bán đắt)
  sellAll: number; // hệ số bán chung
  risk: number; // cộng thêm tỉ lệ trộm (0..1)
}

export const ZONES: ZoneDef[] = [
  {
    id: "farm", name: "Vườn Dâu & Nông Trại Mây", emoji: "🍓", x: 0, y: 0,
    desc: "Rẻ nông sản, trái cây, bánh. Cần đồ ngọt, quà tặng, hàng hiếm.",
    cheap: { strawberry: 0.85, radish: 0.85, mochi: 0.9, mushroom: 0.9 },
    buyAll: 1,
    sellBonus: { plush: 1.2, musicbox: 1.2, dragon: 1.2 },
    sellAll: 1, risk: 0,
  },
  {
    id: "bakery", name: "Phố Bánh & Tiệm Trà", emoji: "🧁", x: 1, y: 0,
    desc: "Rẻ đồ ngọt, đồ uống, kem. Biến động nhanh.",
    cheap: { mochi: 0.85, milktea: 0.85, icecream: 0.85, macaron: 0.9 },
    buyAll: 1,
    sellBonus: { strawberry: 1.15, pearl: 1.15 },
    sellAll: 1, risk: 0,
  },
  {
    id: "harbor", name: "Bến Cảng Vỏ Sò", emoji: "⚓", x: 0, y: 1,
    desc: "Rẻ hải sản, ngọc trai, kho báu. Hay có gió biển & kiểm tra hàng.",
    cheap: { pearl: 0.85, treasure: 0.85, energy: 0.9, icecream: 0.9 },
    buyAll: 1,
    sellBonus: { strawberry: 1.15, mochi: 1.15 },
    sellAll: 1, risk: 0.05,
  },
  {
    id: "gift", name: "Thị Trấn Quà Tặng", emoji: "🎁", x: 1, y: 1,
    desc: "Bán giá cao nhất cho đồ sưu tầm, thú bông, hộp nhạc, rồng con. Nhập hàng đắt.",
    cheap: { plush: 0.9, musicbox: 0.9, hourglass: 0.9, dragon: 0.9 },
    buyAll: 1.15,
    sellBonus: { plush: 1.3, musicbox: 1.3, hourglass: 1.3, dragon: 1.3, macaron: 1.2, treasure: 1.2 },
    sellAll: 1.1, risk: 0,
  },
];
export const ZONE_MAP: Record<ZoneId, ZoneDef> = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<ZoneId, ZoneDef>;

export function travelSeconds(from: ZoneId, to: ZoneId, bagEmpty: boolean): number {
  if (from === to) return 0;
  if (bagEmpty) return 4;
  const a = ZONE_MAP[from];
  const b = ZONE_MAP[to];
  const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  return dist >= 2 ? 50 : 30;
}

// ---------- 6 thời tiết ----------
export interface WeatherDef {
  id: WeatherId;
  name: string;
  emoji: string;
  desc: string;
  itemMult: Record<string, number>; // tag -> hệ số giá
  moveMult: number; // nhân thời gian di chuyển
  theftAdd: number; // cộng tỉ lệ trộm
  meltMult: number; // nhân tốc độ tan kem
  feeMult: number; // nhân phí sạp
  volatility: number; // nhân biên độ dao động giá
}

export const WEATHERS: WeatherDef[] = [
  {
    id: "sunny", name: "Nắng Ấm Dịu Nhẹ", emoji: "☀️", desc: "Trà sữa & kem bán chạy, di chuyển bình thường.",
    itemMult: { drink: 1.2, ice: 1.2 }, moveMult: 1, theftAdd: 0, meltMult: 1, feeMult: 1, volatility: 1,
  },
  {
    id: "rain", name: "Mưa Phùn Lãng Mạn", emoji: "🌧️", desc: "Đường hơi trơn, mochi & trà sữa bán chạy hơn.",
    itemMult: { sweet: 1.15, drink: 1.15 }, moveMult: 1.18, theftAdd: 0, meltMult: 0.8, feeMult: 1, volatility: 1,
  },
  {
    id: "storm", name: "Bão Tố Gió Giật", emoji: "⛈️", desc: "Đi chậm hơn, dễ trộm/hỏng hàng, hàng Bến Cảng biến động mạnh.",
    itemMult: { sea: 1.1 }, moveMult: 1.3, theftAdd: 0.1, meltMult: 1, feeMult: 1, volatility: 1.5,
  },
  {
    id: "fog", name: "Sương Mù Huyền Ảo", emoji: "🌫️", desc: "Ngọc trai, nấm linh chi & đồng hồ cát tăng giá.",
    itemMult: { pearl: 1.25, mushroom: 1.25, hourglass: 1.25, rare: 1.1 }, moveMult: 1.15, theftAdd: 0.05, meltMult: 0.8, feeMult: 1, volatility: 1.1,
  },
  {
    id: "blazing", name: "Nắng Gắt Chói Chang", emoji: "🌞", desc: "Kem tan nhanh hơn, đồ uống & nông sản giải khát tăng giá.",
    itemMult: { drink: 1.2, farm: 1.2, ice: 1.1 }, moveMult: 1, theftAdd: 0, meltMult: 2, feeMult: 1, volatility: 1.1,
  },
  {
    id: "night", name: "Đêm Sao Lấp Lánh", emoji: "🌙", desc: "Hộp nhạc, kho báu & rồng con tăng giá, giảm 10% phí sạp.",
    itemMult: { musicbox: 1.2, treasure: 1.2, dragon: 1.2, collect: 1.1 }, moveMult: 1, theftAdd: 0, meltMult: 0.9, feeMult: 0.9, volatility: 1,
  },
];

// ---------- Sự kiện thị trường (đổi mỗi 3 phút) ----------
export interface MarketEvent {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  itemMult: Record<string, number>; // tag hoặc itemId -> hệ số
}

export const MARKET_EVENTS: MarketEvent[] = [
  { id: "foodfair", name: "Hội Chợ Ẩm Thực", emoji: "🎪", desc: "Đồ ngọt lên giá, ai cũng thèm bánh!", itemMult: { sweet: 1.15 } },
  { id: "pearlday", name: "Ngày Hội Trân Châu", emoji: "🦪", desc: "Ngọc trai được săn lùng ráo riết.", itemMult: { pearl: 1.2, sea: 1.1 } },
  { id: "dragonrumor", name: "Tin Đồn Rồng Con", emoji: "🐉", desc: "Nghe nói có người thấy rồng con ngoài chợ!", itemMult: { dragon: 1.25, collect: 1.1 } },
  { id: "meteor", name: "Mưa Sao Băng May Mắn", emoji: "🌠", desc: "Kho báu & hộp nhạc bỗng dưng hot.", itemMult: { treasure: 1.15, musicbox: 1.1 } },
  { id: "nightmarket", name: "Chợ Đêm Giảm Giá", emoji: "🏮", desc: "Cả chợ đồng loạt hạ giá, tranh thủ nhập hàng!", itemMult: { "*": 0.92 } },
  { id: "collectwave", name: "Làn Sóng Sưu Tầm", emoji: "📦", desc: "Dân sưu tầm đổ xô mua đồ hiếm.", itemMult: { collect: 1.15, rare: 1.1 } },
];

// ---------- 6 phương tiện ----------
export interface VehicleDef {
  id: string;
  name: string;
  emoji: string;
  slots: number;
  speed: number;
  theftCut: number; // giảm tỉ lệ trộm (0..1)
  rent: number; // Xu / chuyến, 0 = mặc định
  buy: number; // Xu mua đứt, 0 = mặc định
  level: number;
}

export const VEHICLES: VehicleDef[] = [
  { id: "basket", name: "Giỏ Mây Nhỏ", emoji: "🧺", slots: 20, speed: 1.0, theftCut: 0, rent: 0, buy: 0, level: 1 },
  { id: "bike", name: "Xe Đạp Giao Hàng Xinh", emoji: "🚲", slots: 40, speed: 1.15, theftCut: 0, rent: 300, buy: 1800, level: 1 },
  { id: "tuktuk", name: "Xe Ba Gác Pastel", emoji: "🛺", slots: 80, speed: 1.25, theftCut: 0, rent: 900, buy: 5500, level: 2 },
  { id: "truck_s", name: "Xe Tải Nhỏ Chạy Chợ", emoji: "🚚", slots: 150, speed: 1.35, theftCut: 0.15, rent: 2500, buy: 15000, level: 4 },
  { id: "truck_l", name: "Xe Tải Lớn Siêu Tốc", emoji: "🚛", slots: 260, speed: 1.5, theftCut: 0.25, rent: 6000, buy: 38000, level: 5 },
  { id: "dragon_truck", name: "Siêu Xe Tải Rồng Vàng", emoji: "🐲", slots: 450, speed: 1.75, theftCut: 0.4, rent: 14000, buy: 85000, level: 7 },
];
export const VEHICLE_MAP: Record<string, VehicleDef> = Object.fromEntries(VEHICLES.map((v) => [v.id, v]));

// ---------- 3 loại nhân viên ----------
export interface StaffDef {
  type: StaffType;
  name: string;
  emoji: string;
  desc: string;
  rent: number; // Xu / ca 5 phút
  buy: number; // Xu mua đứt (cấp 1)
  upgrade: number[]; // phí nâng lên cấp 2, cấp 3
}

export const STAFF_DEFS: StaffDef[] = [
  {
    type: "analyst", name: "Bé Thỏ Kiểm Giá", emoji: "🐰",
    desc: "Giảm 1–3% phí giao dịch và gợi ý xu hướng giá.",
    rent: 400, buy: 2500, upgrade: [4000, 8000],
  },
  {
    type: "guard", name: "Cún Con Canh Hàng", emoji: "🐶",
    desc: "Giảm mạnh tỉ lệ bị trộm vặt (25%–50% tùy cấp).",
    rent: 500, buy: 3000, upgrade: [5000, 10000],
  },
  {
    type: "runner", name: "Mèo Máy Chạy Việc", emoji: "🐱",
    desc: "Tự chốt lời hàng lãi ≥30% và tăng EXP nhận được (+5%/cấp).",
    rent: 600, buy: 3500, upgrade: [6000, 12000],
  },
];
export const STAFF_MAP: Record<StaffType, StaffDef> = Object.fromEntries(STAFF_DEFS.map((s) => [s.type, s])) as Record<StaffType, StaffDef>;

// ---------- Nhiệm vụ mẫu ----------
export interface QuestTemplate {
  kind: "sell_qty" | "profit_once" | "travel_weather" | "upgrade_vehicle" | "hire_staff";
  make: (level: number, seed: number) => { title: string; desc: string; target: number; itemId?: string; weatherId?: WeatherId; staffType?: StaffType; rewardXu: number; rewardExp: number };
}

const pick = <T,>(arr: T[], seed: number): T => arr[Math.abs(seed) % arr.length];

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    kind: "sell_qty",
    make: (level, seed) => {
      const unlocked = ITEMS.filter((i) => i.level <= level);
      const item = pick(unlocked, seed);
      const qty = 3 + (Math.abs(seed >> 3) % 8);
      return {
        title: `Bán ${qty} ${item.name}`,
        desc: `Bán thành công ${qty} món ${item.name} ở bất kỳ chợ nào.`,
        target: qty, itemId: item.id,
        rewardXu: Math.round(qty * item.base * 0.2), rewardExp: 30 + qty * 5,
      };
    },
  },
  {
    kind: "profit_once",
    make: (level, seed) => {
      const amount = [300, 600, 1200, 2500, 5000][Math.min(level - 1, 4)] + (Math.abs(seed) % 3) * 100;
      return {
        title: `Lãi một chuyến ${amount.toLocaleString("vi-VN")} Xu`,
        desc: `Lãi ròng tối thiểu ${amount.toLocaleString("vi-VN")} Xu từ một lần bán hàng.`,
        target: amount,
        rewardXu: Math.round(amount * 0.5), rewardExp: 50,
      };
    },
  },
  {
    kind: "travel_weather",
    make: (_level, seed) => {
      const w = pick(WEATHERS, seed);
      return {
        title: `Chạy hàng giữa trời ${w.name}`,
        desc: `Hoàn thành một chuyến chạy hàng khi trời đang ${w.name}.`,
        target: 1, weatherId: w.id,
        rewardXu: 200, rewardExp: 40,
      };
    },
  },
  {
    kind: "upgrade_vehicle",
    make: (level, seed) => {
      const avail = VEHICLES.filter((v) => v.level <= level && v.id !== "basket");
      const v = avail.length ? pick(avail, seed) : VEHICLES[1];
      return {
        title: `Lên đời ${v.name}`,
        desc: `Thuê hoặc mua ${v.name} để chạy hàng nhanh hơn.`,
        target: 1,
        rewardXu: 300, rewardExp: 60,
      };
    },
  },
  {
    kind: "hire_staff",
    make: (_level, seed) => {
      const s = pick(STAFF_DEFS, seed);
      return {
        title: `Tuyển ${s.name}`,
        desc: `Thuê theo ca hoặc tuyển ${s.name} về đội của bạn.`,
        target: 1, staffType: s.type,
        rewardXu: 250, rewardExp: 50,
      };
    },
  },
];

// ---------- Shop chống lạm phát: danh hiệu + trang trí sạp ----------
export interface ShopItemDef {
  id: string;
  kind: "title" | "decor";
  name: string;
  emoji: string;
  desc: string;
  price: number;
  level: number;
}

export const SHOP_ITEMS: ShopItemDef[] = [
  { id: "title_cute", kind: "title", name: "Bé Ngoan Chợ Xinh", emoji: "🌸", desc: "Danh hiệu hồng phấn, hiện trên bảng xếp hạng.", price: 5000, level: 2 },
  { id: "title_pro", kind: "title", name: "Tay Buôn Lừng Danh", emoji: "⭐", desc: "Danh hiệu vàng, ai cũng nể.", price: 20000, level: 4 },
  { id: "title_dragon", kind: "title", name: "Bạn Thân Của Rồng", emoji: "🐉", desc: "Danh hiệu huyền thoại, chỉ dân chơi rồng mới có.", price: 60000, level: 7 },
  { id: "decor_pink", kind: "decor", name: "Sạp Hồng Pastel", emoji: "🎀", desc: "Trang trí sạp màu hồng kẹo ngọt.", price: 3000, level: 1 },
  { id: "decor_lantern", kind: "decor", name: "Đèn Lồng Chợ Đêm", emoji: "🏮", desc: "Sạp lung linh như chợ đêm.", price: 12000, level: 3 },
  { id: "decor_gold", kind: "decor", name: "Sạp Vàng Đại Gia", emoji: "👑", desc: "Sạp dát vàng, đỉnh của chóp.", price: 50000, level: 6 },
];

// ---------- Biệt danh dễ thương mặc định ----------
export const CUTE_NAMES = [
  "Bé Bánh Bao", "Mochi Nhỏ", "Dâu Tây Ngọt", "Thỏ Bông Xinh", "Mèo Ú Chạy Chợ",
  "Bé Trà Sữa", "Gấu Bông Lười", "Nấm Lùn Đáng Yêu", "Bé Kẹo Dẻo", "Chim Sẻ Nhanh Nhẹn",
  "Bé Bơ Sữa", "Cún Con May Mắn", "Bé Bánh Quy", "Sao Biển Nhỏ", "Bé Nắng Vàng",
];
