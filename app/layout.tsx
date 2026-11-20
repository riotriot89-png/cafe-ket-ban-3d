import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Túi Mù Chạy Chợ — Game buôn bán dễ thương",
  description: "Game buôn bán, chạy hàng multiplayer thời gian thực phong cách Cozy Cute. Mua thấp bán cao, chạy hàng qua 4 khu chợ, leo top thương lái xóm nhỏ!",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#FFFBF5] font-sans">{children}</body>
    </html>
  );
}
