import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import PageNav from "@/components/page-nav";

export default async function About({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const a = dict.about as Record<string, string | string[]>;

  // Sections in logical order
  const sections: { title: string; desc?: string; list?: string[]; sub?: { title: string; desc: string }[] }[] = [
    // 1. Theory & reference
    { title: a.combosTitle as string, desc: a.combosDesc as string },
    { title: a.rulesTitle as string, desc: a.rulesDesc as string },
    { title: a.handsTitle as string, desc: a.handsDesc as string },
    // 2. Tools
    { title: a.calcTitle as string, desc: a.calcDesc as string },
    // 3. Decision trainers
    { title: a.callTitle as string, desc: a.callDesc as string },
    { title: a.threebetTitle as string, desc: a.threebetDesc as string },
    { title: a.preflopTitle as string, desc: a.preflopDesc as string },
    // 4. Main game
    {
      title: a.botTitle as string,
      desc: a.botDesc as string,
      list: a.botFeatures as string[],
    },
    // 5. Post-game analysis
    {
      title: a.analysisTitle as string,
      desc: a.analysisDesc as string,
      sub: [
        { title: a.modeOpenTitle as string, desc: a.modeOpenDesc as string },
        { title: a.modeClosedTitle as string, desc: a.modeClosedDesc as string },
      ],
    },
    { title: a.equityTitle as string, desc: a.equityDesc as string },
    // 6. Tech
    { title: a.techTitle as string, list: a.techList as string[] },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {a.title as string}
      </h1>
      <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {a.description as string}
      </p>

      {sections.map((s, i) => (
        <div key={i}>
          <h2 className="mt-10 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {s.title}
          </h2>
          {s.desc && (
            <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">{s.desc}</p>
          )}
          {s.list && (
            <ul className="mt-3 list-disc pl-6 space-y-1.5 text-zinc-600 dark:text-zinc-400">
              {s.list.map((f, j) => <li key={j}>{f}</li>)}
            </ul>
          )}
          {s.sub?.map((sub, k) => (
            <div key={k}>
              <h3 className="mt-6 text-lg font-medium text-zinc-900 dark:text-zinc-100">{sub.title}</h3>
              <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">{sub.desc}</p>
            </div>
          ))}
        </div>
      ))}

      <PageNav />
    </main>
  );
}
