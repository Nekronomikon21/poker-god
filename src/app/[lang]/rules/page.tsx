import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import PageNav from "@/components/page-nav";

export default async function Rules({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const r = dict.rules as Record<string, string | string[]>;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {r.title as string}
      </h1>
      <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {r.intro as string}
      </p>

      {/* Goal */}
      <h2 className="mt-10 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {r.goalTitle as string}
      </h2>
      <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">
        {r.goalDesc as string}
      </p>

      {/* Setup */}
      <h2 className="mt-10 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {r.setupTitle as string}
      </h2>
      <ul className="mt-3 list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
        {(r.setupList as string[]).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      {/* Blinds */}
      <h2 className="mt-10 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {r.blindsTitle as string}
      </h2>
      <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">
        {r.blindsDesc as string}
      </p>

      {/* Stages */}
      <h2 className="mt-10 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {r.stagesTitle as string}
      </h2>

      <h3 className="mt-6 text-lg font-medium text-zinc-900 dark:text-zinc-100">
        1. {r.preflopTitle as string}
      </h3>
      <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">
        {r.preflopDesc as string}
      </p>

      <h3 className="mt-6 text-lg font-medium text-zinc-900 dark:text-zinc-100">
        2. {r.flopTitle as string}
      </h3>
      <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">
        {r.flopDesc as string}
      </p>

      <h3 className="mt-6 text-lg font-medium text-zinc-900 dark:text-zinc-100">
        3. {r.turnTitle as string}
      </h3>
      <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">
        {r.turnDesc as string}
      </p>

      <h3 className="mt-6 text-lg font-medium text-zinc-900 dark:text-zinc-100">
        4. {r.riverTitle as string}
      </h3>
      <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">
        {r.riverDesc as string}
      </p>

      <h3 className="mt-6 text-lg font-medium text-zinc-900 dark:text-zinc-100">
        5. {r.showdownTitle as string}
      </h3>
      <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">
        {r.showdownDesc as string}
      </p>

      {/* Actions */}
      <h2 className="mt-10 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {r.actionsTitle as string}
      </h2>
      <ul className="mt-3 list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
        {(r.actionsList as string[]).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      {/* Heads-up specifics */}
      <h2 className="mt-10 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {r.headsUpTitle as string}
      </h2>
      <ul className="mt-3 list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
        {(r.headsUpList as string[]).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      {/* Winning */}
      <h2 className="mt-10 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {r.winTitle as string}
      </h2>
      <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">
        {r.winDesc as string}
      </p>
      <PageNav />
    </main>
  );
}
