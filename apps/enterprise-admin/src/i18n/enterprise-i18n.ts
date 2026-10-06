import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enterpriseEventsEnglish from "./locales/en/enterprise-events";
import enterpriseTrainingsEnglish from "./locales/en/enterprise-trainings";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: {
        enterpriseEvents: enterpriseEventsEnglish,
        enterpriseTrainings: enterpriseTrainingsEnglish,
      },
    },
    lng: "en",
    fallbackLng: "en",
    defaultNS: "enterpriseEvents",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

i18n.addResourceBundle("en", "enterpriseEvents", enterpriseEventsEnglish, true, true);
i18n.addResourceBundle("en", "enterpriseTrainings", enterpriseTrainingsEnglish, true, true);

export default i18n;
