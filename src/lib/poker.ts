// ---- Types ----

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"
  | "J" | "Q" | "K" | "A";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface MessageDescriptor {
  key: string;
  params?: Record<string, string | number>;
}

export type Stage = "preflop" | "flop" | "turn" | "river" | "showdown";

export interface GameState {
  deck: Card[];
  playerHand: Card[];
  botHand: Card[];
  community: Card[];
  pot: number;
  playerChips: number;
  botChips: number;
  playerBet: number;
  botBet: number;
  stage: Stage;
  message: MessageDescriptor;
  playerAction: MessageDescriptor | null;
  botAction: MessageDescriptor | null;
  isPlayerTurn: boolean;
  gameOver: boolean;
  winner: "player" | "bot" | "tie" | null;
  showBotCards: boolean;
  botLevel: number;
  allInShowdown: boolean;
  bigBlind: number;
  lastRaiseSize: number;
}

// ---- Deck ----

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function draw(deck: Card[], n: number): Card[] {
  return deck.splice(0, n);
}

// ---- Hand Evaluation ----

const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

// Hand name keys matching dictionary poker.handNames
type HandNameKey =
  | "royalFlush" | "straightFlush" | "fourOfAKind" | "fullHouse"
  | "flush" | "straight" | "threeOfAKind" | "twoPair" | "onePair" | "highCard";

interface HandResult {
  tier: number;
  ranks: number[];
  nameKey: HandNameKey;
}

function evaluateBest5(cards: Card[]): HandResult {
  const combos = combinations(cards, 5);
  let best: HandResult | null = null;
  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best || compareHands(result, best) > 0) {
      best = result;
    }
  }
  return best!;
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluate5(cards: Card[]): HandResult {
  const vals = cards.map((c) => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);
  const unique = [...new Set(vals)];

  let isStraight = false;
  let straightHigh = 0;
  if (unique.length === 5) {
    if (vals[0] - vals[4] === 4) {
      isStraight = true;
      straightHigh = vals[0];
    }
    if (vals[0] === 14 && vals[1] === 5 && vals[2] === 4 && vals[3] === 3 && vals[4] === 2) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  const counts: Record<number, number> = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([v, c]) => ({ val: Number(v), count: c }))
    .sort((a, b) => b.count - a.count || b.val - a.val);

  if (isFlush && isStraight) {
    if (straightHigh === 14) return { tier: 9, ranks: [14], nameKey: "royalFlush" };
    return { tier: 8, ranks: [straightHigh], nameKey: "straightFlush" };
  }
  if (groups[0].count === 4) {
    return { tier: 7, ranks: [groups[0].val, groups[1].val], nameKey: "fourOfAKind" };
  }
  if (groups[0].count === 3 && groups[1].count === 2) {
    return { tier: 6, ranks: [groups[0].val, groups[1].val], nameKey: "fullHouse" };
  }
  if (isFlush) {
    return { tier: 5, ranks: vals, nameKey: "flush" };
  }
  if (isStraight) {
    return { tier: 4, ranks: [straightHigh], nameKey: "straight" };
  }
  if (groups[0].count === 3) {
    const kickers = groups.slice(1).map((g) => g.val).sort((a, b) => b - a);
    return { tier: 3, ranks: [groups[0].val, ...kickers], nameKey: "threeOfAKind" };
  }
  if (groups[0].count === 2 && groups[1].count === 2) {
    const pairs = [groups[0].val, groups[1].val].sort((a, b) => b - a);
    const kicker = groups[2].val;
    return { tier: 2, ranks: [...pairs, kicker], nameKey: "twoPair" };
  }
  if (groups[0].count === 2) {
    const kickers = groups.slice(1).map((g) => g.val).sort((a, b) => b - a);
    return { tier: 1, ranks: [groups[0].val, ...kickers], nameKey: "onePair" };
  }
  return { tier: 0, ranks: vals, nameKey: "highCard" };
}

function compareHands(a: HandResult, b: HandResult): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  for (let i = 0; i < Math.min(a.ranks.length, b.ranks.length); i++) {
    if (a.ranks[i] !== b.ranks[i]) return a.ranks[i] - b.ranks[i];
  }
  return 0;
}

// ---- Game Logic ----

const STARTING_CHIPS = 1000;
const BIG_BLIND = 20;
const SMALL_BLIND = 10;

export interface GameConfig {
  playerChips?: number;
  botChips?: number;
  botLevel?: number;
  bigBlind?: number;
}

export function newGame(cfg?: GameConfig): GameState {
  const deck = createDeck();
  const playerHand = draw(deck, 2);
  const botHand = draw(deck, 2);

  const bb = cfg?.bigBlind ?? BIG_BLIND;
  const sbVal = Math.floor(bb / 2);
  const pChips = cfg?.playerChips ?? STARTING_CHIPS;
  const bChips = cfg?.botChips ?? STARTING_CHIPS;

  const sb = Math.min(sbVal, pChips);
  const bbActual = Math.min(bb, bChips);

  return {
    deck,
    playerHand,
    botHand,
    community: [],
    pot: sb + bbActual,
    playerChips: pChips - sb,
    botChips: bChips - bbActual,
    playerBet: sb,
    botBet: bbActual,
    stage: "preflop",
    message: { key: "blinds", params: { sb, bb: bbActual } },
    playerAction: { key: "actSB", params: { amount: sb } },
    botAction: { key: "actBB", params: { amount: bbActual } },
    isPlayerTurn: true,
    gameOver: false,
    winner: null,
    showBotCards: false,
    botLevel: cfg?.botLevel ?? 5,
    allInShowdown: false,
    bigBlind: bb,
    lastRaiseSize: bb,
  };
}

