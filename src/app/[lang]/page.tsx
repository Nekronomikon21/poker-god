import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import Link from "next/link";

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const h = dict.home as Record<string, string>;

  const sections = [
    { key: "combinations", href: `/${lang}/combinations` },
    { key: "rules", href: `/${lang}/rules` },
    { key: "hands", href: `/${lang}/hands` },
    { key: "calculator", href: `/${lang}/calculator` },
    { key: "callOrNot", href: `/${lang}/call` },
    { key: "threebet", href: `/${lang}/threebet` },
    { key: "preflopPlay", href: `/${lang}/should3bet` },
    { key: "trainer", href: `/${lang}/play` },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {h.title}
      </h1>
      <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {h.description}
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {sections.map(({ key, href }) => {
          const title = h[`${key}Title`];
          const desc = h[`${key}Desc`];
          if (!title) return null;
          const inner = (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 h-full transition-colors hover:border-emerald-400 dark:hover:border-emerald-600">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{desc}</p>
            </div>
          );
          return href ? (
            <Link key={key} href={href}>{inner}</Link>
          ) : (
            <div key={key}>{inner}</div>
          );
        })}
      </div>
    </main>
  );
}
