import { fail, ok, readJson } from "@/lib/api-util";
import { shopAction } from "@/lib/game";

export const dynamic = "force-dynamic";

// Body: { playerId, action: "buy" | "equip", shopId }
export async function POST(req: Request) {
  try {
    const body = await readJson<{ playerId: string; action: "buy" | "equip"; shopId: string }>(req);
    if (!body.playerId || !body.shopId || !body.action) {
      return ok({ ok: false, error: "Thiếu thông tin cửa hàng." }, 400);
    }
    const res = await shopAction(body.playerId, body.action, body.shopId);
    return ok({ player: res.player, message: res.message });
  } catch (e) {
    return fail(e);
  }
}
