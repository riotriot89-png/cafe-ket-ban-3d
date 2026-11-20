// Tiện ích: hash/seeded random + mùa giải theo tuần.

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Random xác định theo (seed, tick): mọi client/server thấy cùng một số.
export function seeded01(seed: string, tick: number): number {
  const h = hashString(`${seed}:${tick}`);
  // xorshift
  let x = h || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

export function seededNoise(seed: string, tick: number): number {
  // -1..1, mượt theo thời gian: nội suy giữa 2 mốc ngẫu nhiên liên tiếp
  const a = seeded01(seed, tick);
  const b = seeded01(seed, tick + 1);
  const f = 0.5; // giữa nhịp, lấy trung bình có trọng số cố định
  return (a * (1 - f) + b * f) * 2 - 1;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// Mùa giải: theo tuần ISO, bắt đầu thứ 2 00:00 UTC, kết thúc thứ 2 tuần sau.
export function currentSeason(now: number): { id: string; endsAt: number } {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7; // thứ 2 = 0
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day, 0, 0, 0));
  const nextMonday = monday.getTime() + 7 * 24 * 3600_000;
  const isoWeek = Math.floor((monday.getTime() - Date.UTC(monday.getUTCFullYear(), 0, 1)) / (7 * 24 * 3600_000)) + 1;
  return { id: `${monday.getUTCFullYear()}-W${String(isoWeek).padStart(2, "0")}`, endsAt: nextMonday };
}
