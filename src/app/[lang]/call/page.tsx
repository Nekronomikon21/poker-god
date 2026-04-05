"use client";

import { useState, useCallback } from "react";
import type { Card } from "@/lib/poker";
import { generateCallScenario } from "@/lib/poker";
import type { CallScenario } from "@/lib/poker";
import { useI18n } from "@/i18n/dictionary-context";
import PageNav from "@/components/page-nav";
import { useAuthWall } from "@/components/auth-wall";

/* ---- Mini card (static, no animation) ---- */

function MiniCard({ card }: { card: Card }) {
  const isRed = card.suit === "♥" || card.suit === "♦";
  return (
    <div className="relative h-[88px] w-[62px] rounded border border-zinc-300 bg-white shadow-md shadow-black/30">
      <div className="absolute left-1 top-1 flex flex-col items-center leading-none">
        <span className={`text-[14px] font-bold ${isRed ? "text-red-600" : "text-zinc-900"}`}>{card.rank}</span>
        <span className={`text-[12px] ${isRed ? "text-red-600" : "text-zinc-900"}`}>{card.suit}</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-[26px] ${isRed ? "text-red-600" : "text-zinc-900"}`}>{card.suit}</span>
      </div>
      <div className="absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180">
        <span className={`text-[14px] font-bold ${isRed ? "text-red-600" : "text-zinc-900"}`}>{card.rank}</span>
        <span className={`text-[12px] ${isRed ? "text-red-600" : "text-zinc-900"}`}>{card.suit}</span>
      </div>
    </div>
  );
}

function EmptySlot() {
  return <div className="h-[88px] w-[62px] rounded border border-dashed border-white/10" />;
}

export default function CallOrNot() {
  const { dict } = useI18n();
  const t = (dict.call ?? {}) as Record<string, string>;
  const { requireAuth } = useAuthWall();

  const [scenario, setScenario] = useState<CallScenario | null>(null);
  const [answer, setAnswer] = useState<"call" | "fold" | null>(null);
  const [computing, setComputing] = useState(false);
  const [level, setLevel] = useState(5);

  const newScenario = useCallback(() => {
    setComputing(true);
    setAnswer(null);
    setTimeout(() => {
      setScenario(generateCallScenario(level));
      setComputing(false);
    }, 10);
  }, [level]);

  const communitySlots = scenario
    ? Array.from({ length: 5 }, (_, i) => scenario.community[i] ?? null)
    : [];

  const answered = answer !== null && scenario !== null;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t.title ?? "To Call or Not to Call"}
      </h1>
      <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {t.intro ?? "You're facing a bet. Should you call or fold? Make your decision, then see the math."}
      </p>

      {!scenario ? (
        <div className="mt-8 flex flex-col items-start gap-6">
          {/* Difficulty selector */}
          <div className="w-full max-w-xs">
            <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              {t.difficultyLabel ?? "Difficulty"}: <span className="text-zinc-900 dark:text-zinc-100">{level}/10</span>
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] text-zinc-500">{t.diffEasyShort ?? "Easy"}</span>
              <input type="range" min={1} max={10} value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="flex-1 accent-emerald-500" />
              <span className="text-[10px] text-zinc-500">{t.diffExpertShort ?? "Expert"}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {level <= 2
                ? (t.diff1 ?? "Very easy — obvious decisions, large equity gaps")
                : level <= 4
                  ? (t.diff2 ?? "Easy — clear-cut situations, simple bet sizes")
                  : level <= 6
                    ? (t.diff3 ?? "Medium — requires pot odds calculation")
                    : level <= 8
                      ? (t.diff4 ?? "Hard — thin margins, non-standard bet sizes")
                      : (t.diff5 ?? "Expert — razor-thin edges, deceptive pot geometry, hard to estimate equity")}
            </p>
          </div>
          <button
            onClick={() => requireAuth(newScenario)}
            disabled={computing}
            className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700 px-16 py-5 text-lg font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-900/40 transition-all hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-50"
          >
            {computing ? (t.generating ?? "Generating...") : (t.start ?? "Start")}
          </button>
        </div>
      ) : (
        <div className="mt-8">
          {/* Table */}
          <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: 420 }}>
            {/* Felt background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#3d2b1a] via-[#5c3d1e] to-[#3d2b1a]" />
            <div className="absolute inset-[8px] rounded-2xl bg-gradient-to-b from-[#1a6b3c] via-[#1b7a42] to-[#156332] shadow-[inset_0_2px_30px_rgba(0,0,0,0.4)]" />
            <div className="absolute inset-[8px] rounded-2xl opacity-30 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />

            {/* Opponent bet indicator */}
            <div className="absolute left-1/2 top-[10%] -translate-x-1/2 z-10 flex flex-col items-center">
              <div className="rounded bg-red-600/80 border border-red-500 px-4 py-2 text-white font-bold text-sm">
                {t.opponentBets ?? "Opponent bets"}: {scenario.betToCall}
              </div>
            </div>

            {/* Community cards */}
            <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
              {communitySlots.map((card, i) =>
                card ? <MiniCard key={i} card={card} /> : <EmptySlot key={i} />
              )}
            </div>

            {/* Pot */}
            <div className="absolute left-1/2 top-[46%] -translate-x-1/2 z-10 flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wider text-white/50">{t.pot ?? "Pot"}</span>
              <span className="text-lg font-bold text-yellow-300">{scenario.pot}</span>
            </div>

            {/* Stage badge */}
            <div className="absolute right-6 top-[10%] z-10">
              <span className="rounded bg-black/40 border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-200 uppercase">
                {scenario.stage}
              </span>
            </div>

            {/* Player hand */}
            <div className="absolute left-1/2 bottom-[5%] -translate-x-1/2 flex items-center gap-2 z-10">
              <div className="flex gap-1.5">
                {scenario.playerHand.map((c, i) => (
                  <MiniCard key={i} card={c} />
                ))}
              </div>
            </div>
          </div>

          {/* Decision buttons or result */}
          {!answered ? (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => setAnswer("fold")}
                className="rounded bg-gradient-to-b from-red-500 to-red-700 px-10 py-4 text-lg font-bold text-white shadow-sm transition-all hover:from-red-400 hover:to-red-600"
              >
                {t.foldBtn ?? "Fold"}
              </button>
              <button
                onClick={() => setAnswer("call")}
                className="rounded bg-gradient-to-b from-emerald-500 to-emerald-700 px-10 py-4 text-lg font-bold text-white shadow-sm transition-all hover:from-emerald-400 hover:to-emerald-600"
              >
                {t.callBtn ?? "Call"}
              </button>
              <button
                onClick={newScenario}
                disabled={computing}
                className="rounded bg-zinc-200 dark:bg-zinc-700 px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-300 transition-all hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50"
              >
                {t.skip ?? "Skip"}
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {/* Your answer */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-5 bg-white dark:bg-zinc-900">
                <p className="text-sm text-zinc-500">
                  {t.yourAnswer ?? "Your answer"}: <span className="font-bold text-zinc-900 dark:text-zinc-100">{answer === "call" ? (t.callBtn ?? "Call") : (t.foldBtn ?? "Fold")}</span>
                </p>
              </div>

              {/* Math analysis */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-5 bg-white dark:bg-zinc-900">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{t.mathTitle ?? "Mathematical analysis"}</h3>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-zinc-500 uppercase">{t.yourEquity ?? "Your equity"}</span>
                    <div className="text-2xl font-bold text-emerald-500">{scenario.equity}%</div>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 uppercase">{t.potOddsLabel ?? "Pot odds needed"}</span>
                    <div className="text-2xl font-bold text-amber-500">{scenario.potOdds}%</div>
                  </div>
                </div>
                <div className="mt-3 flex h-3 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                  <div className="bg-emerald-500" style={{ width: `${scenario.equity}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
                  <span>0%</span>
                  <span className="text-amber-500 font-bold">{t.needLabel ?? "Need"}: {scenario.potOdds}%</span>
                  <span>100%</span>
                </div>

                <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {(t.explanation ?? "You need {potOdds}% equity to break even on a call. You have {equity}% equity.")
                    .replace("{potOdds}", String(scenario.potOdds))
                    .replace("{equity}", String(scenario.equity))}
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {scenario.isCallCorrect ? (
                    <span className="text-emerald-500">{t.mathCall ?? "Mathematically, calling is correct (+EV)."}</span>
                  ) : (
                    <span className="text-red-400">{t.mathFold ?? "Mathematically, folding is correct (-EV)."}</span>
                  )}
                </p>

                {/* Did you get it right? */}
                {((answer === "call" && scenario.isCallCorrect) || (answer === "fold" && !scenario.isCallCorrect)) ? (
                  <div className="mt-3 rounded bg-emerald-500/10 border border-emerald-500/30 px-4 py-2">
                    <span className="text-sm font-bold text-emerald-400">{t.correct ?? "Correct!"}</span>
                  </div>
                ) : (
                  <div className="mt-3 rounded bg-red-500/10 border border-red-500/30 px-4 py-2">
                    <span className="text-sm font-bold text-red-400">{t.incorrect ?? "Incorrect."}</span>
                  </div>
                )}
              </div>

              {/* Practical analysis */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-5 bg-white dark:bg-zinc-900">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{t.practicalTitle ?? "Practical considerations"}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {(() => {
                    const diff = scenario.equity - scenario.potOdds;
                    if (diff > 20) return t.practStrong ?? "This is a very strong call. Your equity significantly exceeds the pot odds. In practice, you should call (or even raise) in this spot almost always.";
                    if (diff > 5) return t.practGood ?? "This is a solid call. Your equity comfortably exceeds pot odds. In a real game, calling here is standard play.";
                    if (diff > -5) return t.practMarginal ?? "This is a marginal spot. The math is very close to break-even. In practice, other factors matter: your opponent's tendencies, your position, stack sizes, and whether you have implied odds on future streets. Experienced players might go either way.";
                    if (diff > -15) return t.practBad ?? "The math says fold, but it's not a huge mistake to call. In practice, if you have strong implied odds (opponent likely to pay you off on later streets) or your opponent over-bluffs, a call could still be reasonable.";
                    return t.practTerrible ?? "This is a clear fold. Your equity is well below what you need. Calling here consistently will lose you chips in the long run. Save your stack for better spots.";
                  })()}
                </p>
              </div>

              {/* Next button */}
              <button
                onClick={newScenario}
                disabled={computing}
                className="rounded bg-gradient-to-b from-emerald-500 to-emerald-700 px-10 py-3 text-sm font-bold text-white shadow-sm transition-all hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-50"
              >
                {computing ? (t.generating ?? "Generating...") : (t.next ?? "Next scenario")}
              </button>
            </div>
          )}
        </div>
      )}
      <PageNav />
    </main>
  );
}
