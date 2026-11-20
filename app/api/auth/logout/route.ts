import { cookies } from "next/headers";
import { fail, ok } from "@/lib/api-util";
import { SESSION_COOKIE, destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    await destroySession(token ?? null);
    const res = ok({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    return fail(e);
  }
}
