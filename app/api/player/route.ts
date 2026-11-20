import { fail, ok, readJson } from "@/lib/api-util";
import { createPlayer, getState, renamePlayer } from "@/lib/game";
import { getPlayer } from "@/lib/store";

export const dynamic = "force-dynamic";

// Tạo người chơi guest mới (không cần đăng ký)
export async function POST(req: Request) {
  try {
    const body = await readJson<{ nickname?: string }>(req);
    const p = await createPlayer(body.nickname);
    return ok({ player: p }, 201);
  } catch (e) {
    return fail(e);
  }
}

// Đổi biệt danh
export async function PATCH(req: Request) {
  try {
    const body = await readJson<{ id: string; nickname: string }>(req);
    if (!body.id || !body.nickname) return ok({ ok: false, error: "Thiếu thông tin." }, 400);
    const p = await renamePlayer(body.id, body.nickname);
    return ok({ player: p });
  } catch (e) {
    return fail(e);
  }
}

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ok({ ok: false, error: "Thiếu id." }, 400);
    const p = await getPlayer(id);
    if (!p) return ok({ ok: false, error: "Không tìm thấy người chơi." }, 404);
    const state = await getState(id);
    return ok({ player: state.player });
  } catch (e) {
    return fail(e);
  }
}
