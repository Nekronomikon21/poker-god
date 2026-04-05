"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "./get-dictionary";
import type { Locale } from "./config";

interface I18nContextValue {
  dict: Dictionary;
  locale: Locale;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  dict,
  locale,
  children,
}: I18nContextValue & { children: React.ReactNode }) {
  return <I18nContext value={{ dict, locale }}>{children}</I18nContext>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
