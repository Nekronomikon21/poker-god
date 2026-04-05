export const locales = ["en", "ru", "fr", "de", "es", "it"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const localeNames: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
};
