import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import platformEnglish from "./locales/en/platform";
import platformTaxRulesEnglish from "./locales/en/platform-tax-rules";
import { productTaxClassEnglish } from "@ihp/products";

// Keep Platform Admin's namespace isolated from any other app using the i18next singleton.
const platformI18n = createInstance();
export const platformI18nReady = platformI18n.use(initReactI18next).init({
  resources: { en: { platform: platformEnglish, productTaxClass: productTaxClassEnglish, platformTaxRules: platformTaxRulesEnglish } },
  lng: "en",
  fallbackLng: "en",
  defaultNS: "platform",
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default platformI18n;
