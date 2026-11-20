// Logic game phía server — mọi phép tính tiền/EXP/nhiệm vụ đều kiểm tra ở đây.
import {
  ACTION_MIN_GAP_MS,
  CUTE_NAMES,
  ITEMS,
  ITEM_MAP,
  QUEST_TEMPLATES,
  RENTAL_TRIPS,
  SELL_FEE_PCT,
  SHOP_ITEMS,
  STAFF_MAP,
  STAFF_RENT_MS,
  START_XU,
  SUPPLY_DEMAND_PCT,
  VEHICLES,
  VEHICLE_MAP,
  WEATHERS,
  ZONE_MAP,
  levelForExp,
  travelSeconds,
} from "./config";
import type { QuestTemplate } from "./config";
import {
  activeVehicle,
  bagCapacity,
  bagUsed,
  buyPrice,
  levelInfo,
  meltFactor,
  netWorth,
  sellPrice,
  staffEffects,
} from "./shared";
import { advanceMarket, marketSnapshot, tickIndex, weatherAt, type MarketState } from "./market";
import { getMarketState, getPlayer, listPlayers, saveMarketState, savePlayer, storeGet, storeSet } from "./store";
import { clamp, currentSeason, seededNoise, uid } from "./util";
import type {
  GameEvent,
  LeaderboardEntry,
  MarketSnapshot,
  Player,
  Quest,
  StaffType,
  StateResponse,
  ZoneId,
} from "./types";

export class GameError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function pushEvent(p: Player, kind: GameEvent["kind"], text: string, now: number) {
  p.events.unshift({ id: uid("ev"), kind, text, at: now });
  if (p.events.length > 12) p.events.length = 12;
}

function checkSpam(p: Player, now: number) {
  if (now - p.lastActionAt < ACTION_MIN_GAP_MS) {
    throw new GameError("Bạn bấm nhanh quá, chờ xíu nha ^w^", 429);
  }
  p.lastActionAt = now;
}

function addExp(p: Player, amount: number, now: number) {
  const before = levelForExp(p.exp);
  p.exp += Math.max(0, Math.round(amount));
  const after = levelForExp(p.exp);
  p.level = after.level;
  if (after.level > before.level) {
    pushEvent(p, "level", `Lên cấp ${after.level} — ${after.name}! Mở khóa hàng & đặc quyền mới.`, now);
  }
}

// ---------- Thị trường ----------
export async function getMarket(now: number): Promise<{ state: MarketState; snap: MarketSnapshot }> {
  const state = await getMarketState();
  const advanced = advanceMarket(state, now);
  if (advanced.tick !== state.tick) await saveMarketState(advanced);
  const season = currentSeason(now);
  const snap = marketSnapshot(advanced, now, season.id, season.endsAt);
  return { state: advanced, snap };
}

function marketPriceOf(snap: MarketSnapshot, itemId: string): number {
  return snap.prices.find((p) => p.itemId === itemId)?.price ?? ITEM_MAP[itemId].base;
}

// ---------- Người chơi ----------
export async function createPlayer(nickname?: string): Promise<Player> {
  const now = Date.now();
  const season = currentSeason(now);
  const name =
    nickname && nickname.trim().length > 0
      ? nickname.trim().slice(0, 20)
      : CUTE_NAMES[Math.floor(Math.random() * CUTE_NAMES.length)] + Math.floor(Math.random() * 90 + 10);
  const p: Player = {
    id: uid("pl"),
    nickname: name,
    xu: START_XU,
    exp: 0,
    level: 1,
    zone: "farm",
    inventory: [],
    vehiclesOwned: ["basket"],
    activeVehicle: "basket",
    rentalVehicle: null,
    staff: [],
    quests: [],
    titlesOwned: [],
    activeTitle: null,
    decorsOwned: [],
    activeDecor: null,
    seasonId: season.id,
    seasonBaseline: START_XU,
    seasonScore: 0,
    totalProfit: 0,
    totalSold: 0,
    travel: null,
    events: [{ id: uid("ev"), kind: "info", text: `Chào mừng ${name} đến với xóm nhỏ! Bắt đầu với ${START_XU.toLocaleString("vi-VN")} Xu nha ^w^`, at: now }],
    createdAt: now,
    lastActionAt: 0,
  };
  p.quests = [genQuest(p, 0), genQuest(p, 1), genQuest(p, 2)];
  await savePlayer(p);
  return p;
}

