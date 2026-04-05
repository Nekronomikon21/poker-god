"use client";

import { useState } from "react";
import type { Card, Rank, Suit } from "@/lib/poker";
import { preflopEquity } from "@/lib/poker";
import { useI18n } from "@/i18n/dictionary-context";
import PageNav from "@/components/page-nav";
import { useAuthWall } from "@/components/auth-wall";

const RANKS: Rank[] = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
const DISPLAY_RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
const SUITS: Suit[] = ["♠","♥","♦","♣"];

const SUIT_COLOR: Record<Suit, string> = {
  "♠": "text-zinc-900 dark:text-zinc-100",
  "♣": "text-zinc-900 dark:text-zinc-100",
  "♥": "text-red-600",
  "♦": "text-red-600",
};

function cardLabel(c: Card) {
  const r = c.rank === "10" ? "T" : c.rank;
  return `${r}${c.suit}`;
}

export default function Calculator() {
  const { dict } = useI18n();
  const t = (dict.calculator ?? {}) as Record<string, string>;
  const { requireAuth } = useAuthWall();

  const [hand1, setHand1] = useState<[Card | null, Card | null]>([null, null]);
  const [hand2, setHand2] = useState<[Card | null, Card | null]>([null, null]);
  const [selecting, setSelecting] = useState<{ hand: 1 | 2; slot: 0 | 1 } | null>(null);
  const [result, setResult] = useState<{ hand1: number; hand2: number; tie: number } | null>(null);
  const [computing, setComputing] = useState(false);

  const selectedCards = new Set(
    [hand1[0], hand1[1], hand2[0], hand2[1]]
      .filter(Boolean)
      .map((c) => c!.rank + c!.suit)
  );

  const pickCard = (rank: Rank, suit: Suit) => {
    if (!selecting) return;
    const card: Card = { rank, suit };
    if (selecting.hand === 1) {
      const next: [Card | null, Card | null] = [...hand1];
      next[selecting.slot] = card;
      setHand1(next);
    } else {
      const next: [Card | null, Card | null] = [...hand2];
      next[selecting.slot] = card;
      setHand2(next);
    }
    setSelecting(null);
    setResult(null);
  };

  const clearAll = () => {
    setHand1([null, null]);
    setHand2([null, null]);
    setSelecting(null);
    setResult(null);
  };

  const canCalculate = hand1[0] && hand1[1] && hand2[0] && hand2[1];

  const calculate = () => {
    if (!canCalculate) return;
    setComputing(true);
    setTimeout(() => {
      const res = preflopEquity(
        [hand1[0]!, hand1[1]!],
        [hand2[0]!, hand2[1]!],
        15000
      );
      setResult(res);
      setComputing(false);
    }, 10);
  };

  const renderSlot = (hand: 1 | 2, slot: 0 | 1, card: Card | null) => {
    const isActive = selecting?.hand === hand && selecting?.slot === slot;
    return (
      <button
        onClick={() => setSelecting({ hand, slot })}
        className={`w-14 h-20 rounded border-2 flex items-center justify-center text-lg font-bold transition-all ${
          isActive
            ? "border-emerald-400 bg-emerald-900/30"
            : card
              ? "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
              : "border-dashed border-zinc-400 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-900"
        }`}
      >
        {card ? (
          <span className={SUIT_COLOR[card.suit]}>{cardLabel(card)}</span>
        ) : (
          <span className="text-zinc-400 text-sm">?</span>
        )}
      </button>
    );
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t.title ?? "Preflop Calculator"}
      </h1>
      <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {t.intro ?? "Select two starting hands and calculate their heads-up win probability."}
      </p>

      {/* Hands */}
      <div className="mt-8 flex flex-wrap items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-semibold text-emerald-500">{t.hand1 ?? "Hand 1"}</span>
          <div className="flex gap-2">
            {renderSlot(1, 0, hand1[0])}
            {renderSlot(1, 1, hand1[1])}
          </div>
        </div>
        <span className="text-2xl font-bold text-zinc-400">vs</span>
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-semibold text-red-400">{t.hand2 ?? "Hand 2"}</span>
          <div className="flex gap-2">
            {renderSlot(2, 0, hand2[0])}
            {renderSlot(2, 1, hand2[1])}
          </div>
        </div>
      </div>

      {/* Card picker */}
      {selecting && (
        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 bg-white dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 mb-3">
            {t.pickCard ?? "Pick a card:"}
          </p>
          <div className="grid grid-cols-13 gap-0.5" style={{ gridTemplateColumns: "repeat(13, 1fr)" }}>
            {SUITS.map((suit) =>
              RANKS.map((rank, ri) => {
                const key = rank + suit;
                const disabled = selectedCards.has(key);
                return (
                  <button
                    key={key}
                    disabled={disabled}
                    onClick={() => pickCard(rank, suit)}
                    className={`h-9 rounded text-[11px] font-semibold transition-all border ${
                      disabled
                        ? "opacity-20 cursor-not-allowed border-transparent bg-zinc-200 dark:bg-zinc-800"
                        : `border-zinc-300 dark:border-zinc-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${SUIT_COLOR[suit]}`
                    }`}
                  >
                    {DISPLAY_RANKS[ri]}{suit}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => requireAuth(calculate)}
          disabled={!canCalculate || computing}
          className="rounded bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-3 text-sm font-bold text-white shadow-sm transition-all hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-40"
        >
          {computing ? (t.computing ?? "Computing...") : (t.calculate ?? "Calculate")}
        </button>
        <button
          onClick={clearAll}
          className="rounded bg-zinc-200 dark:bg-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200 transition-all hover:bg-zinc-300 dark:hover:bg-zinc-600"
        >
          {t.clear ?? "Clear"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="mt-8 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-6">
            <div className="flex-1 text-center">
              <div className="text-sm text-zinc-500">{t.hand1 ?? "Hand 1"}</div>
              <div className="mt-1 text-3xl font-bold text-emerald-500">{result.hand1}%</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-sm text-zinc-500">{t.tieLabel ?? "Tie"}</div>
              <div className="mt-1 text-3xl font-bold text-zinc-400">{result.tie}%</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-sm text-zinc-500">{t.hand2 ?? "Hand 2"}</div>
              <div className="mt-1 text-3xl font-bold text-red-400">{result.hand2}%</div>
            </div>
          </div>
          {/* Equity bar */}
          <div className="mt-4 flex h-4 rounded-full overflow-hidden">
            <div className="bg-emerald-500" style={{ width: `${result.hand1}%` }} />
            <div className="bg-zinc-400" style={{ width: `${result.tie}%` }} />
            <div className="bg-red-400" style={{ width: `${result.hand2}%` }} />
          </div>
        </div>
      )}
      <PageNav />
    </main>
  );
}
