import { fail, ok, readJson } from "@/lib/api-util";
import { buyFromMerchant, sellToCustomer } from "@/lib/game";

export const dynamic = "force-dynamic";

// Body: { playerId, action: "buy_merchant" | "sell_customer", waveIndex, offerId }
export async function POST(req: Request) {
  try {
    const body = await readJson<{ playerId: string; action: string; waveIndex: number; offerId: string }>(req);
    if (!body.playerId || !body.offerId || typeof body.waveIndex !== "number" || !Number.isInteger(body.waveIndex)) {
      return ok({ ok: false, error: "Thiếu thông tin giao dịch." }, 400);
    }
    if (body.action === "buy_merchant") {
      const res = await buyFromMerchant(body.playerId, body.waveIndex, body.offerId);
      return ok({ player: res.player, message: res.message, profit: null });
    }
    if (body.action === "sell_customer") {
      const res = await sellToCustomer(body.playerId, body.waveIndex, body.offerId);
      return ok({ player: res.player, message: res.message, profit: res.profit ?? null });
    }
    return ok({ ok: false, error: "Giao dịch này không còn nữa — mua bán giờ theo đợt Thương lái / Khách mua nha!" }, 400);
  } catch (e) {
    return fail(e);
  }
}
