import { fail, ok, readJson } from "@/lib/api-util";
import { travel } from "@/lib/game";
import type { ZoneId } from "@/lib/types";

export const dynamic = "force-dynamic";

// Body: { playerId, to: ZoneId }
export async function POST(req: Request) {
  try {
    const body = await readJson<{ playerId: string; to: ZoneId }>(req);
    if (!body.playerId || !body.to) return ok({ ok: false, error: "Thiếu thông tin di chuyển." }, 400);
    const res = await travel(body.playerId, body.to);
    return ok({ player: res.player, seconds: res.seconds, message: `Đang chạy hàng tới ${res.player.travel?.to}...` });
  } catch (e) {
    return fail(e);
  }
}
