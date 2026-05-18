"use client";

import { useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { createI18n } from "./create-i18n";
import type { LocaleResources, SupportedLocale } from "./types";

export interface I18nProviderProps {
  locale: SupportedLocale;
  resources: Record<string, LocaleResources>;
  children: ReactNode;
}

export function I18nProvider({
  locale,
  resources,
  children,
}: I18nProviderProps) {
  // Debug: log resources to verify they're being passed correctly
  console.log('[I18nProvider] locale:', locale, 'resources keys:', Object.keys(resources), 'memories keys:', resources[locale]?.memories ? Object.keys(resources[locale].memories) : 'MISSING');
  // Lazy init via useState so the instance survives re-renders.
  // Locale + resources are determined at boot and never change at runtime —
  // language switching goes through window.location.reload().
  const [instance] = useState(() => createI18n(locale, resources));
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
