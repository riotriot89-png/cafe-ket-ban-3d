import { fail, ok, readJson } from "@/lib/api-util";
import { trade } from "@/lib/game";

export const dynamic = "force-dynamic";

// Body: { playerId, action: "buy" | "sell", itemId, qty }
export async function POST(req: Request) {
  try {
    const body = await readJson<{ playerId: string; action: "buy" | "sell"; itemId: string; qty: number }>(req);
    if (!body.playerId || !body.itemId || !body.action) {
      return ok({ ok: false, error: "Thiếu thông tin giao dịch." }, 400);
    }
    const res = await trade(body.playerId, body.action, body.itemId, Number(body.qty) || 1);
    return ok({ player: res.player, message: res.message, profit: res.profit ?? null });
  } catch (e) {
    return fail(e);
  }
}
