import { fail, ok, readJson } from "@/lib/api-util";
import { questAction } from "@/lib/game";

export const dynamic = "force-dynamic";

// Body: { playerId, action: "claim" | "reroll", questId }
export async function POST(req: Request) {
  try {
    const body = await readJson<{ playerId: string; action: "claim" | "reroll"; questId: string }>(req);
    if (!body.playerId || !body.questId || !body.action) {
      return ok({ ok: false, error: "Thiếu thông tin nhiệm vụ." }, 400);
    }
    const res = await questAction(body.playerId, body.action, body.questId);
    return ok({ player: res.player, message: res.message });
  } catch (e) {
    return fail(e);
  }
}
