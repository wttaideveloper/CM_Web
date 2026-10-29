"use client";

import { I18nextProvider } from "react-i18next";
import type { ReactNode } from "react";

import enterpriseI18n from "./enterprise-i18n";

/** Provides the Enterprise Admin locale resources without persisting language state. */
export default function EnterpriseI18nProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={enterpriseI18n}>{children}</I18nextProvider>;
}
