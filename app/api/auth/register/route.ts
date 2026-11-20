import { fail, ok, readJson } from "@/lib/api-util";
import { SESSION_COOKIE, SESSION_MAX_AGE, registerAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Tạo tài khoản mới. Nếu đang chơi khách (linkPlayerId) thì tài khoản giữ luôn
// tiến trình của nick khách đó, không mất Xu / đồ đã có.
export async function POST(req: Request) {
  try {
    const body = await readJson<{
      username?: string;
      password?: string;
      nickname?: string;
      linkPlayerId?: string;
    }>(req);
    if (!body.username || !body.password) {
      return ok({ ok: false, error: "Thiếu tên tài khoản hoặc mật khẩu." }, 400);
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const { account, player, token } = await registerAccount({
      username: body.username,
      password: body.password,
      nickname: body.nickname,
      linkPlayerId: body.linkPlayerId,
      ip,
    });
    const res = ok(
      { player: { id: player.id, nickname: player.nickname }, username: account.username },
      201,
    );
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