export async function renamePlayer(id: string, nickname: string): Promise<Player> {
  const p = await getPlayer(id);
  if (!p) throw new GameError("Không tìm thấy người chơi.", 404);
  const name = nickname.trim().slice(0, 20);
  if (name.length < 2) throw new GameError("Biệt danh cần ít nhất 2 ký tự.", 400);
  p.nickname = name;
  await savePlayer(p);
  return p;
}

function questKey(q: { kind: string; itemId?: string; weatherId?: string; staffType?: string; target?: number }): string {
  return `${q.kind}:${q.itemId ?? ""}:${q.weatherId ?? ""}:${q.staffType ?? ""}:${q.target ?? ""}`;
}

function genQuest(p: Player, slot: number): Quest {
  let made: ReturnType<QuestTemplate["make"]> | null = null;
  let kind: Quest["kind"] = "sell_qty";
  for (let attempt = 0; attempt < 12; attempt++) {
    const tpl = QUEST_TEMPLATES[Math.floor(Math.random() * QUEST_TEMPLATES.length)];
    const m = tpl.make(p.level, Math.floor(Math.random() * 1e9) + slot * 7919 + attempt * 131);
    if (!p.quests.some((q) => questKey(q) === questKey({ kind: tpl.kind, ...m }))) {
      made = m;
      kind = tpl.kind;
      break;
    }
    made = m;
    kind = tpl.kind;
  }
  const m = made!;
  return {
    id: uid("q"),
    kind,
    title: m.title,
    desc: m.desc,
    target: m.target,
    progress: 0,
    itemId: m.itemId,
    weatherId: m.weatherId,
    staffType: m.staffType,
    rewardXu: m.rewardXu,
    rewardExp: m.rewardExp,
    done: false,
    claimed: false,
  };
}

function updateQuestProgress(p: Player, fn: (q: Quest) => void) {
  for (const q of p.quests) {
    if (q.claimed) continue;
    const wasDone = q.done;
    fn(q);
    q.progress = Math.min(q.progress, q.target);
    q.done = q.progress >= q.target;
    if (q.done && !wasDone) {
      pushEvent(p, "quest", `Hoàn thành nhiệm vụ: ${q.title} — bấm nhận thưởng nha!`, Date.now());
    }
  }
}