export function playerFold(state: GameState): GameState {
  return {
    ...state,
    botChips: state.botChips + state.pot,
    pot: 0,
    message: { key: "youFolded" },
    playerAction: { key: "actFold" },
    botAction: { key: "actWins" },
    gameOver: true,
    winner: "bot",
    showBotCards: true,
  };
}

export function playerCall(state: GameState): GameState {
  const toCall = state.botBet - state.playerBet;
  const actual = Math.min(toCall, state.playerChips);

  const next: GameState = {
    ...state,
    playerChips: state.playerChips - actual,
    pot: state.pot + actual,
    playerBet: state.playerBet + actual,
    playerAction: { key: "actCall", params: { amount: actual } },
    isPlayerTurn: false,
  };

  return checkAllInRunout(next) ?? advanceStage(next);
}

export function getMinRaise(state: GameState): number {
  // Minimum raise increment = the last raise size
  // But if player can't afford min raise + call, they can still go all-in
  return state.lastRaiseSize;
}

export function playerRaise(state: GameState, amount: number): GameState {
  const toCall = state.botBet - state.playerBet;
  const isAllIn = amount >= state.playerChips - toCall;

  // Enforce minimum raise unless it's an all-in (all-in below min raise is legal)
  const raiseSize = isAllIn ? Math.max(0, state.playerChips - toCall) : Math.max(amount, state.lastRaiseSize);
  const totalCost = toCall + raiseSize;
  const actual = Math.min(totalCost, state.playerChips);
  const effectiveRaise = actual - toCall;

  // Only update lastRaiseSize if raise is >= min raise (all-in below min doesn't reopen action)
  const newLastRaise = effectiveRaise >= state.lastRaiseSize
    ? effectiveRaise
    : state.lastRaiseSize;

  const next: GameState = {
    ...state,
    playerChips: state.playerChips - actual,
    pot: state.pot + actual,
    playerBet: state.playerBet + actual,
    playerAction: { key: "actRaise", params: { amount: effectiveRaise } },
    lastRaiseSize: newLastRaise,
    isPlayerTurn: false,
  };

  const botResponse = botAct(next);
  return checkAllInRunout(botResponse) ?? botResponse;
}

export function playerCheck(state: GameState): GameState {
  if (state.botBet > state.playerBet) {
    return { ...state, message: { key: "cannotCheck" } };
  }
  return botAct({ ...state, playerAction: { key: "actCheck" }, isPlayerTurn: false });
}

function botAct(state: GameState): GameState {
  const toCall = state.playerBet - state.botBet;
  const handStrength = botHandStrength(state);
  const lvl = state.botLevel; // 1–10

  // Level-scaled parameters:
  // foldThreshold: low levels fold weak hands less often (play loose), high levels fold precisely
  const foldThreshold = 0.1 + lvl * 0.04;        // 0.14 .. 0.50
  const foldChance = 0.2 + lvl * 0.06;            // 0.26 .. 0.80
  // raiseThreshold: high levels raise with slightly weaker hands (more aggressive)
  const raiseThreshold = 0.9 - lvl * 0.04;        // 0.86 .. 0.50
  const raiseChance = 0.1 + lvl * 0.06;           // 0.16 .. 0.70
  // betThreshold: high levels bet more aggressively
  const betThreshold = 0.8 - lvl * 0.04;          // 0.76 .. 0.40
  const betChance = 0.15 + lvl * 0.06;            // 0.21 .. 0.75
  // raiseSize: higher levels size their bets better
  const raiseMult = 1 + Math.floor(lvl / 3);      // 1..4 × BIG_BLIND

  if (toCall > 0 && handStrength < foldThreshold && Math.random() < foldChance) {
    return {
      ...state,
      playerChips: state.playerChips + state.pot,
      pot: 0,
      message: { key: "botFolded" },
      botAction: { key: "actFold" },
      playerAction: { key: "actWins" },
      gameOver: true,
      winner: "player",
      showBotCards: false,
    };
  }

  if (toCall > 0) {
    const actual = Math.min(toCall, state.botChips);
    const next: GameState = {
      ...state,
      botChips: state.botChips - actual,
      pot: state.pot + actual,
      botBet: state.botBet + actual,
      botAction: { key: "actCall", params: { amount: actual } },
    };

    if (handStrength > raiseThreshold && Math.random() < raiseChance && next.botChips > 0) {
      const raiseAmt = Math.min(Math.max(state.bigBlind * raiseMult, state.lastRaiseSize), next.botChips);
      const raised: GameState = {
        ...next,
        botChips: next.botChips - raiseAmt,
        pot: next.pot + raiseAmt,
        botBet: next.botBet + raiseAmt,
        message: { key: "botRaises", params: { amount: raiseAmt } },
        botAction: { key: "actRaise", params: { amount: raiseAmt } },
        lastRaiseSize: Math.max(raiseAmt, state.lastRaiseSize),
        isPlayerTurn: true,
      };
      return checkAllInRunout(raised) ?? raised;
    }

    return checkAllInRunout(next) ?? advanceStage(next);
  }

  if (handStrength > betThreshold && Math.random() < betChance) {
    const betAmt = Math.min(Math.max(state.bigBlind * raiseMult, state.bigBlind), state.botChips);
    return {
      ...state,
      botChips: state.botChips - betAmt,
      pot: state.pot + betAmt,
      botBet: state.botBet + betAmt,
      message: { key: "botBets", params: { amount: betAmt } },
      botAction: { key: "actBet", params: { amount: betAmt } },
      lastRaiseSize: betAmt,
      isPlayerTurn: true,
    };
  }

  return advanceStage({ ...state, botAction: { key: "actCheck" } });
}

