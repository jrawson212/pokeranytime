"use client";

import { cardLabel, type Card } from "@/lib/cards";

const SIZES = {
  sm: { w: 40, h: 58 },
  md: { w: 56, h: 81 },
  lg: { w: 76, h: 110 },
} as const;

function cardSrc(card: Card): string {
  return `/cards/${card}.png`;
}

export function PlayingCard({
  card,
  size = "md",
}: {
  card: Card;
  size?: keyof typeof SIZES;
}) {
  const { w, h } = SIZES[size];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cardSrc(card)}
      alt={cardLabel(card)}
      width={w}
      height={h}
      draggable={false}
      className="shrink-0 rounded-[4px] shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
      style={{ width: w, height: h, objectFit: "contain" }}
    />
  );
}

export function CardRow({
  cards,
  size = "md",
  empty = 0,
}: {
  cards: Card[];
  size?: keyof typeof SIZES;
  empty?: number;
  emptyLabel?: string;
}) {
  const { w, h } = SIZES[size];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {cards.map((card) => (
        <PlayingCard key={card} card={card} size={size} />
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <div
          key={`empty-${i}`}
          className="shrink-0 rounded-[4px] border border-dashed border-white/25 bg-black/25"
          style={{ width: w, height: h }}
          aria-hidden
        />
      ))}
    </div>
  );
}