// ---------- Resolve: di chuyển tới nơi, hết hạn thuê, mùa mới, runner tự chốt lời ----------
async function resolvePlayer(p: Player, now: number, snap: MarketSnapshot): Promise<boolean> {
  let changed = false;

  // Đổi mùa: chốt baseline mới
  if (p.seasonId !== snap.seasonId) {
    p.seasonId = snap.seasonId;
    p.seasonBaseline = netWorth(p);
    p.seasonScore = 0;
    pushEvent(p, "info", `Mùa mới ${snap.seasonId} đã bắt đầu! Bảng xếp hạng làm mới, ai cũng có cơ hội lên top.`, now);
    changed = true;
  }
  p.seasonScore = Math.max(0, netWorth(p) - p.seasonBaseline);

  // Nhân viên thuê hết ca
  const beforeStaff = p.staff.length;
  p.staff = p.staff.filter((s) => !(s.mode === "rent" && s.expiresAt !== null && s.expiresAt <= now));
  if (p.staff.length !== beforeStaff) {
    pushEvent(p, "info", "Ca làm của nhân viên thuê đã hết, bạn có thể thuê lại nha.", now);
    changed = true;
  }

  // Tới nơi: trộm vặt + kiểm tra hàng + nhiệm vụ thời tiết
  if (p.travel && now >= p.travel.endsAt) {
    const to = p.travel.to;
    const arrivalWeather = weatherAt(now).weather;
    p.travel = null;
    p.zone = to;
    changed = true;

    // Xe thuê chỉ dùng cho 1 chuyến
    if (p.rentalVehicle) {
      p.rentalVehicle.tripsLeft -= 1;
      if (p.rentalVehicle.tripsLeft <= 0) {
        p.rentalVehicle = null;
        const owned = VEHICLES.filter((v) => p.vehiclesOwned.includes(v.id)).sort((a, b) => b.speed - a.speed)[0];
        p.activeVehicle = owned ? owned.id : "basket";
        pushEvent(p, "info", "Xe thuê đã hết chuyến, quay về xe của bạn rồi nha.", now);
      }
    }

    // Nhiệm vụ chạy hàng theo thời tiết
    updateQuestProgress(p, (q) => {
      if (q.kind === "travel_weather" && q.weatherId === arrivalWeather.id) q.progress = 1;
    });

    // Kiểm tra hàng rủi ro: 15% bị trừ 20% số lượng lô
    for (const lot of [...p.inventory]) {
      const item = ITEM_MAP[lot.itemId];
      if (item.risky && Math.random() < 0.15) {
        const lost = Math.max(1, Math.floor(lot.qty * 0.2));
        lot.qty -= lost;
        if (lot.qty <= 0) p.inventory = p.inventory.filter((l) => l !== lot);
        pushEvent(p, "bad", `Bị kiểm tra hàng! ${item.name} mất ${lost} món khi cập bến. T_T`, now);
        changed = true;
      }
    }

    // Trộm vặt khi cập bến
    const eff = staffEffects(p);
    const vehicle = activeVehicle(p);
    const invValue = p.inventory.reduce((s, l) => s + l.qty * ITEM_MAP[l.itemId].base, 0);
    const zone = ZONE_MAP[to];
    let chance = 0.06 + Math.min(0.12, invValue / 50000) + zone.risk + arrivalWeather.theftAdd;
    chance *= 1 - vehicle.theftCut;
    chance *= 1 - eff.theftCut;
    chance = clamp(chance, 0.01, 0.35);
    if (Math.random() < chance) {
      if (p.inventory.length > 0) {
        const n = 1 + (Math.random() < 0.4 ? 1 : 0);
        const stolen: string[] = [];
        for (let i = 0; i < n && p.inventory.length > 0; i++) {
          const idx = Math.floor(Math.random() * p.inventory.length);
          const lot = p.inventory[idx];
          const take = Math.min(lot.qty, 1 + Math.floor(Math.random() * 2));
          lot.qty -= take;
          stolen.push(`${ITEM_MAP[lot.itemId].name} x${take}`);
          if (lot.qty <= 0) p.inventory.splice(idx, 1);
        }
        pushEvent(p, "bad", `Băng Nhím Trộm Vặt cuỗm mất ${stolen.join(", ")}! Thuê Cún Con Canh Hàng để đỡ bị trộm nha.`, now);
      } else {
        const lost = Math.max(10, Math.floor(p.xu * 0.03));
        p.xu -= lost;
        pushEvent(p, "bad", `Băng Nhím Trộm Vặt móc mất ${lost.toLocaleString("vi-VN")} Xu! T_T`, now);
      }
      changed = true;
    } else {
      pushEvent(p, "good", `Đã tới ${zone.name} an toàn. Chúc buôn may bán đắt! ^w^`, now);
    }
  }

  // Mèo Máy Chạy Việc: tự chốt lời các lô lãi >= 30% (tối đa 3 lô/lần)
  const eff = staffEffects(p);
  if (eff.hasRunner && p.inventory.length > 0 && !p.travel) {
    let sold = 0;
    for (const lot of [...p.inventory]) {
      if (sold >= 3) break;
      const unit = sellPrice(lot.itemId, p.zone, marketPriceOf(snap, lot.itemId));
      const profitPct = (unit - lot.avgCost) / lot.avgCost;
      if (profitPct >= 0.3) {
        const fee = Math.round(unit * lot.qty * Math.max(0, SELL_FEE_PCT - eff.feeCut));
        const revenue = unit * lot.qty - fee;
        const profit = revenue - lot.avgCost * lot.qty;
        p.xu += revenue;
        p.totalSold += lot.qty;
        p.totalProfit += profit;
        addExp(p, (profit > 0 ? Math.floor(profit / 25) : 0) * eff.expMult, now);
        pushEvent(p, "good", `Mèo Máy tự chốt lời ${ITEM_MAP[lot.itemId].name} x${lot.qty}, lãi ${profit.toLocaleString("vi-VN")} Xu.`, now);
        p.inventory = p.inventory.filter((l) => l !== lot);
        updateQuestProgress(p, (q) => {
          if (q.kind === "sell_qty" && q.itemId === lot.itemId) q.progress += lot.qty;
          if (q.kind === "profit_once") q.progress = Math.max(q.progress, profit);
        });
        sold += 1;
        changed = true;
      }
    }
  }

  p.seasonScore = Math.max(0, netWorth(p) - p.seasonBaseline);
  return changed;
}

