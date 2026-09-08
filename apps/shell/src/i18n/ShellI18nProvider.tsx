"use client";

import { I18nextProvider } from "react-i18next";
import type { ReactNode } from "react";

import shellI18n from "./shell-i18n";

/** Provides Shell-owned locale resources without persisting locale or reset values in browser storage. */
export default function ShellI18nProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={shellI18n}>{children}</I18nextProvider>;
}
