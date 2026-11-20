import { NextResponse } from "next/server";
import { GameError } from "@/lib/game";

export function ok(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function fail(err: unknown) {
  if (err instanceof GameError) {
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }
  console.error("[api]", err);
  return NextResponse.json({ ok: false, error: "Có lỗi xảy ra, thử lại nha T_T" }, { status: 500 });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