// ---------- State đầy đủ ----------
export async function getState(playerId: string): Promise<StateResponse> {
  const now = Date.now();
  const p = await getPlayer(playerId);
  if (!p) throw new GameError("Không tìm thấy người chơi.", 404);
  const { snap } = await getMarket(now);
  const changed = await resolvePlayer(p, now, snap);
  if (changed) await savePlayer(p);
  const eff = staffEffects(p);
  const res = buildState(p, snap, now);
  if (eff.hasAnalyst) {
    const nextTick = tickIndex(now) + 1;
    const hints = ITEMS_UNLOCKED(p)
      .map((it) => ({ itemId: it.id, dir: seededNoise(`price:${it.id}`, nextTick) >= 0 ? ("up" as const) : ("down" as const) }))
      .slice(0, 5);
    res.analystHints = hints;
  }
  return res;
}

function ITEMS_UNLOCKED(p: Player) {
  return ITEMS.filter((i) => i.level <= p.level);
}

function buildState(p: Player, snap: MarketSnapshot, now: number): StateResponse {
  return {
    now,
    player: p,
    market: snap,
    season: { id: snap.seasonId, endsAt: snap.seasonEndsAt },
    leaderboard: [],
    netWorth: netWorth(p),
    bagSlotsUsed: bagUsed(p),
    bagSlotsTotal: bagCapacity(p),
    levelInfo: levelInfo(p),
  };
}

