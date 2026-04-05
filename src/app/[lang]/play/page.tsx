"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Card, GameState, MessageDescriptor } from "@/lib/poker";
import {
  newGame,
  playerFold,
  playerCall,
  playerRaise,
  playerCheck,
  getPlayerHandInfo,
  getMinRaise,
  getBotHandInfo,
  calculateEquity,
  calculateOuts,
  calculateConditionalOuts,
  calculateBlindEquity,
} from "@/lib/poker";
import { useI18n } from "@/i18n/dictionary-context";
import { useAuthWall } from "@/components/auth-wall";

const DEFAULT_BB = 20;

function formatMessage(
  pokerDict: Record<string, unknown>,
  msg: MessageDescriptor
): string {
  const handNames = pokerDict.handNames as Record<string, string>;
  let template = (pokerDict[msg.key] as string) ?? msg.key;
  if (msg.params) {
    for (const [k, v] of Object.entries(msg.params)) {
      const resolved = handNames[v as string] ?? String(v);
      template = template.replace(`{${k}}`, resolved);
    }
  }
  return template;
}

/* ---- Animated wrapper ---- */

function AnimatedCard({ delay = 0, instant = false, children }: { delay?: number; instant?: boolean; children: React.ReactNode }) {
  const [visible, setVisible] = useState(instant);
  const delayRef = useRef(delay);
  useEffect(() => {
    if (instant) { setVisible(true); return; }
    const timer = setTimeout(() => setVisible(true), delayRef.current * 1000);
    return () => clearTimeout(timer);
  }, [instant]);

  return (
    <div
      className={instant ? "" : "transition-all duration-500 ease-out"}
      style={instant ? undefined : {
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(-20px) scale(0.8)",
      }}
    >
      {children}
    </div>
  );
}

/* ---- Card component ---- */

function CardView({ card, hidden = false, delay = 0, instant = false }: { card: Card; hidden?: boolean; delay?: number; instant?: boolean }) {
  const [showFace, setShowFace] = useState(instant && !hidden);
  const mountHiddenRef = useRef(hidden);
  const mountDelayRef = useRef(delay);

  // Handle instant skip and normal flip timing in a single effect
  useEffect(() => {
    if (instant) {
      setShowFace(!hidden);
      return;
    }
    if (mountHiddenRef.current) return;
    const flipTime = (mountDelayRef.current + 0.5) * 1000 + 100;
    const timer = setTimeout(() => setShowFace(true), flipTime);
    return () => clearTimeout(timer);
  }, [instant]);

  // Bot cards: flip when hidden changes to false (showdown)
  useEffect(() => {
    if (instant) {
      setShowFace(!hidden);
      return;
    }
    if (!hidden && mountHiddenRef.current) {
      mountHiddenRef.current = false;
      const timer = setTimeout(() => setShowFace(true), 300);
      return () => clearTimeout(timer);
    }
  }, [hidden, instant]);

  const isRed = card.suit === "♥" || card.suit === "♦";

  return (
    <AnimatedCard delay={delay} instant={instant}>
      <div className="h-[88px] w-[62px]" style={{ perspective: "600px" }}>
        <div
          className={`relative h-full w-full ${instant ? "" : "transition-transform duration-500 ease-out"}`}
          style={{
            transformStyle: "preserve-3d",
            transform: showFace ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Back face */}
          <div
            className="absolute inset-0 rounded border border-white/10 bg-gradient-to-br from-[#1a3a6c] to-[#0f2244] shadow-md shadow-black/40"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="absolute inset-[4px] rounded-sm border border-white/5 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.03)_4px,rgba(255,255,255,0.03)_8px)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border border-yellow-400/30 bg-yellow-400/10 flex items-center justify-center">
                <span className="text-yellow-400/60 text-[10px] font-bold">PG</span>
              </div>
            </div>
          </div>

          {/* Front face */}
          <div
            className="absolute inset-0 rounded border border-zinc-300 bg-white shadow-md shadow-black/30"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
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
        </div>
      </div>
    </AnimatedCard>
  );
}

/* ---- Chip stack display ---- */

function ChipStack({ amount, label }: { amount: number; label: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wider text-white/50">{label}</span>
      <span className="text-sm font-bold text-yellow-300">{amount}</span>
    </div>
  );
}

/* ---- Pot display ---- */

function PotDisplay({ amount, label }: { amount: number; label: string }) {
  if (amount === 0) return null;
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-wider text-white/50">{label}</span>
      <span className="text-base font-bold text-yellow-300">{amount}</span>
    </div>
  );
}

