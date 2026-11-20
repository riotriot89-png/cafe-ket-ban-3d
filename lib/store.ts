// Store trừu tượng: Upstash Redis (REST) khi có biến môi trường, fallback In-Memory.
// Upstash REST: GET {url}/get/{key} -> {result: string|null}; SET {url}/set/{key}/{value}
import { emptyMarketState, type MarketState } from "./market";
import type { Player } from "./types";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const useRedis = Boolean(REDIS_URL && REDIS_TOKEN);

const mem = new Map<string, string>();
let redisWarned = false;

async function redisGet(key: string): Promise<string | null> {
  try {
    const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string | null };
    return data.result ?? null;
  } catch {
    if (!redisWarned) {
      redisWarned = true;
      console.warn("[store] Redis lỗi, dùng In-Memory tạm thời.");
    }
    return null;
  }
}

async function redisSet(key: string, value: string): Promise<void> {
  try {
    await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      cache: "no-store",
    });
  } catch {
    if (!redisWarned) {
      redisWarned = true;
      console.warn("[store] Redis lỗi, dùng In-Memory tạm thời.");
    }
  }
}

// Đọc nhiều key bằng 1 lệnh MGET (tiết kiệm lượt gọi Redis khi đông người chơi).
async function redisMget(keys: string[]): Promise<(string | null)[]> {
  try {
    const path = keys.map((k) => encodeURIComponent(k)).join("/");
    const res = await fetch(`${REDIS_URL}/mget/${path}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return keys.map(() => null);
    const data = (await res.json()) as { result?: (string | null)[] };
    const arr = data.result ?? [];
    return keys.map((_, i) => arr[i] ?? null);
  } catch {
    if (!redisWarned) {
      redisWarned = true;
      console.warn("[store] Redis lỗi, dùng In-Memory tạm thời.");
    }
    return keys.map(() => null);
  }
}

async function redisDel(key: string): Promise<void> {
  try {
    await fetch(`${REDIS_URL}/del/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      cache: "no-store",
    });
  } catch {
    // Xóa session lỗi thì session cũ tự hết hạn theo expiresAt, không chặn luồng chính.
  }
}

export async function storeGet(key: string): Promise<string | null> {
  if (useRedis) {
    const v = await redisGet(key);
    if (v !== null) return v;
    return mem.get(key) ?? null; // fallback đọc bộ nhớ nếu Redis chưa có
  }
  return mem.get(key) ?? null;
}

export async function storeGetMany(keys: string[]): Promise<(string | null)[]> {
  if (keys.length === 0) return [];
  if (useRedis) {
    const vs = await redisMget(keys);
    return vs.map((v, i) => (v !== null ? v : (mem.get(keys[i]) ?? null)));
  }
  return keys.map((k) => mem.get(k) ?? null);
}

export async function storeSet(key: string, value: string): Promise<void> {
  mem.set(key, value);
  if (useRedis) await redisSet(key, value);
}

export async function storeDelete(key: string): Promise<void> {
  mem.delete(key);
  if (useRedis) await redisDel(key);
}

// ---------- Market ----------
export async function getMarketState(): Promise<MarketState> {
  const raw = await storeGet("market");
  if (!raw) return emptyMarketState();
  try {
    const parsed = JSON.parse(raw) as MarketState;
    if (!parsed.offsets || !parsed.history) return emptyMarketState();
    return parsed;
  } catch {
    return emptyMarketState();
  }
}

export async function saveMarketState(s: MarketState): Promise<void> {
  await storeSet("market", JSON.stringify(s));
}

// ---------- Players ----------
export async function getPlayer(id: string): Promise<Player | null> {
  const raw = await storeGet(`player:${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Player;
  } catch {
    return null;
  }
}

export async function savePlayer(p: Player): Promise<void> {
  await storeSet(`player:${p.id}`, JSON.stringify(p));
  const idxRaw = await storeGet("players:index");
  const idx: string[] = idxRaw ? (JSON.parse(idxRaw) as string[]) : [];
  if (!idx.includes(p.id)) {
    idx.push(p.id);
    await storeSet("players:index", JSON.stringify(idx));
  }
}

export async function listPlayers(): Promise<Player[]> {
  const idxRaw = await storeGet("players:index");
  const idx: string[] = idxRaw ? (JSON.parse(idxRaw) as string[]) : [];
  if (idx.length === 0) return [];
  const raws = await storeGetMany(idx.map((id) => `player:${id}`));
  const out: Player[] = [];
  for (const raw of raws) {
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw) as Player);
    } catch {
      // Bỏ qua bản ghi hỏng, không làm sập bảng xếp hạng.
    }
  }
  return out;
}

export function storeKind(): "redis" | "memory" {
  return useRedis ? "redis" : "memory";
}
