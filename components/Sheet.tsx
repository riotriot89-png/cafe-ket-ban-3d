"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

// Bottom sheet dùng chung: trượt lên trên bản đồ, bấm nền mờ hoặc nút X để đóng.
export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-pink-950/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t-2 border-pink-200 bg-[#FFFBF5] pb-6 shadow-[0_-10px_30px_rgba(190,24,93,0.25)] sm:mx-auto sm:max-w-2xl">
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-pink-200" />
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b-2 border-pink-100 bg-[#FFFBF5]/95 px-4 py-3 backdrop-blur">
          <h2 className="min-w-0 truncate text-lg font-black text-pink-700">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="shrink-0 rounded-full border-2 border-pink-200 bg-white p-2 text-pink-600 shadow-sm transition active:translate-y-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 pt-3">{children}</div>
      </div>
    </div>
  );
}
