import { fail, ok, readJson } from "@/lib/api-util";
import { garageAction } from "@/lib/game";

export const dynamic = "force-dynamic";

// Body: { playerId, action: "rent" | "buy" | "activate", vehicleId }
export async function POST(req: Request) {
  try {
    const body = await readJson<{ playerId: string; action: "rent" | "buy" | "activate"; vehicleId: string }>(req);
    if (!body.playerId || !body.vehicleId || !body.action) {
      return ok({ ok: false, error: "Thiếu thông tin xe." }, 400);
    }
    const res = await garageAction(body.playerId, body.action, body.vehicleId);
    return ok({ player: res.player, message: res.message });
  } catch (e) {
    return fail(e);
  }
}
