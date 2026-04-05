import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import PageNav from "@/components/page-nav";

// Heads-up starting hand tiers (1=premium, 5=trash)
// Rows = first card (A..2), Cols = second card (A..2)
// Upper-right triangle = suited, lower-left = offsuit, diagonal = pairs
const TIER: number[][] = [
  // A  K  Q  J  T  9  8  7  6  5  4  3  2
  [  1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3 ], // A
  [  1, 1, 1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4 ], // K
  [  1, 2, 1, 1, 2, 3, 3, 4, 4, 4, 4, 4, 5 ], // Q
  [  2, 2, 2, 1, 2, 2, 3, 4, 4, 4, 5, 5, 5 ], // J
  [  2, 2, 3, 3, 1, 2, 3, 3, 4, 5, 5, 5, 5 ], // T
  [  3, 3, 3, 3, 3, 2, 3, 3, 4, 4, 5, 5, 5 ], // 9
  [  3, 4, 4, 4, 3, 3, 2, 3, 3, 4, 5, 5, 5 ], // 8
  [  3, 4, 4, 4, 4, 4, 4, 2, 3, 3, 4, 5, 5 ], // 7
  [  3, 4, 5, 5, 5, 4, 4, 4, 3, 3, 4, 4, 5 ], // 6
  [  3, 4, 5, 5, 5, 5, 5, 4, 4, 3, 3, 4, 4 ], // 5
  [  4, 5, 5, 5, 5, 5, 5, 5, 5, 4, 3, 3, 4 ], // 4
  [  4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 3, 4 ], // 3
  [  4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 3 ], // 2
];

// Compute individual rankings 1-169 from TIER + card values
// Sort by: tier ASC, then higher first card, then higher second card
function computeRankings(): number[][] {
  const entries: { row: number; col: number; tier: number; v1: number; v2: number }[] = [];
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      entries.push({ row: r, col: c, tier: TIER[r][c], v1: 14 - r, v2: 14 - c });
    }
  }
  entries.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.v1 !== b.v1) return b.v1 - a.v1;
    return b.v2 - a.v2;
  });
  const grid = Array.from({ length: 13 }, () => Array(13).fill(0));
  entries.forEach((e, i) => { grid[e.row][e.col] = i + 1; });
  return grid;
}
const HAND_RANK = computeRankings();

const RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];

const TIER_COLORS: Record<number, string> = {
  1: "bg-emerald-600 text-white",
  2: "bg-emerald-800 text-emerald-100",
  3: "bg-yellow-700 text-yellow-100",
  4: "bg-orange-800 text-orange-100",
  5: "bg-red-900 text-red-200",
};

export default async function Hands({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const h = dict.hands as Record<string, string>;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {h.title}
      </h1>
      <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {h.intro}
      </p>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-3">
        {[1,2,3,4,5].map((tier) => (
          <div key={tier} className="flex items-center gap-1.5">
            <div className={`h-4 w-4 rounded ${TIER_COLORS[tier]}`} />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{(h as Record<string,string>)[`tier${tier}`]}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        {h.suitedNote}
      </p>

      {/* Grid */}
      <div className="mt-6 overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="w-8 h-8" />
              {RANKS.map((r) => (
                <th key={r} className="w-10 h-8 text-center text-xs font-bold text-zinc-500 dark:text-zinc-400">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RANKS.map((r1, row) => (
              <tr key={r1}>
                <td className="w-8 h-10 text-center text-xs font-bold text-zinc-500 dark:text-zinc-400">{r1}</td>
                {RANKS.map((r2, col) => {
                  const tier = TIER[row][col];
                  const isPair = row === col;
                  const isSuited = col > row;
                  const label = isPair
                    ? `${r1}${r2}`
                    : isSuited
                      ? `${r1}${r2}s`
                      : `${r1}${r2}o`;
                  const rank = HAND_RANK[row][col];
                  return (
                    <td key={col}
                      className={`relative w-10 h-10 text-center text-[11px] font-semibold rounded-sm border border-black/10 dark:border-white/10 ${TIER_COLORS[tier]}`}
                    >
                      {label}
                      <span className="absolute top-0 right-0.5 text-[7px] opacity-60 font-normal">
                        {rank}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PageNav />
    </main>
  );
}
