// Store trừu tượng: Upstash Redis (REST) khi có biến môi trường, fallback In-Memory.
// Upstash REST: GET {url}/get/{key} -> {result: string|null}; SET {url}/set/{key}/{value}
import { emptyMarketState, type MarketState } from "./market";
import type { Player } from "./types";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
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

export async function storeGet(key: string): Promise<string | null> {
  if (useRedis) {
    const v = await redisGet(key);
    if (v !== null) return v;
    return mem.get(key) ?? null; // fallback đọc bộ nhớ nếu Redis chưa có
  }
  return mem.get(key) ?? null;
}

export async function storeSet(key: string, value: string): Promise<void> {
  mem.set(key, value);
  if (useRedis) await redisSet(key, value);
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
  const out: Player[] = [];
  for (const id of idx) {
    const p = await getPlayer(id);
    if (p) out.push(p);
  }
  return out;
}

export function storeKind(): "redis" | "memory" {
  return useRedis ? "redis" : "memory";
}
