import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import shellEnglish from "./locales/en/shell";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { en: { shell: shellEnglish } },
    lng: "en",
    fallbackLng: "en",
    defaultNS: "shell",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
