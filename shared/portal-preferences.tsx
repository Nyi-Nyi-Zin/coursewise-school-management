"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translatePortalText, type PortalLocale, type PortalTextKey } from "./portal-i18n";

export type PortalTheme = "light" | "dark";
type Preferences = { theme: PortalTheme; locale: PortalLocale; setTheme: (theme: PortalTheme) => void; setLocale: (locale: PortalLocale) => void; t: (key: PortalTextKey) => string };
const PreferencesContext = createContext<Preferences | null>(null);

export function PortalPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<PortalTheme>("light");
  const [locale, setLocale] = useState<PortalLocale>("en");
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("teza-theme");
    const savedLocale = window.localStorage.getItem("teza-locale");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    if (savedLocale === "en" || savedLocale === "my") setLocale(savedLocale);
  }, []);
  useEffect(() => { window.localStorage.setItem("teza-theme", theme); document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { window.localStorage.setItem("teza-locale", locale); document.documentElement.lang = locale === "my" ? "my" : "en"; }, [locale]);
  const value = useMemo(() => ({ theme, locale, setTheme, setLocale, t: (key: PortalTextKey) => translatePortalText(locale, key) }), [theme, locale]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePortalPreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePortalPreferences must be used inside PortalPreferencesProvider");
  return value;
}

export function PreferenceControls({ compact = false }: { compact?: boolean }) {
  const { theme, locale, setTheme, setLocale, t } = usePortalPreferences();
  return <div className={`preference-controls flex items-center gap-1 rounded-xl border border-current/10 bg-white/70 p-1 ${compact ? "" : "shadow-sm"}`} aria-label={`${t("theme")} · ${t("language")}`}><button type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="rounded-lg px-2 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-100" aria-label="Toggle light and dark theme">{theme === "light" ? "☾" : "☀"}<span className="sr-only">Toggle theme</span></button><button type="button" onClick={() => setLocale(locale === "en" ? "my" : "en")} className="rounded-lg px-2 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-100" aria-label="Switch English and Burmese language preference">{locale === "en" ? "မြန်မာ" : "EN"}</button></div>;
}