function botHandStrength(state: GameState): number {
  const allCards = [...state.botHand, ...state.community];
  if (allCards.length < 2) return 0.5;

  const vals = state.botHand.map((c) => RANK_VALUE[c.rank]);
  const suited = state.botHand[0].suit === state.botHand[1].suit;
  const highCard = Math.max(...vals);
  const pair = vals[0] === vals[1];

  let strength = highCard / 14;
  if (pair) strength += 0.3;
  if (suited) strength += 0.1;

  if (state.community.length >= 3) {
    const result = evaluateBest5(allCards);
    strength = (result.tier + 1) / 10 + (result.ranks[0] || 0) / 140;
  }

  return Math.min(1, strength);
}

function checkAllInRunout(state: GameState): GameState | null {
  if (state.playerChips === 0 && state.botChips === 0 && state.stage !== "showdown") {
    const deck = [...state.deck];
    let community = [...state.community];
    while (community.length < 5) {
      community = [...community, ...draw(deck, 1)];
    }
    return showdown({ ...state, deck, community, showBotCards: false, allInShowdown: true });
  }
  return null;
}

function advanceStage(state: GameState): GameState {
  const deck = [...state.deck];
  let community = [...state.community];
  let nextStage: Stage;
  let msgKey: string;

  const resetBets = { playerBet: 0, botBet: 0, lastRaiseSize: state.bigBlind };

  switch (state.stage) {
    case "preflop":
      community = [...community, ...draw(deck, 3)];
      nextStage = "flop";
      msgKey = "flopRevealed";
      break;
    case "flop":
      community = [...community, ...draw(deck, 1)];
      nextStage = "turn";
      msgKey = "turnRevealed";
      break;
    case "turn":
      community = [...community, ...draw(deck, 1)];
      nextStage = "river";
      msgKey = "riverRevealed";
      break;
    case "river":
      return showdown({ ...state, deck, community });
    default:
      return state;
  }

  return {
    ...state,
    ...resetBets,
    deck,
    community,
    stage: nextStage,
    message: { key: msgKey },
    isPlayerTurn: true,
  };
}

function showdown(state: GameState): GameState {
  const playerResult = evaluateBest5([...state.playerHand, ...state.community]);
  const botResult = evaluateBest5([...state.botHand, ...state.community]);
  const cmp = compareHands(playerResult, botResult);

  let winner: "player" | "bot" | "tie";
  let message: MessageDescriptor;
  let playerAction: MessageDescriptor;
  let botAction: MessageDescriptor;
  let playerChips = state.playerChips;
  let botChips = state.botChips;

  if (cmp > 0) {
    winner = "player";
    playerChips += state.pot;
    message = {
      key: "youWin",
      params: { playerHand: playerResult.nameKey, botHand: botResult.nameKey },
    };
    playerAction = { key: "actHandWin", params: { hand: playerResult.nameKey } };
    botAction = { key: "actHandLose", params: { hand: botResult.nameKey } };
  } else if (cmp < 0) {
    winner = "bot";
    botChips += state.pot;
    message = {
      key: "botWins",
      params: { playerHand: playerResult.nameKey, botHand: botResult.nameKey },
    };
    playerAction = { key: "actHandLose", params: { hand: playerResult.nameKey } };
    botAction = { key: "actHandWin", params: { hand: botResult.nameKey } };
  } else {
    winner = "tie";
    const half = Math.floor(state.pot / 2);
    playerChips += half;
    botChips += state.pot - half;
    message = { key: "tie", params: { hand: playerResult.nameKey } };
    playerAction = { key: "actHandTie", params: { hand: playerResult.nameKey } };
    botAction = { key: "actHandTie", params: { hand: botResult.nameKey } };
  }

  return {
    ...state,
    playerChips,
    botChips,
    pot: 0,
    message,
    playerAction,
    botAction,
    gameOver: true,
    winner,
    showBotCards: true,
    stage: "showdown",
  };
}

const VALUE_RANK: Record<number, string> = {
  14: "A", 13: "K", 12: "Q", 11: "J", 10: "10",
  9: "9", 8: "8", 7: "7", 6: "6", 5: "5", 4: "4", 3: "3", 2: "2",
};

