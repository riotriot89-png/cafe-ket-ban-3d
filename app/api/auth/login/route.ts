import { fail, ok, readJson } from "@/lib/api-util";
import { SESSION_COOKIE, SESSION_MAX_AGE, loginAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ username?: string; password?: string }>(req);
    if (!body.username || !body.password) {
      return ok({ ok: false, error: "Thiếu tên tài khoản hoặc mật khẩu." }, 400);
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const { account, player, token } = await loginAccount({
      username: body.username,
      password: body.password,
      ip,
    });
    const res = ok({ player: { id: player.id, nickname: player.nickname }, username: account.username });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: "/",
      maxAge: SESSION_MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e) {
    return fail(e);
  }
}
