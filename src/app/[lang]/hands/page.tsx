import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import PageNav from "@/components/page-nav";

// Heads-up win rates vs random hand (%)
// Upper-right = suited, lower-left = offsuit, diagonal = pairs
const WIN_RATE: number[][] = [
  // A   K   Q   J   T   9   8   7   6   5   4   3   2
  [ 85, 68, 67, 66, 66, 64, 63, 63, 62, 62, 61, 60, 59 ], // A
  [ 66, 83, 64, 64, 63, 61, 60, 59, 58, 58, 57, 56, 55 ], // K
  [ 65, 62, 80, 61, 61, 59, 58, 56, 55, 55, 54, 53, 52 ], // Q
  [ 65, 62, 59, 78, 59, 57, 56, 54, 53, 52, 51, 50, 50 ], // J
  [ 64, 61, 59, 57, 75, 56, 54, 53, 51, 49, 49, 48, 47 ], // T
  [ 62, 59, 57, 55, 53, 72, 53, 51, 50, 48, 46, 46, 45 ], // 9
  [ 61, 58, 55, 53, 52, 50, 69, 50, 49, 47, 45, 43, 43 ], // 8
  [ 60, 57, 54, 52, 50, 48, 47, 67, 48, 46, 45, 43, 41 ], // 7
  [ 59, 56, 53, 50, 48, 47, 46, 45, 64, 46, 44, 42, 40 ], // 6
  [ 60, 55, 52, 49, 47, 45, 44, 43, 43, 61, 44, 43, 41 ], // 5
  [ 59, 54, 51, 48, 46, 43, 42, 41, 41, 41, 58, 42, 40 ], // 4
  [ 58, 54, 50, 48, 45, 43, 40, 39, 39, 39, 38, 55, 39 ], // 3
  [ 57, 53, 49, 47, 44, 42, 40, 37, 37, 37, 36, 35, 51 ], // 2
];

// Compute tiers from win rates:
// 1 = >= 65% (premium), 2 = 57-64% (strong), 3 = 50-56% (playable),
// 4 = 44-49% (marginal), 5 = < 44% (weak)
function computeTier(wr: number): number {
  if (wr >= 65) return 1;
  if (wr >= 57) return 2;
  if (wr >= 50) return 3;
  if (wr >= 44) return 4;
  return 5;
}
const TIER = WIN_RATE.map((row) => row.map(computeTier));

// Compute rankings 1-169 sorted by win rate descending
function computeRankings(): number[][] {
  const entries: { row: number; col: number; wr: number }[] = [];
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      entries.push({ row: r, col: c, wr: WIN_RATE[r][c] });
    }
  }
  entries.sort((a, b) => b.wr - a.wr);
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
              <th className="w-6 h-6" />
              {RANKS.map((r) => (
                <th key={r} className="w-9 h-6 text-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RANKS.map((r1, row) => (
              <tr key={r1}>
                <td className="w-6 h-9 text-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{r1}</td>
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
                  const wr = WIN_RATE[row][col];
                  return (
                    <td key={col}
                      className={`relative w-9 h-9 text-center text-[9px] font-semibold rounded-sm border border-black/10 dark:border-white/10 leading-tight ${TIER_COLORS[tier]}`}
                    >
                      {label}
                      <br />
                      <span className="text-[8px] opacity-70 font-normal">{wr}%</span>
                      <span className="absolute top-0 right-px text-[6px] opacity-50 font-normal">
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
