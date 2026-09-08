"use client";

import { I18nextProvider } from "react-i18next";
import type { ReactNode } from "react";

import platformI18n from "./platform-i18n";

/** Provides Platform Admin's namespaced locale resources without persisting language state. */
export default function PlatformI18nProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={platformI18n}>{children}</I18nextProvider>;
}
