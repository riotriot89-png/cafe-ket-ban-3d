"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Coins,
  Heart,
  Pencil,
  Sparkles,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { CUTE_NAMES, ZONES } from "@/lib/config";
import { CUSTOMER_AVATARS, MERCHANT_AVATARS } from "@/lib/images";
import { playSound, type SoundKind } from "@/lib/sound";
import type { GameEvent, StateResponse, ZoneId } from "@/lib/types";
import TownCrier from "@/components/TownCrier";
import MarketBoard, { type MarketSubTab } from "@/components/MarketBoard";
import BagPanel from "@/components/BagPanel";
import MapPanel from "@/components/MapPanel";
import QuestsPanel from "@/components/QuestsPanel";
import GaragePanel from "@/components/GaragePanel";
import StaffPanel from "@/components/StaffPanel";
import LeaderboardPanel from "@/components/LeaderboardPanel";
import ShopPanel from "@/components/ShopPanel";
import Sheet from "@/components/Sheet";
import { FocusedCustomer, FocusedMerchant } from "@/components/FocusedTrade";

interface Toast {
  id: string;
  text: string;
  kind: GameEvent["kind"];
}

const toastStyle: Record<Toast["kind"], string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800",
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  bad: "border-rose-200 bg-rose-50 text-rose-700",
  quest: "border-violet-200 bg-violet-50 text-violet-800",
  level: "border-yellow-200 bg-yellow-50 text-yellow-800",
};

// Sheet đang mở trên bản đồ: null = không mở gì (chỉ thấy map).
type SheetKind =
  | { kind: "market" }
  | { kind: "bag" }
  | { kind: "quests" }
  | { kind: "leaderboard" }
  | { kind: "garage" }
  | { kind: "staff" }
  | { kind: "shop" }
  | { kind: "merchant"; waveIndex: number; merchantIdx: number }
  | { kind: "customer"; waveIndex: number; customerIdx: number };

