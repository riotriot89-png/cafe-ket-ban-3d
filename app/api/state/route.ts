import { fail, ok } from "@/lib/api-util";
import { getLeaderboard, getState } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ok({ ok: false, error: "Thiếu id người chơi." }, 400);
    const state = await getState(id);
    const lb = await getLeaderboard();
    state.leaderboard = lb.entries;
    return ok({ state });
  } catch (e) {
    return fail(e);
  }
}