// ---------- Mua / Bán (server kiểm tra toàn bộ) ----------
export async function trade(
  playerId: string,
  action: "buy" | "sell",
  itemId: string,
  qty: number,
): Promise<{ player: Player; message: string; profit?: number }> {
  const now = Date.now();
  const p = await getPlayer(playerId);
  if (!p) throw new GameError("Không tìm thấy người chơi.", 404);
  checkSpam(p, now);
  if (p.travel) throw new GameError("Đang di chuyển, không giao dịch được đâu! Chờ tới nơi đã nha.", 400);
  const item = ITEM_MAP[itemId];
  if (!item) throw new GameError("Món hàng không tồn tại.", 400);
  if (item.level > p.level) throw new GameError(`Món này cần đạt ${levelForExp(p.exp).name} Lv.${item.level} mới mở khóa.`, 403);
  if (!Number.isInteger(qty) || qty < 1 || qty > 999) throw new GameError("Số lượng không hợp lệ.", 400);

  const { state, snap } = await getMarket(now);
  const changed = await resolvePlayer(p, now, snap);
  void changed;
  const mPrice = marketPriceOf(snap, itemId);
  const weather = WEATHERS.find((w) => w.id === snap.weather)!;
  const eff = staffEffects(p);

  if (action === "buy") {
    const unit = buyPrice(itemId, p.zone, mPrice);
    const total = unit * qty;
    if (p.xu < total) throw new GameError(`Không đủ Xu! Cần ${total.toLocaleString("vi-VN")} Xu, bạn có ${p.xu.toLocaleString("vi-VN")} Xu.`, 400);
    if (bagUsed(p) + qty * item.slots > bagCapacity(p)) {
      throw new GameError(`Túi không đủ chỗ! Cần ${qty * item.slots} ô, còn trống ${bagCapacity(p) - bagUsed(p)} ô.`, 400);
    }
    p.xu -= total;
    const lot = p.inventory.find((l) => l.itemId === itemId);
    if (lot) {
      lot.avgCost = Math.round((lot.avgCost * lot.qty + unit * qty) / (lot.qty + qty));
      lot.qty += qty;
    } else {
      p.inventory.push({ itemId, qty, avgCost: unit, acquiredAt: now });
    }
    state.offsets[itemId] = clamp((state.offsets[itemId] ?? 0) + SUPPLY_DEMAND_PCT * qty, -0.5, 0.5);
    await saveMarketState(state);
    await savePlayer(p);
    return { player: p, message: `Đã mua ${item.name} x${qty} với ${total.toLocaleString("vi-VN")} Xu. ^w^` };
  }

  // sell
  const lot = p.inventory.find((l) => l.itemId === itemId);
  if (!lot || lot.qty < qty) throw new GameError(`Bạn không có đủ ${item.name} để bán.`, 400);
  const melt = meltFactor(itemId, lot.acquiredAt, now, weather.meltMult);
  const unit = Math.round(sellPrice(itemId, p.zone, mPrice) * melt);
  const feeRate = Math.max(0, SELL_FEE_PCT - eff.feeCut) * weather.feeMult;
  const gross = unit * qty;
  const fee = Math.round(gross * feeRate);
  const revenue = gross - fee;
  const cost = lot.avgCost * qty;
  const profit = revenue - cost;
  lot.qty -= qty;
  if (lot.qty <= 0) p.inventory = p.inventory.filter((l) => l !== lot);
  p.xu += revenue;
  p.totalSold += qty;
  p.totalProfit += profit;
  addExp(p, (profit > 0 ? Math.floor(profit / 25) : 0) * eff.expMult, now);
  updateQuestProgress(p, (q) => {
    if (q.kind === "sell_qty" && q.itemId === itemId) q.progress += qty;
    if (q.kind === "profit_once") q.progress = Math.max(q.progress, profit);
  });
  state.offsets[itemId] = clamp((state.offsets[itemId] ?? 0) - SUPPLY_DEMAND_PCT * qty, -0.5, 0.5);
  await saveMarketState(state);
  await savePlayer(p);
  const meltNote = melt < 1 ? ` (kem tan mất ${Math.round((1 - melt) * 100)}% giá trị)` : "";
  return {
    player: p,
    profit,
    message:
      profit >= 0
        ? `Đã bán ${item.name} x${qty}, thu ${revenue.toLocaleString("vi-VN")} Xu, lãi ${profit.toLocaleString("vi-VN")} Xu!${meltNote} UwU`
        : `Đã bán ${item.name} x${qty}, thu ${revenue.toLocaleString("vi-VN")} Xu, lỗ ${Math.abs(profit).toLocaleString("vi-VN")} Xu.${meltNote} T_T`,
  };
}