export default function Home() {
  const [playerId, setPlayerId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("tmcc_player_id"),
  );
  const [state, setState] = useState<StateResponse | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("tmcc_sound") !== "0";
  });
  const [showNameModal, setShowNameModal] = useState<boolean>(() =>
    typeof window === "undefined" ? false : !localStorage.getItem("tmcc_player_id"),
  );
  const [nameInput, setNameInput] = useState<string>(() => CUTE_NAMES[Math.floor(Math.random() * CUTE_NAMES.length)]);
  const [editingName, setEditingName] = useState(false);
  const [authTab, setAuthTab] = useState<"guest" | "register" | "login">("guest");
  const [accountUser, setAccountUser] = useState<string | null>(null);

  // Map-first: không còn tab nữa, mọi panel mở bằng bottom sheet phủ lên map.
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  // Tracker nhiệm vụ trên map: mặc định thu gọn thành pill nhỏ, bấm để xem 3 đơn.
  const [questOpen, setQuestOpen] = useState(false);
  // Tab con của chợ (mở sheet chợ vẫn nhớ đúng tab con).
  const [marketSubTab, setMarketSubTab] = useState<MarketSubTab>("merchant");
  const openMerchant = (waveIndex: number, merchantIdx: number) =>
    setSheet({ kind: "merchant", waveIndex, merchantIdx });
  const openCustomer = (waveIndex: number, customerIdx: number) =>
    setSheet({ kind: "customer", waveIndex, customerIdx });
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const seenEvents = useRef<Set<string>>(new Set());
  const playerIdRef = useRef<string | null>(null);
  const soundRef = useRef(true);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const pushToast = useCallback((text: string, kind: Toast["kind"], sound?: SoundKind) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((t) => [{ id, text, kind }, ...t].slice(0, 5));
    if (sound) playSound(sound, soundRef.current);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const refresh = useCallback(async (id: string) => {
    try {
      const res = await api.getState(id);
      setState(res.state);
      setNow(res.state.now);
      for (const ev of res.state.player.events) {
        if (!seenEvents.current.has(ev.id)) {
          seenEvents.current.add(ev.id);
          const sound: SoundKind = ev.kind === "bad" ? "bad" : ev.kind === "level" ? "level" : ev.kind === "quest" ? "quest" : ev.kind === "good" ? "sell" : "click";
          pushToast(ev.text, ev.kind, sound);
        }
      }
    } catch (e) {
      // Người chơi không còn trên server (bộ nhớ tạm của server đã mất) thì
      // xóa id cũ để hiện lại màn đặt tên, thay vì kẹt ở "Đang mở sạp..." mãi.
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("Không tìm thấy người chơi")) {
        localStorage.removeItem("tmcc_player_id");
        localStorage.removeItem("tmcc_nickname");
        playerIdRef.current = null;
        setPlayerId(null);
        setShowNameModal(true);
        pushToast("Phiên chơi cũ hết hạn rồi, đặt tên lại để vào sạp mới nha!", "info");
      }
      // Lỗi khác (mất mạng tạm thời) thì poll lần sau thử lại.
    }
  }, [pushToast]);

  // Khởi tạo: tải state lần đầu cho người chơi đã lưu (không setState đồng bộ trong effect)
  useEffect(() => {
    const savedId = localStorage.getItem("tmcc_player_id");
    if (savedId) {
      playerIdRef.current = savedId;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Tải state lần đầu từ server cho id đã lưu ở localStorage: đồng bộ với hệ thống ngoài khi mount, đúng mục đích của effect.
      void refresh(savedId);
      return;
    }
    // Chưa có nick khách: thử session tài khoản (đăng nhập từ lần trước) để vào sạp luôn.
    void (async () => {
      const me = await api.me();
      if (me) {
        localStorage.setItem("tmcc_player_id", me.id);
        localStorage.setItem("tmcc_nickname", me.nickname);
        playerIdRef.current = me.id;
        setPlayerId(me.id);
        if (me.username) setAccountUser(me.username);
        setShowNameModal(false);
        void refresh(me.id);
      }
    })();
  }, [refresh]);

  // Poll state mỗi 10s (giá chợ đổi mỗi 10s nên hỏi nhanh hơn cũng không có gì mới)
  // + đồng hồ đếm ngược mỗi 1s
  useEffect(() => {
    if (!playerId) return;
    const iv = window.setInterval(() => {
      if (playerIdRef.current) void refresh(playerIdRef.current);
    }, 10000);
    return () => window.clearInterval(iv);
  }, [playerId, refresh]);

  useEffect(() => {
    const iv = window.setInterval(() => setNow((n) => n + 1000), 1000);
    return () => window.clearInterval(iv);
  }, []);

  const joinGame = async () => {
    // Đã vào sạp rồi mà mở lại modal thì chỉ đóng modal, không tạo nick mới.
    if (playerIdRef.current) {
      setShowNameModal(false);
      return;
    }
    const name = nameInput.trim() || CUTE_NAMES[Math.floor(Math.random() * CUTE_NAMES.length)];
    setBusy(true);
    try {
      const res = await api.createPlayer(name);
      localStorage.setItem("tmcc_player_id", res.player.id);
      localStorage.setItem("tmcc_nickname", res.player.nickname);
      playerIdRef.current = res.player.id;
      setPlayerId(res.player.id);
      setShowNameModal(false);
      pushToast(`Chào mừng ${res.player.nickname} đến với xóm nhỏ! ^w^`, "good", "quest");
      await refresh(res.player.id);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Không vào được chợ.", "bad", "bad");
    } finally {
      setBusy(false);
    }
  };

  const enterWithAccount = (username: string, playerId: string, nickname: string) => {
    localStorage.setItem("tmcc_player_id", playerId);
    localStorage.setItem("tmcc_nickname", nickname);
    playerIdRef.current = playerId;
    setPlayerId(playerId);
    setAccountUser(username);
    setShowNameModal(false);
  };

  const doRegister = async () => {
    const username = usernameInput.trim();
    if (!username || !passwordInput) {
      setAuthError("Nhập đủ tên tài khoản và mật khẩu nha.");
      return;
    }
    setBusy(true);
    setAuthError("");
    try {
      // Đang chơi khách thì tài khoản mới giữ luôn tiến trình của nick khách đó.
      const linkId = localStorage.getItem("tmcc_player_id") ?? undefined;
      const res = await api.register(username, passwordInput, nameInput.trim() || undefined, linkId);
      enterWithAccount(res.username, res.player.id, res.player.nickname);
      pushToast(`Tạo tài khoản xong rồi, chào ${res.player.nickname}! Tiến trình giữ mãi mãi, đổi máy vẫn chơi tiếp nha ^w^`, "good", "quest");
      await refresh(res.player.id);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Không tạo được tài khoản.");
    } finally {
      setBusy(false);
    }
  };

  const doLogin = async () => {
    const username = usernameInput.trim();
    if (!username || !passwordInput) {
      setAuthError("Nhập đủ tên tài khoản và mật khẩu nha.");
      return;
    }
    setBusy(true);
    setAuthError("");
    try {
      const res = await api.login(username, passwordInput);
      enterWithAccount(res.username, res.player.id, res.player.nickname);
      pushToast(`Chào mừng trở lại, ${res.player.nickname}! ^w^`, "good", "quest");
      await refresh(res.player.id);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Không đăng nhập được.");
    } finally {
      setBusy(false);
    }
  };

  const doLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Mất mạng thì vẫn đăng xuất ở máy mình.
    }
    localStorage.removeItem("tmcc_player_id");
    localStorage.removeItem("tmcc_nickname");
    playerIdRef.current = null;
    setPlayerId(null);
    setState(null);
    setAccountUser(null);
    setAuthTab("guest");
    setShowNameModal(true);
    pushToast("Đã đăng xuất, hẹn gặp lại nha!", "info");
  };

  const act = async <T,>(fn: () => Promise<T>, okSound: SoundKind = "click"): Promise<T | null> => {
    if (!playerIdRef.current) return null;
    setBusy(true);
    try {
      const res = await fn();
      playSound(okSound, soundRef.current);
      await refresh(playerIdRef.current);
      return res;
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Có lỗi xảy ra.", "bad", "bad");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const doTrade = (action: "buy_merchant" | "sell_customer", waveIndex: number, offerId: string) =>
    act(async () => {
      const res = await api.trade(playerIdRef.current!, action, waveIndex, offerId);
      pushToast(res.message, action === "buy_merchant" ? "info" : res.profit !== null && res.profit >= 0 ? "good" : "bad", action === "buy_merchant" ? "buy" : "sell");
      return res;
    }, "click");

  // Mua/bán trong sheet tập trung: thành công thì đóng sheet để lộ map.
  const doTradeFocused = async (action: "buy_merchant" | "sell_customer", waveIndex: number, offerId: string) => {
    const res = await doTrade(action, waveIndex, offerId);
    if (res) setSheet(null);
  };

  const doTravel = (to: ZoneId) =>
    act(async () => {
      const res = await api.travel(playerIdRef.current!, to);
      pushToast(`Đang chạy hàng, tới nơi sau ${res.seconds}s nha!`, "info", "travel");
      return res;
    }, "travel");

  const doQuest = (action: "claim" | "reroll", questId: string) =>
    act(async () => {
      const res = await api.quest(playerIdRef.current!, action, questId);
      pushToast(res.message, "quest", "quest");
      return res;
    }, "quest");

  const doGarage = (action: "rent" | "buy" | "activate", vehicleId: string) =>
    act(async () => {
      const res = await api.garage(playerIdRef.current!, action, vehicleId);
      pushToast(res.message, "good", "buy");
      return res;
    }, "buy");

  const doStaff = (action: "hire" | "upgrade", staffType: string, mode?: "rent" | "owned") =>
    act(async () => {
      const res = await api.staff(playerIdRef.current!, action, staffType as never, mode);
      pushToast(res.message, "good", "buy");
      return res;
    }, "buy");

  const doShop = (action: "buy" | "equip", shopId: string) =>
    act(async () => {
      const res = await api.shop(playerIdRef.current!, action, shopId);
      pushToast(res.message, "good", "quest");
      return res;
    }, "quest");

  const saveName = async () => {
    if (!playerIdRef.current || !nameInput.trim()) return;
    setBusy(true);
    try {
      await api.rename(playerIdRef.current, nameInput.trim());
      pushToast("Đã đổi biệt danh mới xinh quá! UwU", "good", "click");
      setEditingName(false);
      await refresh(playerIdRef.current);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Không đổi được tên.", "bad", "bad");
    } finally {
      setBusy(false);
    }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem("tmcc_sound", next ? "1" : "0");
    if (next) playSound("click", true);
  };

  // Dữ liệu cho badge thanh icon dưới + banner di chuyển + tracker nhiệm vụ.
  const bagCount = state ? state.player.inventory.reduce((s, l) => s + l.qty, 0) : 0;
  const questsReady = state ? state.player.quests.filter((q) => q.done && !q.claimed).length : 0;
  const merchantCountdown = state
    ? (() => {
        const s = Math.max(0, Math.floor((state.waves.merchant.endsAt - now) / 1000));
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      })()
    : "3:00";
  const travel = state?.player.travel ?? null;
  const travelDest = travel ? ZONES.find((z) => z.id === travel.to) : null;
  const travelProgress = travel ? Math.min(1, Math.max(0, (now - travel.startedAt) / travel.durationMs)) : 0;
  const travelSecs = travel ? Math.max(0, Math.ceil((travel.endsAt - now) / 1000)) : 0;

  const NAV: { id: string; label: string; emoji: string; badge: string | null; sub: string | null; sheet: SheetKind }[] = [
    { id: "market", label: "Chợ", emoji: "🛒", badge: null, sub: merchantCountdown, sheet: { kind: "market" } },
    { id: "bag", label: "Túi", emoji: "🎒", badge: bagCount > 0 ? String(bagCount) : null, sub: null, sheet: { kind: "bag" } },
    { id: "quests", label: "Nhiệm vụ", emoji: "📋", badge: questsReady > 0 ? String(questsReady) : null, sub: null, sheet: { kind: "quests" } },
    { id: "leaderboard", label: "BXH", emoji: "🏆", badge: null, sub: null, sheet: { kind: "leaderboard" } },
    { id: "garage", label: "Gara", emoji: "🚚", badge: null, sub: null, sheet: { kind: "garage" } },
    { id: "staff", label: "Nhân viên", emoji: "🐾", badge: null, sub: null, sheet: { kind: "staff" } },
    { id: "shop", label: "Shop", emoji: "🛍️", badge: null, sub: null, sheet: { kind: "shop" } },
  ];

  const sheetTitle =
    !state || !sheet
      ? ""
      : sheet.kind === "market"
        ? "🛒 Chợ Xóm Nhỏ"
        : sheet.kind === "bag"
          ? "🎒 Túi Mù Của Bạn"
          : sheet.kind === "quests"
            ? "📋 Đơn Hàng Xóm Nhỏ"
            : sheet.kind === "leaderboard"
              ? "🏆 Bảng Xếp Hạng"
              : sheet.kind === "garage"
                ? "🚚 Gara Xe Chạy Chợ"
                : sheet.kind === "staff"
                  ? "🐾 Đội Nhân Viên"
                  : sheet.kind === "shop"
                    ? "🛍️ Shop Xóm Nhỏ"
                    : sheet.kind === "merchant"
                      ? `${state.waves.merchant.merchants[sheet.merchantIdx]?.emoji ?? "🛒"} ${state.waves.merchant.merchants[sheet.merchantIdx]?.name ?? "Thương lái"}`
                      : `${state.waves.customer.customers[sheet.customerIdx]?.emoji ?? "🧑"} ${state.waves.customer.customers[sheet.customerIdx]?.name ?? "Khách mua"}`;

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#FFFBF5] text-gray-800">
      {/* Header gọn: chỉ tiêu đề + Xu + tài sản + cấp + biệt danh + âm thanh + tài khoản */}
      <header className="flex-none border-b-2 border-pink-100 bg-gradient-to-b from-pink-100 to-[#FFFBF5]">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🧺</span>
            <div>
              <h1 className="text-xl font-black leading-none text-pink-600">TÚI MÙ CHẠY CHỢ</h1>
              <p className="hidden text-[11px] font-bold text-pink-400 sm:block">Buôn bán dễ thương • Chạy hàng vui vẻ ^w^</p>
            </div>
            {state && (
              <div className="ml-auto flex shrink-0 items-center gap-2 rounded-full border-2 border-amber-200 bg-white px-3 py-1.5 shadow-sm">
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="font-extrabold text-amber-700">{state.player.xu.toLocaleString("vi-VN")} Xu</span>
              </div>
            )}
          </div>
          {state && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex shrink-0 items-center gap-2 rounded-full border-2 border-pink-200 bg-white px-3 py-1.5 shadow-sm" title="Tổng tài sản ròng">
                <Wallet className="h-4 w-4 text-pink-500" />
                <span className="font-extrabold text-pink-700">{state.netWorth.toLocaleString("vi-VN")} Xu</span>
              </div>
              <div className="flex min-w-44 shrink-0 items-center gap-2 rounded-full border-2 border-violet-200 bg-white px-3 py-1.5 shadow-sm">
                <Sparkles className="h-4 w-4 shrink-0 text-violet-500" />
                <div className="min-w-0">
                  <div className="truncate text-xs font-extrabold text-violet-700">
                    Lv.{state.levelInfo.level} {state.levelInfo.name}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-100">
                    <div className="h-full rounded-full bg-violet-400" style={{ width: `${state.levelInfo.expProgress * 100}%` }} />
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-violet-500">
                  {state.levelInfo.expForNext ? `${state.levelInfo.exp}/${state.levelInfo.expForNext} EXP` : "MAX"}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-full border-2 border-pink-200 bg-white px-2 py-1.5 shadow-sm">
                <Heart className="h-4 w-4 text-pink-500" />
                {editingName ? (
                  <span className="flex items-center gap-1">
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      maxLength={20}
                      className="w-28 rounded-full border border-pink-300 px-2 py-0.5 text-sm font-bold outline-none"
                    />
                    <button onClick={saveName} disabled={busy} className="rounded-full bg-pink-500 px-2 py-0.5 text-xs font-extrabold text-white disabled:opacity-40">
                      Lưu
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setNameInput(state.player.nickname);
                      setEditingName(true);
                    }}
                    className="flex items-center gap-1 text-sm font-extrabold text-gray-700 hover:text-pink-600"
                    title="Đổi biệt danh"
                  >
                    {state.player.nickname} <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
              <button
                onClick={toggleSound}
                title={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}
                className="shrink-0 rounded-full border-2 border-pink-200 bg-white p-2 text-pink-600 shadow-sm transition active:translate-y-0.5"
              >
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              {accountUser ? (
                <button
                  onClick={doLogout}
                  title={`Đang đăng nhập: ${accountUser} — bấm để đăng xuất`}
                  className="shrink-0 rounded-full border-2 border-violet-200 bg-white px-3 py-1.5 text-xs font-extrabold text-violet-700 shadow-sm transition active:translate-y-0.5"
                >
                  @{accountUser} • Đăng xuất
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAuthTab("register");
                    setAuthError("");
                    setShowNameModal(true);
                  }}
                  title="Tạo tài khoản để giữ tiến trình mãi mãi, đổi máy vẫn chơi tiếp"
                  className="shrink-0 rounded-full border-2 border-violet-200 bg-violet-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition active:translate-y-0.5"
                >
                  Tạo tài khoản
                </button>
              )}
            </div>
          )}
        </div>
        {travel && travelDest && (
          <div className="mx-auto max-w-7xl px-4 pb-2">
            <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-sky-700">
                <span className="animate-bounce">🚚</span> Đang chạy tới {travelDest.emoji} {travelDest.name}... còn {travelSecs} giây
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sky-100">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-pink-400 transition-all" style={{ width: `${travelProgress * 100}%` }} />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Dải thông báo thời tiết / sự kiện: mỏng, dưới header */}
      {state && (
        <div className="mx-auto w-full max-w-7xl flex-none px-3 pt-2">
          <TownCrier market={state.market} now={now} />
        </div>
      )}

      {/* Bản đồ là cả thế giới: lấp đầy chiều cao còn lại */}
      <div className="relative min-h-0 flex-1">
        {state ? (
          <>
            <MapPanel state={state} now={now} busy={busy} onTravel={doTravel} onOpenMerchant={openMerchant} onOpenCustomer={openCustomer} />
            {/* Tracker nhiệm vụ: pill nhỏ ở giữa trên của map (không che khu/khách),
                bấm để mở rộng xem 3 đơn + tiến trình, bấm "Mở tất cả" để mở sheet nhiệm vụ */}
            <div className="absolute left-1/2 top-2 z-20 w-[min(220px,calc(100%-1rem))] -translate-x-1/2">
              <button
                onClick={() => setQuestOpen((o) => !o)}
                aria-label="Nhiệm vụ của bạn"
                className="w-full rounded-full border-2 border-violet-200 bg-white/90 px-3 py-1.5 shadow-md backdrop-blur transition active:translate-y-0.5"
              >
                <span className="flex items-center justify-between text-xs font-black text-violet-700">
                  <span>
                    📋 Nhiệm vụ{questsReady > 0 ? ` • ${questsReady} đơn xong!` : ""}
                  </span>
                  <span className="text-violet-400">{questOpen ? "▲" : "▼"}</span>
                </span>
              </button>
              {questOpen && (
                <div className="mt-1 rounded-2xl border-2 border-violet-200 bg-white/90 p-2 shadow-md backdrop-blur">
                  <div className="space-y-1">
                    {state.player.quests.slice(0, 3).map((q) => (
                      <div key={q.id}>
                        <div className="flex justify-between gap-2 text-[11px] font-bold text-gray-600">
                          <span className="truncate">
                            {q.done && !q.claimed ? "✅ " : ""}
                            {q.title}
                          </span>
                          <span className="shrink-0">
                            {Math.min(q.progress, q.target)}/{q.target}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-violet-100">
                          <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.min(1, q.progress / q.target) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setQuestOpen(false);
                      setSheet({ kind: "quests" });
                    }}
                    className="mt-2 w-full rounded-full bg-violet-500 py-1.5 text-xs font-extrabold text-white transition active:translate-y-0.5"
                  >
                    Mở tất cả →
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <div className="rounded-3xl border-2 border-pink-100 bg-white p-8 text-center">
              <div className="text-4xl">🌸</div>
              <p className="mt-2 font-extrabold text-pink-600">Đang mở sạp... nếu chờ lâu quá, thử tải lại trang nha!</p>
            </div>
          </div>
        )}
      </div>

      {/* Thanh icon dưới cùng: 7 nút mở sheet phủ lên map */}
      {state && (
        <nav className="flex-none border-t-2 border-pink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto flex max-w-7xl">
            {NAV.map((n) => {
              const active =
                sheet?.kind === n.id || (n.id === "market" && (sheet?.kind === "merchant" || sheet?.kind === "customer"));
              return (
                <button
                  key={n.id}
                  onClick={() => setSheet(n.sheet)}
                  className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-extrabold transition active:translate-y-0.5 ${
                    active ? "text-pink-600" : "text-gray-500"
                  }`}
                >
                  <span className="relative text-xl leading-none">
                    {n.emoji}
                    {n.badge && (
                      <span className="absolute -right-2.5 -top-1.5 min-w-5 rounded-full bg-pink-500 px-1 py-0.5 text-center text-[10px] font-black leading-none text-white">
                        {n.badge}
                      </span>
                    )}
                  </span>
                  <span>{n.label}</span>
                  {n.sub && <span className="-mt-0.5 text-[9px] font-bold leading-none text-pink-400">{n.sub}</span>}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Sheet phủ lên map */}
      {state && sheet && (
        <Sheet title={sheetTitle} onClose={() => setSheet(null)}>
          {sheet.kind === "market" && (
            <MarketBoard state={state} now={now} busy={busy} onTrade={doTrade} subTab={marketSubTab} onSubTabChange={setMarketSubTab} />
          )}
          {sheet.kind === "bag" && <BagPanel state={state} now={now} />}
          {sheet.kind === "quests" && (
            <QuestsPanel state={state} busy={busy} onClaim={(id) => doQuest("claim", id)} onReroll={(id) => doQuest("reroll", id)} />
          )}
          {sheet.kind === "leaderboard" && <LeaderboardPanel state={state} />}
          {sheet.kind === "garage" && <GaragePanel state={state} busy={busy} onGarage={doGarage} />}
          {sheet.kind === "staff" && <StaffPanel state={state} busy={busy} onStaff={(a, t, m) => doStaff(a, t, m)} />}
          {sheet.kind === "shop" && <ShopPanel state={state} busy={busy} onShop={doShop} />}
          {sheet.kind === "merchant" &&
            (() => {
              const m = state.waves.merchant.merchants[sheet.merchantIdx];
              if (!m || state.waves.merchant.waveIndex !== sheet.waveIndex) {
                return <p className="py-4 text-center text-sm font-bold text-gray-500">Đợt này đi rồi, chờ đợt thương lái sau nha!</p>;
              }
              return (
                <FocusedMerchant
                  state={state}
                  now={now}
                  busy={busy}
                  merchant={m}
                  avatar={MERCHANT_AVATARS[sheet.merchantIdx % MERCHANT_AVATARS.length]}
                  onTrade={doTradeFocused}
                />
              );
            })()}
          {sheet.kind === "customer" &&
            (() => {
              const c = state.waves.customer.customers[sheet.customerIdx];
              if (!c || state.waves.customer.waveIndex !== sheet.waveIndex) {
                return <p className="py-4 text-center text-sm font-bold text-gray-500">Khách này đi rồi, chờ đợt khách sau nha!</p>;
              }
              return (
                <FocusedCustomer
                  state={state}
                  now={now}
                  busy={busy}
                  customer={c}
                  avatar={CUSTOMER_AVATARS[sheet.customerIdx % CUSTOMER_AVATARS.length]}
                  onTrade={doTradeFocused}
                />
              );
            })()}
        </Sheet>
      )}

      {/* Modal vào chơi: chơi ngay / tạo tài khoản / đăng nhập */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pink-950/40 p-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-pink-200 bg-white p-6 text-center shadow-[0_10px_0_rgba(244,114,182,0.25)]">
            <div className="text-5xl">🧺</div>
            <h2 className="mt-2 text-xl font-black text-pink-600">Chào mừng tới Túi Mù Chạy Chợ!</h2>
            <p className="mt-1 text-sm font-bold text-gray-500">
              {authTab === "guest"
                ? "Chơi ngay không cần đăng ký. Đặt cho mình một biệt danh dễ thương nha ^w^"
                : authTab === "register"
                  ? "Tạo tài khoản để giữ tiến trình mãi mãi, đổi máy vẫn chơi tiếp nha!"
                  : "Đăng nhập để chơi tiếp sạp hàng của bạn nè!"}
            </p>

            <div className="mt-4 flex gap-2">
              {(
                [
                  ["guest", "Chơi ngay"],
                  ["register", "Tạo tài khoản"],
                  ["login", "Đăng nhập"],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => {
                    setAuthTab(tab);
                    setAuthError("");
                  }}
                  className={`flex-1 rounded-full py-2 text-xs font-extrabold transition ${
                    authTab === tab ? "bg-pink-500 text-white shadow-[0_3px_0_rgba(190,24,93,0.4)]" : "bg-pink-50 text-pink-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {authTab === "guest" ? (
              <>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={20}
                  placeholder="Biệt danh của bạn..."
                  className="mt-4 w-full rounded-full border-2 border-pink-200 px-4 py-2.5 text-center font-extrabold outline-none focus:border-pink-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void joinGame();
                  }}
                />
                <button
                  onClick={joinGame}
                  disabled={busy}
                  className="mt-3 w-full rounded-full bg-pink-500 py-3 font-extrabold text-white shadow-[0_5px_0_rgba(190,24,93,0.4)] transition active:translate-y-1 active:shadow-none disabled:opacity-50"
                >
                  {busy ? "Đang dọn sạp..." : "Vào chợ ngay! UwU"}
                </button>
                <p className="mt-2 text-xs font-semibold text-gray-400">Bắt đầu với 1.000 Xu • Tiến trình lưu trên máy bạn</p>
              </>
            ) : (
              <>
                <input
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  maxLength={20}
                  placeholder="Tên tài khoản (vd: beo_2009)"
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="mt-4 w-full rounded-full border-2 border-pink-200 px-4 py-2.5 text-center font-extrabold outline-none focus:border-pink-400"
                />
                <input
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  type="password"
                  maxLength={64}
                  placeholder="Mật khẩu (từ 6 ký tự)"
                  className="mt-3 w-full rounded-full border-2 border-pink-200 px-4 py-2.5 text-center font-extrabold outline-none focus:border-pink-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void (authTab === "register" ? doRegister() : doLogin());
                  }}
                />
                {authTab === "register" && (
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={20}
                    placeholder="Biệt danh trong chợ..."
                    className="mt-3 w-full rounded-full border-2 border-pink-200 px-4 py-2.5 text-center font-extrabold outline-none focus:border-pink-400"
                  />
                )}
                {authError && <p className="mt-3 text-sm font-bold text-rose-600">{authError}</p>}
                <button
                  onClick={() => void (authTab === "register" ? doRegister() : doLogin())}
                  disabled={busy}
                  className="mt-3 w-full rounded-full bg-pink-500 py-3 font-extrabold text-white shadow-[0_5px_0_rgba(190,24,93,0.4)] transition active:translate-y-1 active:shadow-none disabled:opacity-50"
                >
                  {busy ? "Đang xử lý..." : authTab === "register" ? "Tạo tài khoản! UwU" : "Đăng nhập! UwU"}
                </button>
                <p className="mt-2 text-xs font-semibold text-gray-400">
                  {authTab === "register"
                    ? "Đang chơi khách thì tài khoản mới giữ luôn Xu và đồ của bạn."
                    : "Quên mật khẩu thì tạo tài khoản mới nha, hiện chưa có khôi phục."}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toasts (đẩy lên trên thanh icon dưới) */}
      <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-80">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-2xl border-2 px-3 py-2 text-sm font-bold shadow-lg ${toastStyle[t.kind]}`}>
            {t.text}
          </div>
        ))}
      </div>
    </main>
  );
}
