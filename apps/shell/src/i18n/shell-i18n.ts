import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import shellEnglish from "./locales/en/shell";
import { enterpriseEventsEnglish } from "@ihp/enterprise-events";
import { enterpriseTrainingsEnglish } from "@ihp/enterprise-trainings";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: {
        shell: shellEnglish,
        enterpriseEvents: enterpriseEventsEnglish,
        enterpriseTrainings: enterpriseTrainingsEnglish,
      },
    },
    lng: "en",
    fallbackLng: "en",
    defaultNS: "shell",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

i18n.addResourceBundle("en", "enterpriseEvents", enterpriseEventsEnglish, true, true);
i18n.addResourceBundle("en", "enterpriseTrainings", enterpriseTrainingsEnglish, true, true);

export default i18n;