// ---------- Di chuyển ----------
export async function travel(playerId: string, to: ZoneId): Promise<{ player: Player; seconds: number }> {
  const now = Date.now();
  const p = await getPlayer(playerId);
  if (!p) throw new GameError("Không tìm thấy người chơi.", 404);
  checkSpam(p, now);
  if (!ZONE_MAP[to]) throw new GameError("Khu vực không tồn tại.", 400);
  if (p.travel) throw new GameError("Bạn đang di chuyển rồi, chờ tới nơi đã!", 400);
  if (to === p.zone) throw new GameError("Bạn đang ở đây rồi mà!", 400);
  const { snap } = await getMarket(now);
  await resolvePlayer(p, now, snap);
  const weather = WEATHERS.find((w) => w.id === snap.weather)!;
  const vehicle = activeVehicle(p);
  const bagEmpty = p.inventory.length === 0;
  const baseSec = travelSeconds(p.zone, to, bagEmpty);
  const seconds = Math.max(2, Math.round((baseSec * weather.moveMult) / vehicle.speed));
  p.travel = { to, startedAt: now, endsAt: now + seconds * 1000, durationMs: seconds * 1000 };
  await savePlayer(p);
  return { player: p, seconds };
}

// ---------- Nhiệm vụ ----------
export async function questAction(playerId: string, action: "claim" | "reroll", questId: string): Promise<{ player: Player; message: string }> {
  const now = Date.now();
  const p = await getPlayer(playerId);
  if (!p) throw new GameError("Không tìm thấy người chơi.", 404);
  checkSpam(p, now);
  const idx = p.quests.findIndex((q) => q.id === questId);
  if (idx < 0) throw new GameError("Không tìm thấy nhiệm vụ.", 404);
  const q = p.quests[idx];
  if (action === "claim") {
    if (!q.done) throw new GameError("Nhiệm vụ chưa xong đâu, cố lên nha!", 400);
    if (q.claimed) throw new GameError("Đã nhận thưởng rồi.", 400);
    q.claimed = true;
    p.xu += q.rewardXu;
    addExp(p, q.rewardExp, now);
    pushEvent(p, "quest", `Nhận thưởng: +${q.rewardXu.toLocaleString("vi-VN")} Xu, +${q.rewardExp} EXP.`, now);
    p.quests[idx] = genQuest(p, idx);
    await savePlayer(p);
    return { player: p, message: `Nhận thưởng nhiệm vụ: +${q.rewardXu.toLocaleString("vi-VN")} Xu, +${q.rewardExp} EXP!` };
  }
  // reroll: đổi đơn mới (miễn phí, giữ lại 2 đơn còn lại)
  p.quests[idx] = genQuest(p, idx);
  await savePlayer(p);
  return { player: p, message: "Đã đổi sang đơn hàng mới, chúc may mắn nha!" };
}