export interface PlayerHandInfo {
  nameKey: string;
  detail: string;
}

export function getPlayerHandInfo(state: GameState): PlayerHandInfo | null {
  const cards = [...state.playerHand, ...state.community];
  if (cards.length < 5) return null;
  const result = evaluateBest5(cards);
  const r = (v: number) => VALUE_RANK[v] ?? String(v);

  let detail = "";
  switch (result.nameKey) {
    case "royalFlush":
      break;
    case "straightFlush":
    case "straight":
      detail = `${r(result.ranks[0])} high`;
      break;
    case "fourOfAKind":
      detail = r(result.ranks[0]).repeat(4);
      break;
    case "fullHouse":
      detail = `${r(result.ranks[0]).repeat(3)} & ${r(result.ranks[1]).repeat(2)}`;
      break;
    case "flush":
      detail = `${r(result.ranks[0])} high`;
      break;
    case "threeOfAKind":
      detail = r(result.ranks[0]).repeat(3);
      break;
    case "twoPair":
      detail = `${r(result.ranks[0]).repeat(2)} & ${r(result.ranks[1]).repeat(2)}`;
      break;
    case "onePair":
      detail = r(result.ranks[0]).repeat(2);
      break;
    case "highCard":
      detail = `${r(result.ranks[0])} high`;
      break;
  }

  return { nameKey: result.nameKey, detail };
}

export function getBotHandInfo(state: GameState): PlayerHandInfo | null {
  if (!state.showBotCards) return null;
  const cards = [...state.botHand, ...state.community];
  if (cards.length < 5) return null;
  const result = evaluateBest5(cards);
  const r = (v: number) => VALUE_RANK[v] ?? String(v);

  let detail = "";
  switch (result.nameKey) {
    case "royalFlush":
      break;
    case "straightFlush":
    case "straight":
      detail = `${r(result.ranks[0])} high`;
      break;
    case "fourOfAKind":
      detail = r(result.ranks[0]).repeat(4);
      break;
    case "fullHouse":
      detail = `${r(result.ranks[0]).repeat(3)} & ${r(result.ranks[1]).repeat(2)}`;
      break;
    case "flush":
      detail = `${r(result.ranks[0])} high`;
      break;
    case "threeOfAKind":
      detail = r(result.ranks[0]).repeat(3);
      break;
    case "twoPair":
      detail = `${r(result.ranks[0]).repeat(2)} & ${r(result.ranks[1]).repeat(2)}`;
      break;
    case "onePair":
      detail = r(result.ranks[0]).repeat(2);
      break;
    case "highCard":
      detail = `${r(result.ranks[0])} high`;
      break;
  }

  return { nameKey: result.nameKey, detail };
}

// ---- Equity calculation (both hands known) ----

function cardKey(c: Card): string {
  return c.rank + c.suit;
}

export function calculateEquity(state: GameState): { player: number; bot: number; tie: number } {
  const known = new Set(
    [...state.playerHand, ...state.botHand, ...state.community].map(cardKey)
  );
  const remaining: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if (!known.has(rank + suit)) remaining.push({ rank, suit });
    }
  }

  const need = 5 - state.community.length;

  if (need === 0) {
    const pr = evaluateBest5([...state.playerHand, ...state.community]);
    const br = evaluateBest5([...state.botHand, ...state.community]);
    const cmp = compareHands(pr, br);
    return cmp > 0
      ? { player: 100, bot: 0, tie: 0 }
      : cmp < 0
        ? { player: 0, bot: 100, tie: 0 }
        : { player: 0, bot: 0, tie: 100 };
  }

  let wins = 0, losses = 0, ties = 0, total = 0;

  if (need <= 2) {
    const enumerate = (picked: Card[], start: number) => {
      if (picked.length === need) {
        const board = [...state.community, ...picked];
        const pr = evaluateBest5([...state.playerHand, ...board]);
        const br = evaluateBest5([...state.botHand, ...board]);
        const cmp = compareHands(pr, br);
        if (cmp > 0) wins++; else if (cmp < 0) losses++; else ties++;
        total++;
        return;
      }
      for (let i = start; i < remaining.length; i++) {
        picked.push(remaining[i]);
        enumerate(picked, i + 1);
        picked.pop();
      }
    };
    enumerate([], 0);
  } else {
    const SAMPLES = 1500;
    for (let s = 0; s < SAMPLES; s++) {
      const pool = [...remaining];
      for (let i = 0; i < need; i++) {
        const j = i + Math.floor(Math.random() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const board = [...state.community, ...pool.slice(0, need)];
      const pr = evaluateBest5([...state.playerHand, ...board]);
      const br = evaluateBest5([...state.botHand, ...board]);
      const cmp = compareHands(pr, br);
      if (cmp > 0) wins++; else if (cmp < 0) losses++; else ties++;
      total++;
    }
  }

  return {
    player: Math.round((wins / total) * 100),
    bot: Math.round((losses / total) * 100),
    tie: Math.round((ties / total) * 100),
  };
}

// ---- Outs calculation (both hands known) ----
// An "out" is a card that, if it comes next, makes the player's hand beat the bot's.
// Only meaningful on flop (need 2) and turn (need 1).

export function calculateOuts(state: GameState): Card[] {
  const need = 5 - state.community.length;
  if (need === 0 || need > 2) return []; // river or preflop — no single-card outs

  const known = new Set(
    [...state.playerHand, ...state.botHand, ...state.community].map(cardKey)
  );
  const remaining: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if (!known.has(rank + suit)) remaining.push({ rank, suit });
    }
  }

  const outs: Card[] = [];

  if (need === 1) {
    // Turn → river: check each remaining card directly
    for (const card of remaining) {
      const board = [...state.community, card];
      const pr = evaluateBest5([...state.playerHand, ...board]);
      const br = evaluateBest5([...state.botHand, ...board]);
      if (compareHands(pr, br) > 0) outs.push(card);
    }
  } else {
    // Flop → turn: clean out = card that gives player the win for ALL possible rivers
    for (const card of remaining) {
      const otherCards = remaining.filter((c) => c !== card);
      let allWin = true;
      for (const c2 of otherCards) {
        const board = [...state.community, card, c2];
        const pr = evaluateBest5([...state.playerHand, ...board]);
        const br = evaluateBest5([...state.botHand, ...board]);
        if (compareHands(pr, br) <= 0) { allWin = false; break; }
      }
      if (allWin) outs.push(card);
    }
  }

  return outs;
}

