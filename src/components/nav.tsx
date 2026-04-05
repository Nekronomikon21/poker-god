"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/dictionary-context";
import { locales, localeNames } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { authClient } from "@/lib/auth-client";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { dict, locale } = useI18n();
  const { data: session } = authClient.useSession();

  const links = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/combinations`, label: dict.nav.combinations },
    { href: `/${locale}/rules`, label: dict.nav.rules },
    { href: `/${locale}/hands`, label: dict.nav.hands },
    { href: `/${locale}/calculator`, label: dict.nav.calculator },
    { href: `/${locale}/call`, label: dict.nav.call },
    { href: `/${locale}/threebet`, label: dict.nav.threebet },
    { href: `/${locale}/should3bet`, label: dict.nav.should3bet },
    { href: `/${locale}/play`, label: dict.nav.trainer },
    { href: `/${locale}/about`, label: dict.nav.about },
  ];

  const pathWithoutLocale =
    pathname.replace(new RegExp(`^/${locale}`), "") || "/";

  function switchLocale(newLocale: Locale) {
    const newPath = `/${newLocale}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`;
    router.push(newPath);
  }

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-14 w-full items-center gap-4 px-6">
        <Link
          href={`/${locale}`}
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Poker God
        </Link>
        <div className="flex flex-1 flex-wrap items-center justify-between gap-y-1">
          {links.map(({ href, label }) => {
            const linkPath =
              href.replace(new RegExp(`^/${locale}`), "") || "/";
            const isActive = pathWithoutLocale === linkPath;
            const isTrainer = linkPath === "/play";
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors ${
                  isTrainer
                    ? isActive
                      ? "font-bold text-zinc-900 dark:text-zinc-50"
                      : "font-bold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    : isActive
                      ? "font-medium text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <select
            value={locale}
            onChange={(e) => switchLocale(e.target.value as Locale)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {locales.map((loc) => (
              <option key={loc} value={loc}>
                {localeNames[loc]}
              </option>
            ))}
          </select>
          {session?.user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{session.user.name}</span>
              <button
                onClick={async () => {
                  await authClient.signOut();
                  router.push(`/${locale}`);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="text-xs text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 font-medium transition-colors"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
