import { fail, ok } from "@/lib/api-util";
import { getLeaderboard } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const lb = await getLeaderboard();
    return ok({ season: lb.season, entries: lb.entries });
  } catch (e) {
    return fail(e);
  }
}