// ---- Conditional outs (bot cards unknown) ----
// For each remaining card, estimate % of (botHand, remaining board) scenarios
// where player wins. Show cards where that % > threshold.

export interface ConditionalOut {
  card: Card;
  winPct: number;
}

export function calculateConditionalOuts(
  state: GameState,
  threshold = 60
): ConditionalOut[] {
  const need = 5 - state.community.length;
  if (need === 0 || need > 2) return [];

  const known = new Set(state.playerHand.map(cardKey).concat(state.community.map(cardKey)));
  const pool: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if (!known.has(rank + suit)) pool.push({ rank, suit });
    }
  }

  const result: ConditionalOut[] = [];

  if (need === 1) {
    // Turn → river: for each candidate river card, enumerate all possible bot hands
    for (let ci = 0; ci < pool.length; ci++) {
      const card = pool[ci];
      const board = [...state.community, card];
      let wins = 0, total = 0;
      // Bot hands from pool minus this card
      for (let a = 0; a < pool.length; a++) {
        if (a === ci) continue;
        for (let b = a + 1; b < pool.length; b++) {
          if (b === ci) continue;
          const botHand = [pool[a], pool[b]];
          const pr = evaluateBest5([...state.playerHand, ...board]);
          const br = evaluateBest5([...botHand, ...board]);
          if (compareHands(pr, br) > 0) wins++;
          total++;
        }
      }
      if (total > 0) {
        const pct = Math.round((wins / total) * 100);
        if (pct >= threshold) result.push({ card, winPct: pct });
      }
    }
  } else {
    // Flop → turn+river: sample for speed
    const SAMPLES = 150;
    for (let ci = 0; ci < pool.length; ci++) {
      const card = pool[ci];
      const subPool = pool.filter((_, i) => i !== ci);
      let wins = 0, total = 0;
      for (let s = 0; s < SAMPLES; s++) {
        // Pick random river + random bot hand from subPool
        const idx: number[] = [];
        while (idx.length < 3) {
          const r = Math.floor(Math.random() * subPool.length);
          if (!idx.includes(r)) idx.push(r);
        }
        const river = subPool[idx[0]];
        const botHand = [subPool[idx[1]], subPool[idx[2]]];
        const board = [...state.community, card, river];
        const pr = evaluateBest5([...state.playerHand, ...board]);
        const br = evaluateBest5([...botHand, ...board]);
        if (compareHands(pr, br) > 0) wins++;
        total++;
      }
      if (total > 0) {
        const pct = Math.round((wins / total) * 100);
        if (pct >= threshold) result.push({ card, winPct: pct });
      }
    }
  }

  result.sort((a, b) => b.winPct - a.winPct);
  return result;
}

// ---- Blind equity (bot cards unknown) ----
// Calculates win % from the player's perspective as if bot cards are unknown,
// sampling over possible bot hands and remaining board cards.

