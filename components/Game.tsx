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
import { CUTE_NAMES, LEVELS } from "@/lib/config";
import { playSound, type SoundKind } from "@/lib/sound";
import type { GameEvent, StateResponse, ZoneId } from "@/lib/types";
import TownCrier from "@/components/TownCrier";
import MarketBoard from "@/components/MarketBoard";
import BagPanel from "@/components/BagPanel";
import MapPanel from "@/components/MapPanel";
import QuestsPanel from "@/components/QuestsPanel";
import GaragePanel from "@/components/GaragePanel";
import StaffPanel from "@/components/StaffPanel";
import LeaderboardPanel from "@/components/LeaderboardPanel";
import ShopPanel from "@/components/ShopPanel";

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

  const doTrade = (itemId: string, action: "buy" | "sell", qty: number) =>
    act(async () => {
      const res = await api.trade(playerIdRef.current!, action, itemId, qty);
      pushToast(res.message, action === "buy" ? "info" : res.profit !== null && res.profit >= 0 ? "good" : "bad", action === "buy" ? "buy" : "sell");
      return res;
    }, "click");

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

  return (
    <main className="min-h-screen bg-[#FFFBF5] pb-10 text-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b-2 border-pink-100 bg-[#FFFBF5]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🧺</span>
            <div>
              <h1 className="text-xl font-black leading-none text-pink-600">TÚI MÙ CHẠY CHỢ</h1>
              <p className="text-[11px] font-bold text-pink-400">Buôn bán dễ thương • Chạy hàng vui vẻ ^w^</p>
            </div>
          </div>
          {state && (
            <>
              <div className="ml-auto flex items-center gap-2 rounded-full border-2 border-amber-200 bg-white px-3 py-1.5 shadow-sm">
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="font-extrabold text-amber-700">{state.player.xu.toLocaleString("vi-VN")} Xu</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border-2 border-pink-200 bg-white px-3 py-1.5 shadow-sm" title="Tổng tài sản ròng">
                <Wallet className="h-4 w-4 text-pink-500" />
                <span className="font-extrabold text-pink-700">{state.netWorth.toLocaleString("vi-VN")} Xu</span>
              </div>
              <div className="flex min-w-44 items-center gap-2 rounded-full border-2 border-violet-200 bg-white px-3 py-1.5 shadow-sm">
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
              <div className="flex items-center gap-1 rounded-full border-2 border-pink-200 bg-white px-2 py-1.5 shadow-sm">
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
                className="rounded-full border-2 border-pink-200 bg-white p-2 text-pink-600 shadow-sm transition active:translate-y-0.5"
              >
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              {accountUser ? (
                <button
                  onClick={doLogout}
                  title={`Đang đăng nhập: ${accountUser} — bấm để đăng xuất`}
                  className="rounded-full border-2 border-violet-200 bg-white px-3 py-1.5 text-xs font-extrabold text-violet-700 shadow-sm transition active:translate-y-0.5"
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
                  className="rounded-full border-2 border-violet-200 bg-violet-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition active:translate-y-0.5"
                >
                  Tạo tài khoản
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-4 px-4 pt-4">
        {state && <TownCrier market={state.market} now={now} />}

        {state ? (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <MarketBoard state={state} busy={busy} onTrade={doTrade} />
              </div>
              <div className="space-y-4">
                <BagPanel state={state} now={now} busy={busy} onSell={(id, q) => doTrade(id, "sell", q)} />
                <MapPanel state={state} now={now} busy={busy} onTravel={doTravel} />
                <QuestsPanel state={state} busy={busy} onClaim={(id) => doQuest("claim", id)} onReroll={(id) => doQuest("reroll", id)} />
                <LeaderboardPanel state={state} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <GaragePanel state={state} busy={busy} onGarage={doGarage} />
              <StaffPanel state={state} busy={busy} onStaff={(a, t, m) => doStaff(a, t, m)} />
            </div>
            <ShopPanel state={state} busy={busy} onShop={doShop} />
            <footer className="rounded-3xl border-2 border-pink-100 bg-white/70 px-4 py-3 text-center text-xs font-bold text-gray-400">
              Cấp độ thương lái: {LEVELS.map((l) => `Lv.${l.level} ${l.name}`).join(" • ")} — Giá thị trường đồng bộ cho cả xóm mỗi 10 giây. Chúc bạn buôn may bán đắt! UwU
            </footer>
          </>
        ) : (
          <div className="rounded-3xl border-2 border-pink-100 bg-white p-8 text-center">
            <div className="text-4xl">🌸</div>
            <p className="mt-2 font-extrabold text-pink-600">Đang mở sạp... nếu chờ lâu quá, thử tải lại trang nha!</p>
          </div>
        )}
      </div>

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

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-2xl border-2 px-3 py-2 text-sm font-bold shadow-lg ${toastStyle[t.kind]}`}>
            {t.text}
          </div>
        ))}
      </div>
    </main>
  );
}
