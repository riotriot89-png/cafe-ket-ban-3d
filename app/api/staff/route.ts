import { fail, ok, readJson } from "@/lib/api-util";
import { staffAction } from "@/lib/game";
import type { StaffType } from "@/lib/types";

export const dynamic = "force-dynamic";

// Body: { playerId, action: "hire" | "upgrade", staffType, mode?: "rent" | "owned" }
export async function POST(req: Request) {
  try {
    const body = await readJson<{ playerId: string; action: "hire" | "upgrade"; staffType: StaffType; mode?: "rent" | "owned" }>(req);
    if (!body.playerId || !body.staffType || !body.action) {
      return ok({ ok: false, error: "Thiếu thông tin nhân viên." }, 400);
    }
    const res = await staffAction(body.playerId, body.action, body.staffType, body.mode);
    return ok({ player: res.player, message: res.message });
  } catch (e) {
    return fail(e);
  }
}