// ---------- Xe ----------
export async function garageAction(
  playerId: string,
  action: "rent" | "buy" | "activate",
  vehicleId: string,
): Promise<{ player: Player; message: string }> {
  const now = Date.now();
  const p = await getPlayer(playerId);
  if (!p) throw new GameError("Không tìm thấy người chơi.", 404);
  checkSpam(p, now);
  const v = VEHICLE_MAP[vehicleId];
  if (!v) throw new GameError("Xe không tồn tại.", 400);
  if (v.level > p.level) throw new GameError(`Xe này cần đạt Lv.${v.level} mới dùng được.`, 403);
  if (p.travel) throw new GameError("Đang di chuyển thì không đổi xe được đâu!", 400);

  if (action === "rent") {
    if (v.id === "basket") throw new GameError("Giỏ Mây Nhỏ là xe mặc định miễn phí rồi.", 400);
    if (p.xu < v.rent) throw new GameError(`Không đủ Xu để thuê! Cần ${v.rent.toLocaleString("vi-VN")} Xu.`, 400);
    if (bagUsed(p) > v.slots) throw new GameError("Túi hiện tại không vừa xe này, bán bớt hàng đã!", 400);
    p.xu -= v.rent;
    p.rentalVehicle = { vehicleId: v.id, tripsLeft: RENTAL_TRIPS };
    p.activeVehicle = v.id;
    updateQuestProgress(p, (q) => {
      if (q.kind === "upgrade_vehicle") q.progress = 1;
    });
    await savePlayer(p);
    return { player: p, message: `Đã thuê ${v.name} cho chuyến tới (${v.rent.toLocaleString("vi-VN")} Xu). Chạy nhanh lên nha!` };
  }
  if (action === "buy") {
    if (v.id === "basket") throw new GameError("Giỏ Mây Nhỏ là xe mặc định miễn phí rồi.", 400);
    if (p.vehiclesOwned.includes(v.id)) throw new GameError("Bạn đã mua xe này rồi.", 400);
    if (p.xu < v.buy) throw new GameError(`Không đủ Xu để mua! Cần ${v.buy.toLocaleString("vi-VN")} Xu.`, 400);
    p.xu -= v.buy;
    p.vehiclesOwned.push(v.id);
    p.activeVehicle = v.id;
    updateQuestProgress(p, (q) => {
      if (q.kind === "upgrade_vehicle") q.progress = 1;
    });
    await savePlayer(p);
    return { player: p, message: `Đã mua đứt ${v.name}! Từ giờ chạy hàng không lo phí thuê nữa. UwU` };
  }
  // activate
  if (!p.vehiclesOwned.includes(v.id)) throw new GameError("Bạn chưa sở hữu xe này.", 400);
  if (bagUsed(p) > v.slots) throw new GameError("Túi hiện tại không vừa xe này, bán bớt hàng đã!", 400);
  p.activeVehicle = v.id;
  p.rentalVehicle = null;
  await savePlayer(p);
  return { player: p, message: `Đã chuyển sang dùng ${v.name}.` };
}

// ---------- Nhân viên ----------
export async function staffAction(
  playerId: string,
  action: "hire" | "upgrade",
  staffType: StaffType,
  mode?: "rent" | "owned",
): Promise<{ player: Player; message: string }> {
  const now = Date.now();
  const p = await getPlayer(playerId);
  if (!p) throw new GameError("Không tìm thấy người chơi.", 404);
  checkSpam(p, now);
  const def = STAFF_MAP[staffType];
  if (!def) throw new GameError("Nhân viên không tồn tại.", 400);
  const existing = p.staff.find((s) => s.type === staffType);

  if (action === "hire") {
    if (existing) throw new GameError(`${def.name} đã ở trong đội của bạn rồi.`, 400);
    if (p.staff.length >= levelInfo(p).maxStaff) {
      throw new GameError(`Cấp hiện tại chỉ thuê tối đa ${levelInfo(p).maxStaff} nhân viên. Lên cấp để thuê thêm!`, 400);
    }
    if (mode === "rent") {
      if (p.xu < def.rent) throw new GameError(`Không đủ Xu! Thuê ${def.name} cần ${def.rent.toLocaleString("vi-VN")} Xu/ca.`, 400);
      p.xu -= def.rent;
      p.staff.push({ type: staffType, level: 1, mode: "rent", expiresAt: now + STAFF_RENT_MS });
      updateQuestProgress(p, (q) => {
        if (q.kind === "hire_staff" && (!q.staffType || q.staffType === staffType)) q.progress = 1;
      });
      await savePlayer(p);
      return { player: p, message: `Đã thuê ${def.name} theo ca (5 phút, ${def.rent.toLocaleString("vi-VN")} Xu).` };
    }
    if (p.xu < def.buy) throw new GameError(`Không đủ Xu! Tuyển ${def.name} cần ${def.buy.toLocaleString("vi-VN")} Xu.`, 400);
    p.xu -= def.buy;
    p.staff.push({ type: staffType, level: 1, mode: "owned", expiresAt: null });
    updateQuestProgress(p, (q) => {
      if (q.kind === "hire_staff" && (!q.staffType || q.staffType === staffType)) q.progress = 1;
    });
    await savePlayer(p);
    return { player: p, message: `Đã tuyển ${def.name} về đội vĩnh viễn!` };
  }

  // upgrade
  if (!existing) throw new GameError("Bạn chưa có nhân viên này.", 400);
  if (existing.mode !== "owned") throw new GameError("Chỉ nhân viên tuyển dài hạn mới nâng cấp được.", 400);
  if (existing.level >= 3) throw new GameError("Nhân viên đã đạt cấp tối đa.", 400);
  const cost = def.upgrade[existing.level - 1];
  if (p.xu < cost) throw new GameError(`Không đủ Xu! Nâng cấp cần ${cost.toLocaleString("vi-VN")} Xu.`, 400);
  p.xu -= cost;
  existing.level += 1;
  await savePlayer(p);
  return { player: p, message: `${def.name} đã lên cấp ${existing.level}! Mạnh hơn rồi nha.` };
}

