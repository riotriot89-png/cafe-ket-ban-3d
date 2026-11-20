// Client gọi API server.
import type { StateResponse } from "./types";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json()) as { ok: boolean; error?: string } & T;
  if (!data.ok) throw new Error(data.error ?? "Có lỗi xảy ra.");
  return data;
}

export const api = {
  async createPlayer(nickname?: string) {
    return call<{ player: { id: string; nickname: string } }>("/api/player", {
      method: "POST",
      body: JSON.stringify({ nickname }),
    });
  },
  async getState(id: string) {
    return call<{ state: StateResponse }>(`/api/state?id=${encodeURIComponent(id)}`);
  },
  async rename(id: string, nickname: string) {
    return call<{ player: { nickname: string } }>("/api/player", {
      method: "PATCH",
      body: JSON.stringify({ id, nickname }),
    });
  },
  async trade(playerId: string, action: "buy" | "sell", itemId: string, qty: number) {
    return call<{ player: unknown; message: string; profit: number | null }>("/api/trade", {
      method: "POST",
      body: JSON.stringify({ playerId, action, itemId, qty }),
    });
  },
  async travel(playerId: string, to: string) {
    return call<{ player: unknown; seconds: number; message: string }>("/api/travel", {
      method: "POST",
      body: JSON.stringify({ playerId, to }),
    });
  },
  async quest(playerId: string, action: "claim" | "reroll", questId: string) {
    return call<{ player: unknown; message: string }>("/api/quests", {
      method: "POST",
      body: JSON.stringify({ playerId, action, questId }),
    });
  },
  async garage(playerId: string, action: "rent" | "buy" | "activate", vehicleId: string) {
    return call<{ player: unknown; message: string }>("/api/garage", {
      method: "POST",
      body: JSON.stringify({ playerId, action, vehicleId }),
    });
  },
  async staff(playerId: string, action: "hire" | "upgrade", staffType: string, mode?: "rent" | "owned") {
    return call<{ player: unknown; message: string }>("/api/staff", {
      method: "POST",
      body: JSON.stringify({ playerId, action, staffType, mode }),
    });
  },
  async shop(playerId: string, action: "buy" | "equip", shopId: string) {
    return call<{ player: unknown; message: string }>("/api/shop", {
      method: "POST",
      body: JSON.stringify({ playerId, action, shopId }),
    });
  },
  async register(username: string, password: string, nickname?: string, linkPlayerId?: string) {
    return call<{ player: { id: string; nickname: string }; username: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, nickname, linkPlayerId }),
    });
  },
  async login(username: string, password: string) {
    return call<{ player: { id: string; nickname: string }; username: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  async logout() {
    return call<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  },
  // Trả về null khi chưa đăng nhập (không ném lỗi như các API khác).
  async me() {
    try {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as {
        ok: boolean;
        player?: { id: string; nickname: string };
        username?: string | null;
      };
      if (!data.ok || !data.player) return null;
      return { ...data.player, username: data.username ?? null };
    } catch {
      return null;
    }
  },
};
