import { cookies } from "next/headers";
import { fail, ok } from "@/lib/api-util";
import { SESSION_COOKIE, getSessionPlayerId } from "@/lib/auth";
import { getPlayer, storeGet } from "@/lib/store";

export const dynamic = "force-dynamic";

// Người chơi đã đăng nhập (còn session cookie) thì trả về nick của họ,
// để mở web là vào sạp luôn không cần đăng nhập lại.
export async function GET() {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const playerId = await getSessionPlayerId(token);
    if (!playerId) return ok({ ok: false, error: "Chưa đăng nhập." }, 401);
    const player = await getPlayer(playerId);
    if (!player) return ok({ ok: false, error: "Không tìm thấy người chơi." }, 404);
    const username = await storeGet(`accountByPlayer:${player.id}`);
    return ok({ player: { id: player.id, nickname: player.nickname }, username: username ?? null });
  } catch (e) {
    return fail(e);
  }
}