/* ---- Empty card slots ---- */

function EmptySlot() {
  return (
    <div className="h-[88px] w-[62px] rounded border border-dashed border-white/10" />
  );
}

/* ---- Main component ---- */

export default function Play() {
  const { dict } = useI18n();
  const t = dict.play;
  const pokerDict = dict.poker as Record<string, unknown>;
  const { requireAuth } = useAuthWall();

  const [game, setGameRaw] = useState<GameState | null>(null);
  const [raiseAmount, setRaiseAmount] = useState(DEFAULT_BB);
  const [showRaisePanel, setShowRaisePanel] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [botLevel, setBotLevel] = useState(5);
  const [startChips, setStartChips] = useState(1000);
  const [bigBlind, setBigBlind] = useState(20);
  const [replayShowBot, setReplayShowBot] = useState(false);
  const [skipAnim, setSkipAnim] = useState(false);
  const [showHandLabel, setShowHandLabel] = useState(false);
  const [showKO, setShowKO] = useState(false);
  const [showDefeat, setShowDefeat] = useState(false);
  const animEndRef = useRef(0);
  const prevCommunityCountRef = useRef(0);

  // History replay
  const historyRef = useRef<GameState[]>([]);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);

  const setGame = useCallback((g: GameState | null) => {
    if (g) {
      const prev = historyRef.current;
      const last = prev[prev.length - 1];
      const stageChanged = !last || last.stage !== g.stage;
      const isShowdown = g.gameOver && g.stage === "showdown" && !last?.gameOver;
      if (stageChanged || isShowdown) {
        historyRef.current = [...prev, { ...g }];
      } else if (g.gameOver && last && !last.gameOver) {
        // Fold on same stage — update last snapshot in-place instead of duplicating
        historyRef.current = [...prev.slice(0, -1), { ...g }];
      }
    } else {
      historyRef.current = [];
    }
    setReplayIndex(null);
    setSkipAnim(false);
    setGameRaw(g);
  }, []);

  // Try to perform an action; if animating, skip animation instead
  const act = useCallback((action: () => void) => {
    if (Date.now() < animEndRef.current) {
      setSkipAnim(true);
      setShowHandLabel(true);
      animEndRef.current = 0;
      setGameRaw((prev) => {
        if (!prev) return prev;
        if (prev.gameOver) setShowResult(true);
        if (prev.allInShowdown && !prev.showBotCards) {
          return { ...prev, showBotCards: true };
        }
        return prev;
      });
      return;
    }
    action();
  }, []);

  // The state to display: either replay snapshot or live game
  const displayGame = replayIndex !== null ? historyRef.current[replayIndex] : game;

  // Equity for each history stage (computed once when game ends)
  const stageEquities = useMemo(() => {
    if (!game?.gameOver || !showResult) return [];
    return historyRef.current.map((snap) => calculateEquity(snap));
  }, [game?.gameOver, showResult]);

  // Blind equity (bot cards unknown perspective)
  const blindEquities = useMemo(() => {
    if (!game?.gameOver || !showResult) return [];
    return historyRef.current.map((snap) => calculateBlindEquity(snap));
  }, [game?.gameOver, showResult]);

  // Precompute outs for all stages (cached)
  const stageOuts = useMemo(() => {
    if (!game?.gameOver || !showResult) return [];
    return historyRef.current.map((snap) => {
      if (snap.community.length < 3 || snap.community.length >= 5) return null;
      return calculateOuts(snap);
    });
  }, [game?.gameOver, showResult]);

  const stageConditionalOuts = useMemo(() => {
    if (!game?.gameOver || !showResult) return [];
    return historyRef.current.map((snap) => {
      if (snap.community.length < 3 || snap.community.length >= 5) return null;
      return calculateConditionalOuts(snap);
    });
  }, [game?.gameOver, showResult]);

  const isReplayMode = game?.gameOver && showResult;

  // K.O. animation on all-in win/loss
  useEffect(() => {
    if (!game || !showResult) return;
    if (game.allInShowdown && game.winner === "player") {
      setShowKO(true);
      const a1 = new Audio("/ko1.mp3");
      const a2 = new Audio("/ko2.mp3");
      a1.play().catch(() => {});
      a2.play().catch(() => {});
      const timer = setTimeout(() => setShowKO(false), 5000);
      return () => { clearTimeout(timer); a1.pause(); a2.pause(); };
    }
    if (game.allInShowdown && game.winner === "bot") {
      setShowDefeat(true);
      const a = new Audio("/bot-wins-allin.mp3");
      a.play().catch(() => {});
      const timer = setTimeout(() => setShowDefeat(false), 5000);
      return () => { clearTimeout(timer); a.pause(); };
    }
  }, [game, showResult]);

  // Keyboard arrows for replay navigation
  useEffect(() => {
    if (!game?.gameOver || !showResult) return;
    const onKey = (e: KeyboardEvent) => {
      const len = historyRef.current.length;
      if (!len) return;
      if (e.key === "ArrowLeft") {
        setReplayIndex((prev) => Math.max(0, (prev ?? len - 1) - 1));
      } else if (e.key === "ArrowRight") {
        setReplayIndex((prev) => {
          const i = prev ?? len - 1;
          return i < len - 1 ? i + 1 : null;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game?.gameOver, showResult]);

  useEffect(() => {
    if (!game) {
      prevCommunityCountRef.current = 0;
      animEndRef.current = 0;
      setShowResult(false);
      setShowHandLabel(false);
      return;
    }
    if (game.gameOver && game.stage === "showdown") {
      const newCards = game.community.length - prevCommunityCountRef.current;
      const communityDelay = newCards > 0 ? (newCards - 1) * 0.5 + 0.5 + 0.6 : 0;
      const botFlipDelay = 0.3 + 0.5;

      const timers: ReturnType<typeof setTimeout>[] = [];
      const prevCount = prevCommunityCountRef.current;
      if (game.allInShowdown && !game.showBotCards && newCards > 0) {
        const riverAppear = (4 - prevCount) * 0.5;
        const riverFullyVisible = riverAppear + 0.5 + 0.1;
        timers.push(setTimeout(() => {
          setGameRaw((prev) => prev && prev.allInShowdown && !prev.showBotCards
            ? { ...prev, showBotCards: true } : prev);
        }, riverFullyVisible * 1000));
      }

      const totalDelay = game.allInShowdown && newCards > 0
        ? (4 - prevCount) * 0.5 + 0.6 + botFlipDelay + 0.2
        : Math.max(communityDelay, botFlipDelay) + 0.2;
      animEndRef.current = Date.now() + totalDelay * 1000;
      setShowResult(false);
      setShowHandLabel(communityDelay === 0);
      if (communityDelay > 0) {
        timers.push(setTimeout(() => setShowHandLabel(true), communityDelay * 1000));
      }
      timers.push(setTimeout(() => setShowResult(true), totalDelay * 1000));
      return () => timers.forEach(clearTimeout);
    } else if (game.gameOver) {
      animEndRef.current = 0;
      setShowResult(true);
      setShowHandLabel(true);
    } else {
      const newCards = game.community.length - prevCommunityCountRef.current;
      const animMs = newCards > 0 ? ((newCards - 1) * 0.5 + 0.5 + 0.6) * 1000 : 800;
      animEndRef.current = Date.now() + animMs;
      setShowHandLabel(false);
      if (newCards > 0) {
        const handLabelDelay = (newCards - 1) * 0.5 + 0.5 + 0.6;
        const timer = setTimeout(() => setShowHandLabel(true), handLabelDelay * 1000);
        prevCommunityCountRef.current = game.community.length;
        setShowResult(false);
        return () => clearTimeout(timer);
      }
      prevCommunityCountRef.current = game.community.length;
      setShowResult(false);
      setShowHandLabel(true);
    }
  }, [game]);

  const startNewGame = useCallback(() => {
    historyRef.current = [];
    setReplayIndex(null);
    setReplayShowBot(false);
    const bb = game?.bigBlind ?? bigBlind;
    if (game) {
      setGame(newGame({ playerChips: game.playerChips, botChips: game.botChips, botLevel: game.botLevel, bigBlind: bb }));
    } else {
      setGame(newGame({ playerChips: startChips, botChips: startChips, botLevel, bigBlind }));
    }
    setRaiseAmount(bb);
    setShowRaisePanel(false);
  }, [game, botLevel, startChips, bigBlind]);

  const startFresh = useCallback(() => {
    historyRef.current = [];
    setReplayIndex(null);
    setReplayShowBot(false);
    setGame(newGame({ playerChips: startChips, botChips: startChips, botLevel, bigBlind }));
    setRaiseAmount(bigBlind);
    setShowRaisePanel(false);
  }, [botLevel, startChips, bigBlind]);

  /* ---- Start screen ---- */
  if (!game) {
    return (
      <main className={`flex flex-col items-center justify-center bg-[#0a0e17] px-6 py-16 overflow-hidden h-[calc(100vh-3.5rem)]`}>
        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-emerald-600/10 blur-3xl" />
          <h1 className="relative text-4xl font-bold tracking-tight text-white">
            {t.title}
          </h1>
        </div>
        <p className="mt-6 text-center text-lg text-zinc-400">
          {t.subtitle}
        </p>
        {/* Game settings */}
        <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-xs">
          {/* Difficulty */}
          <div className="w-full">
            <span className="text-sm font-semibold text-zinc-400">
              {t.difficulty}: <span className="text-white">{(t.levels as string[])[botLevel - 1]}</span>
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-zinc-500">1</span>
              <input type="range" min={1} max={10} value={botLevel}
                onChange={(e) => setBotLevel(Number(e.target.value))}
                className="flex-1 accent-emerald-500" />
              <span className="text-xs text-zinc-500">10</span>
            </div>
          </div>
          {/* Starting chips */}
          <div className="w-full">
            <span className="text-sm font-semibold text-zinc-400">{t.chips}</span>
            <div className="mt-1 flex items-center gap-2">
              {[500, 1000, 2000, 5000].map((v) => (
                <button key={v} onClick={() => setStartChips(v)}
                  className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold border transition-all ${startChips === v ? "bg-emerald-600 border-emerald-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"}`}
                >{v}</button>
              ))}
            </div>
          </div>
          {/* Blinds */}
          <div className="w-full">
            <span className="text-sm font-semibold text-zinc-400">{t.blindsLabel}: {Math.floor(bigBlind / 2)}/{bigBlind}</span>
            <div className="mt-1 flex items-center gap-2">
              {[10, 20, 50, 100].map((v) => (
                <button key={v} onClick={() => setBigBlind(v)}
                  className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold border transition-all ${bigBlind === v ? "bg-emerald-600 border-emerald-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"}`}
                >{Math.floor(v / 2)}/{v}</button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => requireAuth(() => startFresh())}
          className="mt-8 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700 px-16 py-5 text-lg font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-900/40 transition-all hover:from-emerald-400 hover:to-emerald-600 hover:shadow-emerald-800/50"
        >
          {t.startGame}
        </button>
      </main>
    );
  }

  const canCheck = game.botBet <= game.playerBet;
  const toCall = game.botBet - game.playerBet;
  const minRaise = getMinRaise(game);

  const dg = displayGame!;
  // Community card slots (always show 5 slots)
  const communitySlots = Array.from({ length: 5 }, (_, i) => dg.community[i] ?? null);

  return (
    <main className={`relative w-full overflow-hidden h-[calc(100vh-3.5rem)]`}>

      {/* ===== FULL-SCREEN TABLE ===== */}
      {/* Wood rim border — fills entire viewport behind nav */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#3d2b1a] via-[#5c3d1e] to-[#3d2b1a]" />

      {/* Inner felt — fills almost all space with a thin wood border */}
      <div className="absolute inset-[8px] rounded-2xl bg-gradient-to-b from-[#1a6b3c] via-[#1b7a42] to-[#156332] shadow-[inset_0_2px_30px_rgba(0,0,0,0.4)]" />

      {/* Felt texture overlay */}
      <div className="absolute inset-[8px] rounded-2xl opacity-30 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />

      {/* Table rail line */}
      <div className="absolute inset-[16px] rounded-2xl border border-white/[0.07]" />

      {/* ---- Bot seat (top) ---- */}
      <div className="absolute left-1/2 top-[2%] -translate-x-1/2 flex flex-col items-center z-10">
        {/* Avatar + chips + action */}
        <div className="mb-2 flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-b from-zinc-600 to-zinc-800 border-2 border-zinc-500 flex items-center justify-center shadow-lg">
            <span className="text-xs font-bold text-zinc-300">BOT</span>
          </div>
          <ChipStack amount={dg.botChips} label={t.botChips} />
          {dg.botAction && !(dg.stage === "showdown" && !showResult && replayIndex === null) && (
            <span className="rounded bg-black/50 border border-white/10 px-2 py-0.5 text-xs font-semibold text-zinc-200">
              {formatMessage(pokerDict, dg.botAction)}
            </span>
          )}
        </div>
        {/* Bot cards + hand name at showdown */}
        <div className="relative flex gap-1.5">
          {dg.botHand.map((c, i) => (
            <CardView key={`bot-${i}-${replayIndex ?? "live"}-${replayShowBot}`} card={c} hidden={isReplayMode ? !replayShowBot : !dg.showBotCards} delay={i * 0.15} instant={replayIndex !== null || skipAnim} />
          ))}
          {(isReplayMode && replayShowBot) && (() => {
            const fakeDg = { ...dg, showBotCards: true };
            const info = getBotHandInfo(fakeDg);
            if (!info) return null;
            const handNames = pokerDict.handNames as Record<string, string>;
            const name = handNames[info.nameKey] ?? info.nameKey;
            return (
              <span className="absolute -top-3 left-full ml-1 rounded bg-black/70 border border-red-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-red-300 whitespace-nowrap">
                {info.detail ? `${name} (${info.detail})` : name}
              </span>
            );
          })()}
        </div>
      </div>

      {/* ---- Community cards (strict center) ---- */}
      <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
        {communitySlots.map((card, i) => {
          if (!card) return <EmptySlot key={`empty-${i}-${replayIndex ?? "live"}`} />;
          if (replayIndex !== null) {
            return <CardView key={`comm-${i}-${replayIndex}`} card={card} delay={0} instant />;
          }
          const prevCount = prevCommunityCountRef.current;
          const isNew = i >= prevCount;
          return (
            <CardView key={`comm-${i}`} card={card} delay={isNew ? (i - prevCount) * 0.5 : 0} instant={skipAnim} />
          );
        })}
      </div>

      {/* ---- Pot (below community cards) ---- */}
      <div className="absolute left-1/2 top-[53%] -translate-x-1/2 z-10">
        <PotDisplay amount={dg.pot} label={t.pot} />
      </div>

      {/* ---- Player seat (bottom) ---- */}
      <div className="absolute left-1/2 bottom-[12%] -translate-x-1/2 flex flex-col items-center z-10">
        {/* Player cards + hand name pinned to top-right of last card */}
        <div className="relative flex gap-1.5">
          {dg.playerHand.map((c, i) => (
            <CardView key={`pl-${i}-${replayIndex ?? "live"}`} card={c} delay={i * 0.15} instant={replayIndex !== null || skipAnim} />
          ))}
          {(showHandLabel || replayIndex !== null) && (() => {
            const info = getPlayerHandInfo(dg);
            if (!info) return null;
            const handNames = pokerDict.handNames as Record<string, string>;
            const name = handNames[info.nameKey] ?? info.nameKey;
            return (
              <span className="absolute -top-3 left-full ml-1 rounded bg-black/70 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 whitespace-nowrap">
                {info.detail ? `${name} (${info.detail})` : name}
              </span>
            );
          })()}
        </div>
        {/* Avatar + chips + action */}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-700 border-2 border-emerald-400 flex items-center justify-center shadow-lg">
            <span className="text-xs font-bold text-white">YOU</span>
          </div>
          <ChipStack amount={dg.playerChips} label={t.yourChips} />
          {dg.playerAction && !(dg.stage === "showdown" && !showResult && replayIndex === null) && (
            <span className="rounded bg-black/50 border border-white/10 px-2 py-0.5 text-xs font-semibold text-zinc-200">
              {formatMessage(pokerDict, dg.playerAction)}
            </span>
          )}
        </div>
      </div>

      {/* ===== ACTION BUTTONS (overlaid at very bottom) ===== */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-3">
        {!game.gameOver && game.isPlayerTurn ? (
          <>
            {/* Left: Fold */}
            <button
              onClick={() => act(() => setGame(playerFold(game)))}
              className="rounded bg-gradient-to-b from-red-500 to-red-700 px-7 py-3 text-sm font-bold text-white shadow-sm shadow-red-900/50 transition-all hover:from-red-400 hover:to-red-600"
            >
              {t.fold}
            </button>
            {/* Center: Check / Call */}
            {canCheck ? (
              <button
                onClick={() => act(() => setGame(playerCheck(game)))}
                className="rounded bg-gradient-to-b from-emerald-500 to-emerald-700 px-7 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-900/50 transition-all hover:from-emerald-400 hover:to-emerald-600"
              >
                {t.check}
              </button>
            ) : (
              <button
                onClick={() => act(() => setGame(playerCall(game)))}
                className="rounded bg-gradient-to-b from-emerald-500 to-emerald-700 px-7 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-900/50 transition-all hover:from-emerald-400 hover:to-emerald-600"
              >
                {t.call} ({toCall})
              </button>
            )}
            {/* Right: Raise */}
            <div className="relative">
              <button
                onClick={() => act(() => setShowRaisePanel(!showRaisePanel))}
                className="rounded bg-gradient-to-b from-amber-500 to-amber-700 px-7 py-3 text-sm font-bold text-white shadow-sm shadow-amber-900/50 transition-all hover:from-amber-400 hover:to-amber-600"
              >
                {t.raise}
              </button>
              {showRaisePanel && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center gap-2 rounded bg-zinc-800 border border-zinc-600 p-3 shadow-xl">
                  {/* Standard raise presets + All-in */}
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    {[
                      { label: "1/3", fraction: 1 / 3 },
                      { label: "1/2", fraction: 0.5 },
                      { label: "2/3", fraction: 2 / 3 },
                      { label: "3/4", fraction: 0.75 },
                      { label: "Pot", fraction: 1 },
                    ].map(({ label, fraction }) => {
                      // Pot-size raise: after calling, raise fraction of (pot + call)
                      const potAfterCall = game.pot + toCall;
                      const raiseIncrement = Math.round(potAfterCall * fraction);
                      const presetAmount = Math.max(minRaise, raiseIncrement);
                      return (
                        <button
                          key={label}
                          onClick={() => setRaiseAmount(Math.min(game.playerChips, presetAmount))}
                          className="rounded bg-zinc-700 px-2 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-600 transition-colors whitespace-nowrap"
                        >
                          {label}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setRaiseAmount(game.playerChips)}
                      className="rounded bg-red-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-600 transition-colors whitespace-nowrap"
                    >
                      All-in
                    </button>
                  </div>
                  {/* Custom amount controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRaiseAmount((prev) => Math.max(minRaise, prev - minRaise))}
                      className="h-8 w-8 rounded bg-zinc-700 text-white font-bold hover:bg-zinc-600 text-sm"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={minRaise}
                      max={game.playerChips}
                      step={minRaise}
                      value={raiseAmount}
                      onChange={(e) =>
                        setRaiseAmount(Math.max(minRaise, Number(e.target.value)))
                      }
                      className="w-[80px] rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-yellow-300 font-semibold text-center focus:outline-none focus:border-yellow-500"
                    />
                    <button
                      onClick={() => setRaiseAmount((prev) => Math.min(game.playerChips, prev + minRaise))}
                      className="h-8 w-8 rounded bg-zinc-700 text-white font-bold hover:bg-zinc-600 text-sm"
                    >
                      +
                    </button>
                    <button
                      onClick={() => act(() => {
                        setGame(playerRaise(game, raiseAmount));
                        setShowRaisePanel(false);
                      })}
                      className="rounded bg-amber-600 px-4 py-1 text-sm font-bold text-white hover:bg-amber-500"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : game.gameOver && showResult ? (
          <div className="flex flex-col items-center gap-2">
            {/* Replay controls row */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReplayIndex((prev) => {
                  const i = prev ?? historyRef.current.length - 1;
                  return Math.max(0, i - 1);
                })}
                disabled={replayIndex === 0}
                className="rounded bg-zinc-700/80 px-3 py-2 text-sm font-bold text-white border border-zinc-600 transition-all hover:bg-zinc-600 disabled:opacity-30"
              >
                ◀
              </button>
              <span className="text-xs text-zinc-400 uppercase min-w-[60px] text-center">
                {dg.stage}
              </span>
              <button
                onClick={() => setReplayIndex((prev) => {
                  const i = prev ?? historyRef.current.length - 1;
                  return i < historyRef.current.length - 1 ? i + 1 : null;
                })}
                disabled={replayIndex === null}
                className="rounded bg-zinc-700/80 px-3 py-2 text-sm font-bold text-white border border-zinc-600 transition-all hover:bg-zinc-600 disabled:opacity-30"
              >
                ▶
              </button>
            </div>
            {/* Game buttons row */}
            <div className="flex items-center gap-2">
              <button
                onClick={startNewGame}
                disabled={game.playerChips === 0 || game.botChips === 0}
                className="rounded bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-900/50 transition-all hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t.nextHand}
              </button>
              <button
                onClick={startFresh}
                className="rounded bg-zinc-700/80 px-8 py-3 text-sm font-semibold text-white border border-zinc-600 transition-all hover:bg-zinc-600 hover:border-zinc-500"
              >
                {t.newGame}
              </button>
            </div>
          </div>
        ) : game.gameOver ? (
          <span className="text-sm text-zinc-500">{t.analysing ?? "Analysing..."}</span>
        ) : (
          <span className="text-sm text-zinc-500">{t.botThinking}</span>
        )}
      </div>

      {/* ===== ANALYSIS SIDE PANEL ===== */}
      {isReplayMode && (
        <div className="absolute top-[8px] right-[16px] bottom-[8px] w-[200px] z-30 rounded-r-2xl bg-black/60 backdrop-blur-sm border-l border-white/10 flex flex-col p-3 gap-3 overflow-y-auto">
          {/* Mode toggle */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setReplayShowBot(true)}
              className={`rounded px-2 py-1.5 text-xs font-semibold border transition-all ${replayShowBot ? "bg-amber-600 border-amber-500 text-white" : "bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700"}`}
            >
              {t.showBot}
            </button>
            <button
              onClick={() => setReplayShowBot(false)}
              className={`rounded px-2 py-1.5 text-xs font-semibold border transition-all ${!replayShowBot ? "bg-amber-600 border-amber-500 text-white" : "bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700"}`}
            >
              {t.hideBot}
            </button>
          </div>

          {/* Equity per stage (only when bot cards shown) */}
          {replayShowBot && stageEquities.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-white/50 mb-1">
                {t.winProbability ?? "Win %"}
              </span>
              {historyRef.current.map((snap, idx) => {
                if (snap.stage === "showdown") return null;
                const eq = stageEquities[idx];
                if (!eq) return null;
                const isCurrent = replayIndex === idx || (replayIndex === null && idx === historyRef.current.length - 1);
                return (
                  <button
                    key={idx}
                    onClick={() => setReplayIndex(idx < historyRef.current.length - 1 ? idx : null)}
                    className={`rounded px-2 py-1.5 text-left text-xs transition-all border ${isCurrent ? "bg-white/10 border-white/20" : "bg-transparent border-transparent hover:bg-white/5"}`}
                  >
                    <span className="uppercase text-zinc-400 text-[10px]">{snap.stage}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-emerald-400 font-bold">{eq.player}%</span>
                      <span className="text-zinc-500">—</span>
                      <span className="text-red-400 font-bold">{eq.bot}%</span>
                      {eq.tie > 0 && <span className="text-zinc-500 text-[10px]">({eq.tie}%)</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Blind equity (when bot cards hidden) */}
          {!replayShowBot && blindEquities.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-white/50 mb-1">
                {t.winProbability ?? "Win %"}
              </span>
              {historyRef.current.map((snap, idx) => {
                if (snap.stage === "showdown") return null;
                const eq = blindEquities[idx];
                if (!eq) return null;
                const isCurrent = replayIndex === idx || (replayIndex === null && idx === historyRef.current.length - 1);
                return (
                  <button
                    key={idx}
                    onClick={() => setReplayIndex(idx < historyRef.current.length - 1 ? idx : null)}
                    className={`rounded px-2 py-1.5 text-left text-xs transition-all border ${isCurrent ? "bg-white/10 border-white/20" : "bg-transparent border-transparent hover:bg-white/5"}`}
                  >
                    <span className="uppercase text-zinc-400 text-[10px]">{snap.stage}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-emerald-400 font-bold">{eq.player}%</span>
                      <span className="text-zinc-500">—</span>
                      <span className="text-red-400 font-bold">{eq.bot}%</span>
                      {eq.tie > 0 && <span className="text-zinc-500 text-[10px]">({eq.tie}%)</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Outs (only when bot cards shown and on flop/turn) */}
          {replayShowBot && (() => {
            const idx = replayIndex ?? historyRef.current.length - 1;
            const outs = stageOuts[idx];
            if (!outs || outs.length === 0) return null;
            return (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-white/50 mb-1">
                  Outs ({outs.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {outs.map((c) => {
                    const isRed = c.suit === "♥" || c.suit === "♦";
                    return (
                      <span key={c.rank + c.suit}
                        className={`text-[11px] font-bold ${isRed ? "text-red-400" : "text-white"}`}
                      >{c.rank}{c.suit}</span>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Conditional outs (when bot cards hidden, flop/turn) */}
          {!replayShowBot && (() => {
            const idx = replayIndex ?? historyRef.current.length - 1;
            const cOuts = stageConditionalOuts[idx];
            if (!cOuts || cOuts.length === 0) return null;
            return (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-white/50 mb-1">
                  {t.conditionalOuts ?? "Conditional outs"} ({cOuts.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {cOuts.map(({ card: c, winPct }) => {
                    const isRed = c.suit === "♥" || c.suit === "♦";
                    return (
                      <span key={c.rank + c.suit}
                        className={`text-[11px] font-bold ${isRed ? "text-red-400" : "text-white"}`}
                        title={`${winPct}%`}
                      >{c.rank}{c.suit}<sub className="text-[8px] text-zinc-500">{winPct}</sub></span>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ===== K.O. OVERLAY ===== */}
      {showKO && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative animate-ko-entrance">
            <div className="text-[120px] sm:text-[180px] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-red-500 to-red-800 drop-shadow-[0_0_40px_rgba(255,50,0,0.6)]"
              style={{ WebkitTextStroke: "3px rgba(255,200,0,0.5)" }}
            >
              K.O.
            </div>
          </div>
        </div>
      )}

      {/* ===== DEFEAT OVERLAY ===== */}
      {showDefeat && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative animate-ko-entrance">
            <div className="text-[80px] sm:text-[140px] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-zinc-300 via-zinc-500 to-zinc-800 drop-shadow-[0_0_40px_rgba(100,100,100,0.5)]"
              style={{ WebkitTextStroke: "3px rgba(150,150,150,0.4)" }}
            >
              DEFEAT
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
