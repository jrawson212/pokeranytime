"use client";

import { useRouter } from "next/navigation";
import { ChipAmount } from "@/components/ChipStack";
import { FeltButton } from "@/components/FeltButton";
import { formatChips } from "@/lib/chips";

type Player = {
  _id: string;
  name: string;
  stack: number;
};

export function GameOverScreen({
  players,
  buyIn,
}: {
  players: Player[];
  buyIn: number;
}) {
  const router = useRouter();
  const ranked = [...players].sort((a, b) => b.stack - a.stack);

  return (
    <div className="phone-screen mx-auto flex h-dvh max-w-md flex-col felt-bg">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-gold">
        Game over
      </p>
      <h1 className="mt-2 text-center text-4xl font-bold">Final stacks</h1>
      <ul className="mt-8 space-y-2">
        {ranked.map((p, i) => {
          const delta = p.stack - buyIn;
          return (
            <li
              key={p._id}
              className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3"
            >
              <span>
                <span className="mr-2 text-felt-muted">{i + 1}.</span>
                <span className="font-semibold">{p.name}</span>
              </span>
              <span className="flex items-center gap-2 text-right">
                <ChipAmount amount={p.stack} />
                <span
                  className={`text-xs ${delta > 0 ? "text-gold" : delta < 0 ? "text-danger" : "text-felt-muted"}`}
                >
                  {delta > 0 ? "+" : ""}
                  {formatChips(delta)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <FeltButton className="mt-auto min-h-14 w-full" onClick={() => router.push("/")}>
        Done
      </FeltButton>
    </div>
  );
}
