"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/dictionary-context";

const SECTION_PATHS = [
  "/combinations",
  "/rules",
  "/hands",
  "/calculator",
  "/call",
  "/threebet",
  "/should3bet",
  "/play",
  "/about",
];

export default function PageNav() {
  const pathname = usePathname();
  const { dict, locale } = useI18n();
  const nav = dict.nav as Record<string, string>;

  const PATH_LABELS: Record<string, string> = {
    "/combinations": nav.combinations,
    "/rules": nav.rules,
    "/hands": nav.hands,
    "/calculator": nav.calculator,
    "/call": nav.call,
    "/threebet": nav.threebet,
    "/should3bet": nav.should3bet,
    "/play": nav.trainer,
    "/about": nav.about,
  };

  const currentPath = pathname.replace(new RegExp(`^/${locale}`), "") || "/";
  const idx = SECTION_PATHS.indexOf(currentPath);
  if (idx === -1) return null;

  const prev = idx > 0 ? SECTION_PATHS[idx - 1] : null;
  const next = idx < SECTION_PATHS.length - 1 ? SECTION_PATHS[idx + 1] : null;

  return (
    <div className="mt-16 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-6">
      {prev ? (
        <Link href={`/${locale}${prev}`} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors">
          <span>←</span>
          <span>{PATH_LABELS[prev]}</span>
        </Link>
      ) : <div />}

      <Link href={`/${locale}`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors">
        {nav.home}
      </Link>

      {next ? (
        <Link href={`/${locale}${next}`} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors">
          <span>{PATH_LABELS[next]}</span>
          <span>→</span>
        </Link>
      ) : <div />}
    </div>
  );
}