export function calculateBlindEquity(state: GameState): { player: number; bot: number; tie: number } {
  const known = new Set(state.playerHand.map(cardKey).concat(state.community.map(cardKey)));
  const pool: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if (!known.has(rank + suit)) pool.push({ rank, suit });
    }
  }

  const need = 5 - state.community.length;
  let wins = 0, losses = 0, ties = 0, total = 0;

  if (need === 0) {
    // River done — enumerate all possible bot hands
    for (let a = 0; a < pool.length; a++) {
      for (let b = a + 1; b < pool.length; b++) {
        const pr = evaluateBest5([...state.playerHand, ...state.community]);
        const br = evaluateBest5([pool[a], pool[b], ...state.community]);
        const cmp = compareHands(pr, br);
        if (cmp > 0) wins++; else if (cmp < 0) losses++; else ties++;
        total++;
      }
    }
  } else {
    // Sample bot hands + remaining board
    const SAMPLES = 1000;
    for (let s = 0; s < SAMPLES; s++) {
      // Partial Fisher-Yates to pick (2 bot cards + need board cards)
      const pick = 2 + need;
      const p = [...pool];
      for (let i = 0; i < pick; i++) {
        const j = i + Math.floor(Math.random() * (p.length - i));
        [p[i], p[j]] = [p[j], p[i]];
      }
      const botHand = [p[0], p[1]];
      const board = [...state.community, ...p.slice(2, 2 + need)];
      const pr = evaluateBest5([...state.playerHand, ...board]);
      const br = evaluateBest5([...botHand, ...board]);
      const cmp = compareHands(pr, br);
      if (cmp > 0) wins++; else if (cmp < 0) losses++; else ties++;
      total++;
    }
  }

  return {
    player: Math.round((wins / total) * 100),
    bot: Math.round((losses / total) * 100),
    tie: Math.round((ties / total) * 100),
  };
}

// ---- Preflop calculator ----

export function preflopEquity(
  hand1: [Card, Card],
  hand2: [Card, Card],
  samples = 10000
): { hand1: number; hand2: number; tie: number } {
  const known = new Set([...hand1, ...hand2].map(cardKey));
  const pool: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if (!known.has(rank + suit)) pool.push({ rank, suit });
    }
  }

  let w1 = 0, w2 = 0, ti = 0;
  for (let s = 0; s < samples; s++) {
    const p = [...pool];
    for (let i = 0; i < 5; i++) {
      const j = i + Math.floor(Math.random() * (p.length - i));
      [p[i], p[j]] = [p[j], p[i]];
    }
    const board = p.slice(0, 5);
    const r1 = evaluateBest5([...hand1, ...board]);
    const r2 = evaluateBest5([...hand2, ...board]);
    const cmp = compareHands(r1, r2);
    if (cmp > 0) w1++; else if (cmp < 0) w2++; else ti++;
  }

  const total = w1 + w2 + ti;
  return {
    hand1: Math.round((w1 / total) * 1000) / 10,
    hand2: Math.round((w2 / total) * 1000) / 10,
    tie: Math.round((ti / total) * 1000) / 10,
  };
}

// ---- "To call or not to call" scenario generator ----

export interface CallScenario {
  playerHand: [Card, Card];
  community: Card[];
  pot: number;
  betToCall: number;
  stage: "flop" | "turn" | "river";
  equity: number;
  potOdds: number;
  isCallCorrect: boolean;
  level: number;
}

// Difficulty 1-10: lower = obvious decisions, higher = marginal spots
// We generate many candidates and pick the one closest to the target difficulty.
export function generateCallScenario(level = 5): CallScenario {
  // Target gap between equity and potOdds:
  // Level 1: |gap| ~30  (very obvious)
  // Level 10: |gap| ~1  (razor-thin, nearly impossible to estimate)
  const targetGap = level >= 9 ? 1 + Math.random() * 2 : Math.max(2, 30 - (level - 1) * 3.5);

  let best: CallScenario | null = null;
  let bestDist = Infinity;
  const attempts = 5 + level;

  for (let a = 0; a < attempts; a++) {
    const scenario = generateOneScenario(level);
    const gap = Math.abs(scenario.equity - scenario.potOdds);
    const dist = Math.abs(gap - targetGap);
    if (dist < bestDist) {
      bestDist = dist;
      best = scenario;
    }
  }

  return best!;
}