// ---------- Shop chống lạm phát ----------
export async function shopAction(
  playerId: string,
  action: "buy" | "equip",
  shopId: string,
): Promise<{ player: Player; message: string }> {
  const now = Date.now();
  const p = await getPlayer(playerId);
  if (!p) throw new GameError("Không tìm thấy người chơi.", 404);
  checkSpam(p, now);
  const item = SHOP_ITEMS.find((s) => s.id === shopId);
  if (!item) throw new GameError("Vật phẩm không tồn tại.", 400);
  if (item.level > p.level) throw new GameError(`Cần đạt Lv.${item.level} mới mua được.`, 403);
  const owned = item.kind === "title" ? p.titlesOwned : p.decorsOwned;
  if (action === "buy") {
    if (owned.includes(item.id)) throw new GameError("Bạn đã sở hữu vật phẩm này rồi.", 400);
    if (p.xu < item.price) throw new GameError(`Không đủ Xu! Cần ${item.price.toLocaleString("vi-VN")} Xu.`, 400);
    p.xu -= item.price;
    owned.push(item.id);
    await savePlayer(p);
    return { player: p, message: `Đã mua ${item.name}! Xinh quá đi UwU` };
  }
  if (!owned.includes(item.id)) throw new GameError("Bạn chưa sở hữu vật phẩm này.", 400);
  if (item.kind === "title") p.activeTitle = item.id;
  else p.activeDecor = item.id;
  await savePlayer(p);
  return { player: p, message: `Đã trang bị ${item.name}.` };
}

// ---------- Bảng xếp hạng ----------
// Cache 10 giây: bảng xếp hạng chỉ tính lại tối đa 1 lần / 10s thay vì đọc hết
// người chơi mỗi lần có người hỏi state — tiết kiệm rất nhiều lượt gọi Redis.
const LB_CACHE_TTL_MS = 10_000;

export async function getLeaderboard(): Promise<{ season: { id: string; endsAt: number }; entries: LeaderboardEntry[] }> {
  const now = Date.now();
  const season = currentSeason(now);
  try {
    const raw = await storeGet("leaderboard:cache");
    if (raw) {
      const cached = JSON.parse(raw) as { at: number; seasonId: string; entries: LeaderboardEntry[] };
      if (cached.seasonId === season.id && now - cached.at < LB_CACHE_TTL_MS) {
        return { season, entries: cached.entries };
      }
    }
  } catch {
    // Cache hỏng thì tính lại như thường.
  }
  const players = await listPlayers();
  const entries: LeaderboardEntry[] = players
    .map((p) => {
      const nw = netWorth(p);
      const score = p.seasonId === season.id ? Math.max(0, nw - p.seasonBaseline) : nw;
      return {
        playerId: p.id,
        nickname: p.nickname,
        level: p.level,
        netWorth: nw,
        seasonScore: score,
        title: p.activeTitle,
        decor: p.activeDecor,
      };
    })
    .sort((a, b) => b.seasonScore - a.seasonScore || b.netWorth - a.netWorth)
    .slice(0, 20);
  await storeSet("leaderboard:cache", JSON.stringify({ at: now, seasonId: season.id, entries }));
  return { season, entries };
}
