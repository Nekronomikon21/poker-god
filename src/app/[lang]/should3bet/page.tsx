"use client";

import { useState, useCallback } from "react";
import type { Card } from "@/lib/poker";
import { generateShould3BetScenario } from "@/lib/poker";
import type { Should3BetScenario } from "@/lib/poker";
import { useI18n } from "@/i18n/dictionary-context";
import PageNav from "@/components/page-nav";
import { useAuthWall } from "@/components/auth-wall";

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

export default function Should3Bet() {
  const { dict } = useI18n();
  const t = (dict.should3bet ?? {}) as Record<string, string>;
  const { requireAuth } = useAuthWall();

  const [scenario, setScenario] = useState<Should3BetScenario | null>(null);
  const [answer, setAnswer] = useState<"3bet" | "call" | "fold" | null>(null);
  const [computing, setComputing] = useState(false);
  const [level, setLevel] = useState(5);
  const [posMode, setPosMode] = useState<"oop" | "ip" | "mixed">("mixed");

  const newScenario = useCallback(() => {
    setComputing(true);
    setAnswer(null);
    setTimeout(() => {
      setScenario(generateShould3BetScenario(level, posMode));
      setComputing(false);
    }, 10);
  }, [level, posMode]);

  const answered = answer !== null && scenario !== null;
  const isCorrect = answered && answer === scenario.correctAnswer;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t.title ?? "Should I 3-Bet?"}
      </h1>
      <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {t.intro ?? "Your opponent opens with a raise preflop. Should you 3-bet, call, or fold?"}
      </p>

      {!scenario ? (
        <div className="mt-8 flex flex-col items-start gap-6">
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
                ? (t.diff1 ?? "Very easy — obvious decisions")
                : level <= 4
                  ? (t.diff2 ?? "Easy — clear-cut situations")
                  : level <= 6
                    ? (t.diff3 ?? "Medium — requires calculation")
                    : level <= 8
                      ? (t.diff4 ?? "Hard — thin margins")
                      : (t.diff5 ?? "Expert — deceptive sizing, razor-thin edges")}
            </p>
          </div>
          {/* Position mode */}
          <div className="w-full max-w-xs">
            <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              {t.positionLabel ?? "Position"}
            </span>
            <div className="mt-1 flex gap-2">
              {(["oop", "ip", "mixed"] as const).map((m) => (
                <button key={m} onClick={() => setPosMode(m)}
                  className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold border transition-all ${posMode === m ? "bg-emerald-600 border-emerald-500 text-white" : "bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700"}`}
                >
                  {m === "oop" ? (t.oop ?? "Out of Position") : m === "ip" ? (t.ip ?? "In Position") : (t.mixed ?? "Mixed")}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => requireAuth(newScenario)} disabled={computing}
            className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700 px-16 py-5 text-lg font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-900/40 transition-all hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-50"
          >
            {computing ? (t.generating ?? "Generating...") : (t.start ?? "Start")}
          </button>
        </div>
      ) : (
        <div className="mt-8">
          {/* Table */}
          <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: 340 }}>
            <div className="absolute inset-0 bg-gradient-to-b from-[#3d2b1a] via-[#5c3d1e] to-[#3d2b1a]" />
            <div className="absolute inset-[8px] rounded-2xl bg-gradient-to-b from-[#1a6b3c] via-[#1b7a42] to-[#156332] shadow-[inset_0_2px_30px_rgba(0,0,0,0.4)]" />
            <div className="absolute inset-[8px] rounded-2xl opacity-30 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />

            <div className="absolute right-6 top-[8%] z-10 flex gap-2">
              <span className="rounded bg-black/40 border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-200 uppercase">Preflop</span>
              <span className={`rounded px-3 py-1 text-xs font-semibold uppercase ${scenario.position === "ip" ? "bg-emerald-600/60 border border-emerald-500/40 text-emerald-200" : "bg-red-600/60 border border-red-500/40 text-red-200"}`}>
                {scenario.position === "ip" ? (t.ip ?? "In Position") : (t.oop ?? "Out of Position")}
              </span>
            </div>

            {/* Opponent open */}
            <div className="absolute left-1/2 top-[12%] -translate-x-1/2 z-10 flex flex-col items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-[72px] w-[50px] rounded border border-white/10 bg-gradient-to-br from-[#1a3a6c] to-[#0f2244] shadow-md flex items-center justify-center">
                  <span className="text-yellow-400/60 text-[8px] font-bold">PG</span>
                </div>
                <div className="h-[72px] w-[50px] rounded border border-white/10 bg-gradient-to-br from-[#1a3a6c] to-[#0f2244] shadow-md flex items-center justify-center">
                  <span className="text-yellow-400/60 text-[8px] font-bold">PG</span>
                </div>
              </div>
              <div className="rounded bg-amber-600/80 border border-amber-500 px-3 py-1.5 text-white font-bold text-sm">
                {t.opponentOpens ?? "Opponent opens"}: {scenario.opponentOpen}
              </div>
            </div>

            {/* Pot */}
            <div className="absolute left-1/2 top-[46%] -translate-x-1/2 z-10 flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wider text-white/50">{t.pot ?? "Pot"}</span>
              <span className="text-lg font-bold text-yellow-300">{scenario.pot}</span>
            </div>

            {/* Player hand */}
            <div className="absolute left-1/2 bottom-[5%] -translate-x-1/2 flex gap-1.5 z-10">
              {scenario.playerHand.map((c, i) => <MiniCard key={i} card={c} />)}
            </div>
          </div>

          {/* Decision or result */}
          {!answered ? (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button onClick={() => setAnswer("fold")}
                className="rounded bg-gradient-to-b from-red-500 to-red-700 px-8 py-4 text-lg font-bold text-white shadow-sm transition-all hover:from-red-400 hover:to-red-600"
              >{t.foldBtn ?? "Fold"}</button>
              <button onClick={() => setAnswer("call")}
                className="rounded bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-4 text-lg font-bold text-white shadow-sm transition-all hover:from-emerald-400 hover:to-emerald-600"
              >{t.callBtn ?? "Call"}</button>
              <button onClick={() => setAnswer("3bet")}
                className="rounded bg-gradient-to-b from-amber-500 to-amber-700 px-8 py-4 text-lg font-bold text-white shadow-sm transition-all hover:from-amber-400 hover:to-amber-600"
              >{t.threeBetBtn ?? "3-Bet"}</button>
              <button onClick={newScenario} disabled={computing}
                className="rounded bg-zinc-200 dark:bg-zinc-700 px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-300 transition-all hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50"
              >{t.skip ?? "Skip"}</button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-5 bg-white dark:bg-zinc-900">
                <p className="text-sm text-zinc-500">
                  {t.yourAnswer ?? "Your answer"}: <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {answer === "3bet" ? (t.threeBetBtn ?? "3-Bet") : answer === "call" ? (t.callBtn ?? "Call") : (t.foldBtn ?? "Fold")}
                  </span>
                </p>
              </div>

              {/* Math */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-5 bg-white dark:bg-zinc-900">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{t.mathTitle ?? "Mathematical analysis"}</h3>
                <div className="mt-3">
                  <span className="text-xs text-zinc-500 uppercase">{t.yourEquity ?? "Your equity vs open range"}</span>
                  <div className="text-2xl font-bold text-emerald-500">{scenario.equity}%</div>
                </div>
                <div className="mt-3 flex h-3 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                  <div className="bg-emerald-500" style={{ width: `${scenario.equity}%` }} />
                </div>
                {/* Threshold markers */}
                <div className="mt-1 relative h-4 text-[9px]">
                  <span className="absolute text-zinc-500" style={{ left: "0%" }}>0%</span>
                  <span className="absolute text-red-400 font-bold -translate-x-1/2" style={{ left: `${scenario.callThreshold}%` }}>{t.callLine ?? "Call"} {scenario.callThreshold}%</span>
                  <span className="absolute text-amber-400 font-bold -translate-x-1/2" style={{ left: `${scenario.threeBetThreshold}%` }}>{t.threeBetLine ?? "3-Bet"} {scenario.threeBetThreshold}%</span>
                  <span className="absolute right-0 text-zinc-500">100%</span>
                </div>

                <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {(t.explanation ?? "With {equity}% equity vs the open range: above {threeBet}% → 3-bet, {call}%–{threeBet}% → call, below {call}% → fold.")
                    .replace("{equity}", String(scenario.equity))
                    .replace("{threeBet}", String(scenario.threeBetThreshold))
                    .replaceAll("{threeBet}", String(scenario.threeBetThreshold))
                    .replaceAll("{call}", String(scenario.callThreshold))}
                </p>

                <p className="mt-2 text-sm font-semibold">
                  {t.correctIs ?? "Correct answer"}: <span className={scenario.correctAnswer === "3bet" ? "text-amber-400" : scenario.correctAnswer === "call" ? "text-emerald-400" : "text-red-400"}>
                    {scenario.correctAnswer === "3bet" ? (t.threeBetBtn ?? "3-Bet") : scenario.correctAnswer === "call" ? (t.callBtn ?? "Call") : (t.foldBtn ?? "Fold")}
                  </span>
                </p>

                {isCorrect ? (
                  <div className="mt-3 rounded bg-emerald-500/10 border border-emerald-500/30 px-4 py-2">
                    <span className="text-sm font-bold text-emerald-400">{t.correct ?? "Correct!"}</span>
                  </div>
                ) : (
                  <div className="mt-3 rounded bg-red-500/10 border border-red-500/30 px-4 py-2">
                    <span className="text-sm font-bold text-red-400">{t.incorrect ?? "Incorrect."}</span>
                  </div>
                )}
              </div>

              {/* Practical */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-5 bg-white dark:bg-zinc-900">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{t.practicalTitle ?? "Practical considerations"}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {(() => {
                    if (scenario.correctAnswer === "3bet") return t.practThreeBet ?? "Your hand is strong enough to 3-bet for value. This puts pressure on the opener and builds a bigger pot when you're ahead. Premium pairs and strong broadways are ideal 3-bet hands.";
                    if (scenario.correctAnswer === "call") return t.practCall ?? "Your hand is good enough to continue but not strong enough to 3-bet for value. Calling keeps the pot small and lets you see a flop. Suited connectors and medium pairs often fall in this category.";
                    return t.practFold ?? "Your hand doesn't have enough equity against a typical open-raise range. Folding saves chips for better spots. Weak offsuit hands and low cards should usually be folded here.";
                  })()}
                </p>
              </div>

              <button onClick={newScenario} disabled={computing}
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
