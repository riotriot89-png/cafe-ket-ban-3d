"use client";

import dynamic from "next/dynamic";

// Game chỉ chạy phía client (cần localStorage + Web Audio + fetch liên tục),
// tắt SSR cho trang này để tránh lỗi hydration do state khởi tạo từ localStorage.
const Game = dynamic(() => import("@/components/Game"), { ssr: false });

export default function Home() {
  return <Game />;
}
