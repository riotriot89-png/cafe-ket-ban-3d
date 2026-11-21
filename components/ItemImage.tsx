"use client";

import { useState } from "react";
import { ITEM_IMAGES, ZONE_IMAGES } from "@/lib/images";

// Ảnh món/khu nhúng base64 — hiện ảnh thật, lỗi thì rớt về emoji như cũ.
function BaseImage({
  src,
  emoji,
  alt,
  className,
}: {
  src: string | undefined;
  emoji: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className={`${className ?? ""} inline-flex items-center justify-center text-3xl`}>
        {emoji}
      </span>
    );
  }
  return <img src={src} alt={alt} className={className} draggable={false} onError={() => setFailed(true)} />;
}

export default function ItemImage({
  itemId,
  emoji,
  className,
}: {
  itemId: string;
  emoji: string;
  className?: string;
}) {
  return <BaseImage src={ITEM_IMAGES[itemId]} emoji={emoji} alt={itemId} className={className} />;
}

export function ZoneImage({
  zoneId,
  emoji,
  className,
}: {
  zoneId: string;
  emoji: string;
  className?: string;
}) {
  return <BaseImage src={ZONE_IMAGES[zoneId]} emoji={emoji} alt={zoneId} className={className} />;
}
