import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import platformEnglish from "./locales/en/platform";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { en: { platform: platformEnglish } },
    lng: "en",
    fallbackLng: "en",
    defaultNS: "platform",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
