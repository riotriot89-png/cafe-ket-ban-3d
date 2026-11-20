// Tài khoản người chơi: đăng ký / đăng nhập bằng tên tài khoản + mật khẩu.
// Mật khẩu hash bằng scrypt (muối riêng từng người, không lưu mật khẩu gốc).
// Session là token ngẫu nhiên, lưu trong store (Redis khi có, fallback In-Memory), hạn 30 ngày.
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { CUTE_NAMES } from "./config";
import { createPlayer, GameError } from "./game";
import { getPlayer, storeDelete, storeGet, storeSet } from "./store";
import type { Player } from "./types";

export const SESSION_COOKIE = "tmcc_session";
export const SESSION_MAX_AGE = 30 * 24 * 3600; // 30 ngày (giây)

export interface Account {
  username: string; // đã lowercase
  nickname: string;
  passwordHash: string; // hex scrypt 64 byte
  salt: string; // hex 16 byte
  playerId: string;
  createdAt: number;
}

interface SessionData {
  playerId: string;
  expiresAt: number;
}

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function validateUsername(username: string): void {
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new GameError("Tên tài khoản 3-20 ký tự, chỉ gồm chữ thường, số và dấu _.", 400);
  }
}

function validatePassword(password: string): void {
  if (password.length < 6 || password.length > 64) {
    throw new GameError("Mật khẩu dài 6-64 ký tự nha.", 400);
  }
}

function hashPassword(password: string, saltHex: string): string {
  return scryptSync(password, Buffer.from(saltHex, "hex"), 64, { N: 16384, r: 8, p: 1 }).toString("hex");
}

function verifyPassword(password: string, saltHex: string, hashHex: string): boolean {
  const hashed = Buffer.from(hashPassword(password, saltHex), "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (hashed.length !== expected.length) return false;
  return timingSafeEqual(hashed, expected);
}

async function getAccount(username: string): Promise<Account | null> {
  const raw = await storeGet(`account:${normalizeUsername(username)}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Account;
  } catch {
    return null;
  }
}

async function saveAccount(acc: Account): Promise<void> {
  await storeSet(`account:${acc.username}`, JSON.stringify(acc));
}

export async function createSession(playerId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const data: SessionData = { playerId, expiresAt: Date.now() + SESSION_MAX_AGE * 1000 };
  await storeSet(`session:${token}`, JSON.stringify(data));
  return token;
}

export async function getSessionPlayerId(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  const raw = await storeGet(`session:${token}`);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SessionData;
    if (!data.playerId || data.expiresAt < Date.now()) {
      await storeDelete(`session:${token}`);
      return null;
    }
    return data.playerId;
  } catch {
    return null;
  }
}

export async function destroySession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  await storeDelete(`session:${token}`);
}

// Chống đoán mật khẩu: tối đa 10 lần sai / 5 phút cho mỗi (tên tài khoản + IP).
const fails = new Map<string, number[]>();
function checkLoginLimit(key: string): void {
  const now = Date.now();
  const arr = (fails.get(key) ?? []).filter((t) => now - t < 5 * 60 * 1000);
  fails.set(key, arr);
  if (arr.length >= 10) {
    throw new GameError("Sai nhiều quá rồi, chờ 5 phút rồi thử lại nha.", 429);
  }
}
function recordLoginFail(key: string): void {
  const arr = fails.get(key) ?? [];
  arr.push(Date.now());
  fails.set(key, arr);
}

export async function registerAccount(input: {
  username: string;
  password: string;
  nickname?: string;
  linkPlayerId?: string;
  ip?: string;
}): Promise<{ account: Account; player: Player; token: string }> {
  const username = normalizeUsername(input.username);
  validateUsername(username);
  validatePassword(input.password);
  const nickname = (input.nickname ?? "").trim() || CUTE_NAMES[Math.floor(Math.random() * CUTE_NAMES.length)];
  if (nickname.length > 20) throw new GameError("Biệt danh tối đa 20 ký tự.", 400);

  const existed = await getAccount(username);
  if (existed) throw new GameError("Tên tài khoản này đã có người dùng rồi, chọn tên khác nha.", 409);

  let player: Player | null = null;
  if (input.linkPlayerId) {
    player = await getPlayer(input.linkPlayerId);
  }
  if (!player) {
    player = await createPlayer(nickname);
  }

  const salt = randomBytes(16).toString("hex");
  const account: Account = {
    username,
    nickname: player.nickname,
    passwordHash: hashPassword(input.password, salt),
    salt,
    playerId: player.id,
    createdAt: Date.now(),
  };
  await saveAccount(account);
  await storeSet(`accountByPlayer:${player.id}`, username);
  const token = await createSession(player.id);
  return { account, player, token };
}

export async function loginAccount(input: {
  username: string;
  password: string;
  ip?: string;
}): Promise<{ account: Account; player: Player; token: string }> {
  const username = normalizeUsername(input.username);
  const key = `login:${username}:${input.ip ?? "unknown"}`;
  checkLoginLimit(key);
  const account = await getAccount(username);
  if (!account || !verifyPassword(input.password, account.salt, account.passwordHash)) {
    recordLoginFail(key);
    throw new GameError("Sai tên tài khoản hoặc mật khẩu.", 401);
  }
  fails.delete(key);
  const player = await getPlayer(account.playerId);
  if (!player) throw new GameError("Không tìm thấy người chơi.", 404);
  const token = await createSession(player.id);
  return { account, player, token };
}
