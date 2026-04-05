import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import PageNav from "@/components/page-nav";

const cardData = [
  { cards: "A K Q J 10", suits: "♠ ♠ ♠ ♠ ♠" },
  { cards: "9 8 7 6 5", suits: "♥ ♥ ♥ ♥ ♥" },
  { cards: "K K K K 3", suits: "♠ ♥ ♦ ♣ ♠" },
  { cards: "Q Q Q 7 7", suits: "♠ ♥ ♦ ♣ ♠" },
  { cards: "A J 8 5 2", suits: "♦ ♦ ♦ ♦ ♦" },
  { cards: "10 9 8 7 6", suits: "♠ ♥ ♦ ♣ ♠" },
  { cards: "J J J 9 4", suits: "♠ ♥ ♦ ♣ ♠" },
  { cards: "A A 8 8 3", suits: "♠ ♥ ♦ ♣ ♠" },
  { cards: "10 10 K 6 2", suits: "♠ ♥ ♦ ♣ ♠" },
  { cards: "A J 8 5 2", suits: "♠ ♥ ♦ ♣ ♠" },
];

function SuitChar({ suit }: { suit: string }) {
  const color =
    suit === "♥" || suit === "♦"
      ? "text-red-500"
      : "text-zinc-800 dark:text-zinc-200";
  return <span className={color}>{suit}</span>;
}

function CardDisplay({ cards, suits }: { cards: string; suits: string }) {
  const cardList = cards.split(" ");
  const suitList = suits.split(" ");

  return (
    <div className="flex gap-1.5">
      {cardList.map((card, i) => (
        <div
          key={i}
          className="flex h-28 w-20 flex-col items-center justify-center rounded-md border border-zinc-200 bg-white text-base font-bold shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          <span className="text-zinc-900 dark:text-zinc-100">{card}</span>
          <SuitChar suit={suitList[i]} />
        </div>
      ))}
    </div>
  );
}

export default async function Combinations({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {dict.combinations.title}
      </h1>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.combinations.whatIsPoker}
        </h2>
        <p
          className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400 [&_strong]:text-zinc-800 dark:[&_strong]:text-zinc-200"
          dangerouslySetInnerHTML={{ __html: dict.combinations.pokerDesc1 }}
        />
        <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">
          {dict.combinations.pokerDesc2}
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.combinations.rankingsTitle}
        </h2>

        <div className="mt-6 space-y-6">
          {dict.combinations.hands.map(
            (hand: { name: string; description: string }, i: number) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                      {i + 1}
                    </span>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {hand.name}
                    </h3>
                  </div>
                  <CardDisplay
                    cards={cardData[i].cards}
                    suits={cardData[i].suits}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {hand.description}
                </p>
              </div>
            )
          )}
        </div>
      </section>
      <PageNav />
    </main>
  );
}
