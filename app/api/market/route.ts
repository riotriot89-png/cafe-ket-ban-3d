import { fail, ok } from "@/lib/api-util";
import { getMarket } from "@/lib/game";
import { storeKind } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { snap } = await getMarket(Date.now());
    return ok({ market: snap, store: storeKind() });
  } catch (e) {
    return fail(e);
  }
}