function generateOneScenario(level: number): CallScenario {
  const deck = createDeck();
  const playerHand = draw(deck, 2) as [Card, Card];

  const stages: ("flop" | "turn" | "river")[] = ["flop", "turn", "river"];
  const stage = stages[Math.floor(Math.random() * 3)];
  const communityCount = stage === "flop" ? 3 : stage === "turn" ? 4 : 5;
  const community = draw(deck, communityCount);

  const bb = 20;
  // Higher levels use wider pot/bet variety (trickier sizing)
  const maxPotMult = 5 + level;
  let pot: number;
  let betToCall: number;
  if (level >= 9) {
    // Expert: non-round pot and bet sizes, hard to calculate mentally
    pot = 10 + Math.floor(Math.random() * 40) * 7; // e.g. 17, 59, 143, 227...
    const betFracs = [0.37, 0.43, 0.57, 0.63, 0.78, 0.87, 1.15, 1.37];
    betToCall = Math.max(10, Math.round(pot * betFracs[Math.floor(Math.random() * betFracs.length)]));
  } else if (level >= 7) {
    // Hard: some odd sizes
    pot = bb * (2 + Math.floor(Math.random() * maxPotMult));
    const betFracs = [0.25, 0.33, 0.5, 0.66, 0.75, 1.0, 1.5, 2.0];
    const betFrac = betFracs[Math.floor(Math.random() * betFracs.length)];
    betToCall = Math.max(bb, Math.round(pot * betFrac / 10) * 10);
  } else if (level >= 4) {
    pot = bb * (2 + Math.floor(Math.random() * maxPotMult));
    const betFracs = [0.33, 0.5, 0.75, 1.0];
    betToCall = Math.max(bb, Math.round(pot * betFracs[Math.floor(Math.random() * betFracs.length)] / bb) * bb);
  } else {
    pot = bb * (2 + Math.floor(Math.random() * 6));
    const betFracs = [0.5, 1.0];
    betToCall = Math.max(bb, Math.round(pot * betFracs[Math.floor(Math.random() * betFracs.length)] / bb) * bb);
  }

  const known = new Set([...playerHand, ...community].map((c) => c.rank + c.suit));
  const pool: Card[] = [];
  for (const suit of (["♠","♥","♦","♣"] as Suit[])) {
    for (const rank of (["2","3","4","5","6","7","8","9","10","J","Q","K","A"] as Rank[])) {
      if (!known.has(rank + suit)) pool.push({ rank, suit });
    }
  }

  const need = 5 - community.length;
  let wins = 0, total = 0;
  const SAMPLES = 800;

  for (let s = 0; s < SAMPLES; s++) {
    const p = [...pool];
    const pick = 2 + need;
    for (let i = 0; i < pick; i++) {
      const j = i + Math.floor(Math.random() * (p.length - i));
      [p[i], p[j]] = [p[j], p[i]];
    }
    const oppHand = [p[0], p[1]];
    const board = [...community, ...p.slice(2, 2 + need)];
    const pr = evaluateBest5([...playerHand, ...board]);
    const br = evaluateBest5([...oppHand, ...board]);
    const cmp = compareHands(pr, br);
    if (cmp > 0) wins++;
    else if (cmp === 0) wins += 0.5;
    total++;
  }

  const equity = Math.round((wins / total) * 100);
  const potOdds = Math.round((betToCall / (pot + betToCall)) * 100);
  const isCallCorrect = equity >= potOdds;

  return { playerHand, community, pot, betToCall, stage, equity, potOdds, isCallCorrect, level };
}

// ---- 3-bet scenario generator ----
// Player opened with a raise, opponent 3-bets. Should player call, fold, or 4-bet?

export interface ThreeBetScenario {
  playerHand: [Card, Card];
  pot: number;
  playerRaise: number;
  opponentThreeBet: number;
  toCall: number;
  equity: number;
  potOdds: number;
  isCallCorrect: boolean;
  level: number;
}

export function generateThreeBetScenario(level = 5): ThreeBetScenario {
  const targetGap = level >= 9 ? 1 + Math.random() * 2 : Math.max(2, 30 - (level - 1) * 3.5);

  let best: ThreeBetScenario | null = null;
  let bestDist = Infinity;
  const attempts = 5 + level;

  for (let a = 0; a < attempts; a++) {
    const sc = generateOneThreeBet(level);
    const gap = Math.abs(sc.equity - sc.potOdds);
    const dist = Math.abs(gap - targetGap);
    if (dist < bestDist) { bestDist = dist; best = sc; }
  }
  return best!;
}

function generateOneThreeBet(level: number): ThreeBetScenario {
  const deck = createDeck();
  const playerHand = draw(deck, 2) as [Card, Card];

  const bb = 20;
  // Player opened with a standard raise (2-3x BB)
  const openSizes = [2, 2.5, 3];
  const openMult = openSizes[Math.floor(Math.random() * openSizes.length)];
  const playerRaise = bb * openMult;

  // Opponent 3-bets (typically 3x-4x the open raise)
  const threeBetMults = level <= 3
    ? [3, 3.5]
    : level <= 6
      ? [2.5, 3, 3.5, 4]
      : [2.2, 2.5, 3, 3.5, 4, 5];
  const threeBetMult = threeBetMults[Math.floor(Math.random() * threeBetMults.length)];
  const opponentThreeBet = Math.round(playerRaise * threeBetMult / bb) * bb;

  // Pot = blinds + player raise + opponent 3-bet
  const pot = bb + (bb / 2) + playerRaise + opponentThreeBet; // SB + BB + open + 3bet
  const toCall = opponentThreeBet - playerRaise;

  // Calculate equity vs random 3-betting range (tighter than random)
  // Approximate by sampling random hands but weighting toward stronger ones
  const known = new Set(playerHand.map((c) => c.rank + c.suit));
  const pool: Card[] = [];
  for (const suit of (["♠","♥","♦","♣"] as Suit[])) {
    for (const rank of (["2","3","4","5","6","7","8","9","10","J","Q","K","A"] as Rank[])) {
      if (!known.has(rank + suit)) pool.push({ rank, suit });
    }
  }

  let wins = 0, total = 0;
  const SAMPLES = 800;
  const RANK_VAL: Record<string, number> = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14};

  for (let s = 0; s < SAMPLES; s++) {
    const p = [...pool];
    // Pick 2 opponent cards + 5 board
    for (let i = 0; i < 7; i++) {
      const j = i + Math.floor(Math.random() * (p.length - i));
      [p[i], p[j]] = [p[j], p[i]];
    }
    // Filter for realistic 3-bet hands: skip very weak hands
    const v1 = RANK_VAL[p[0].rank], v2 = RANK_VAL[p[1].rank];
    const highCard = Math.max(v1, v2);
    const isPair = v1 === v2;
    const isSuited = p[0].suit === p[1].suit;
    // 3-bet range filter: pairs 55+, suited broadway, ATo+, KQo
    const strength = highCard + (isPair ? 5 : 0) + (isSuited ? 2 : 0) + Math.min(v1, v2) * 0.3;
    if (strength < 12) continue; // skip trash hands

    const board = p.slice(2, 7);
    const pr = evaluateBest5([...playerHand, ...board]);
    const br = evaluateBest5([p[0], p[1], ...board]);
    const cmp = compareHands(pr, br);
    if (cmp > 0) wins++;
    else if (cmp === 0) wins += 0.5;
    total++;
  }

  if (total === 0) total = 1;
  const equity = Math.round((wins / total) * 100);
  const potOdds = Math.round((toCall / (pot + toCall)) * 100);
  const isCallCorrect = equity >= potOdds;

  return { playerHand, pot, playerRaise, opponentThreeBet, toCall, equity, potOdds, isCallCorrect, level };
}

// ---- Preflop Play scenario generator ----
// Opponent opens with a raise preflop. Should you 3-bet, call, or fold?

export type PreflopPosition = "oop" | "ip";

export interface Should3BetScenario {
  playerHand: [Card, Card];
  opponentOpen: number;
  pot: number;
  equity: number;
  level: number;
  position: PreflopPosition;
  threeBetThreshold: number;
  callThreshold: number;
  correctAnswer: "3bet" | "call" | "fold";
}

export function generateShould3BetScenario(level = 5, posMode: "oop" | "ip" | "mixed" = "mixed"): Should3BetScenario {
  const position: PreflopPosition = posMode === "mixed"
    ? (Math.random() < 0.5 ? "oop" : "ip")
    : posMode;
  let best: Should3BetScenario | null = null;
  let bestDist = Infinity;
  const targetGap = level >= 9 ? 0.5 + Math.random() * 1.5 : Math.max(1.5, 25 - (level - 1) * 2.8);
  const attempts = 5 + level;

  for (let a = 0; a < attempts; a++) {
    const sc = generateOneShould3Bet(level, position);
    // Distance from the nearest threshold
    const gapTo3bet = Math.abs(sc.equity - sc.threeBetThreshold);
    const gapToCall = Math.abs(sc.equity - sc.callThreshold);
    const minGap = Math.min(gapTo3bet, gapToCall);
    const dist = Math.abs(minGap - targetGap);
    if (dist < bestDist) { bestDist = dist; best = sc; }
  }
  return best!;
}

function generateOneShould3Bet(level: number, position: PreflopPosition): Should3BetScenario {
  const deck = createDeck();
  const playerHand = draw(deck, 2) as [Card, Card];

  const bb = 20;
  const openSizes = level <= 3 ? [2, 2.5] : level <= 6 ? [2, 2.5, 3] : [2, 2.5, 3, 4];
  const openMult = openSizes[Math.floor(Math.random() * openSizes.length)];
  const opponentOpen = bb * openMult;
  const pot = bb + (bb / 2) + opponentOpen; // SB + BB + open

  // Calculate equity vs opener's range (wider than 3-bet range)
  const known = new Set(playerHand.map((c) => c.rank + c.suit));
  const pool: Card[] = [];
  for (const suit of (["♠","♥","♦","♣"] as Suit[])) {
    for (const rank of (["2","3","4","5","6","7","8","9","10","J","Q","K","A"] as Rank[])) {
      if (!known.has(rank + suit)) pool.push({ rank, suit });
    }
  }

  let wins = 0, total = 0;
  const SAMPLES = 800;
  const RANK_VAL: Record<string, number> = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14};

  for (let s = 0; s < SAMPLES; s++) {
    const p = [...pool];
    for (let i = 0; i < 7; i++) {
      const j = i + Math.floor(Math.random() * (p.length - i));
      [p[i], p[j]] = [p[j], p[i]];
    }
    // Open-raise range filter (wider than 3-bet range)
    const v1 = RANK_VAL[p[0].rank], v2 = RANK_VAL[p[1].rank];
    const isPair = v1 === v2;
    const isSuited = p[0].suit === p[1].suit;
    const strength = Math.max(v1, v2) + (isPair ? 5 : 0) + (isSuited ? 1.5 : 0) + Math.min(v1, v2) * 0.2;
    if (strength < 9) continue;

    const board = p.slice(2, 7);
    const pr = evaluateBest5([...playerHand, ...board]);
    const br = evaluateBest5([p[0], p[1], ...board]);
    const cmp = compareHands(pr, br);
    if (cmp > 0) wins++;
    else if (cmp === 0) wins += 0.5;
    total++;
  }

  if (total === 0) total = 1;
  const equity = Math.round((wins / total) * 100);

  // Decision thresholds: IP can play wider (lower thresholds), OOP needs stronger hands
  const threeBetThreshold = position === "ip" ? 52 : 58;
  const callThreshold = position === "ip" ? 37 : 43;
  const correctAnswer: "3bet" | "call" | "fold" =
    equity >= threeBetThreshold ? "3bet" :
    equity >= callThreshold ? "call" : "fold";

  return { playerHand, opponentOpen, pot, equity, level, position, threeBetThreshold, callThreshold, correctAnswer };
}
