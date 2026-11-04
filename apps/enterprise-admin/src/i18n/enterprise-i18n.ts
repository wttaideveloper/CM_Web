import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { enterpriseEventsEnglish } from "@ihp/enterprise-events";
import { enterpriseTrainingsEnglish } from "@ihp/enterprise-trainings";
import { productTaxClassEnglish } from "@ihp/products";
import { enterpriseFinanceEnglish } from "./enterprise-finance.en";
import { enterpriseFinanceRecordsEnglish } from "./enterprise-finance-records.en";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: {
        enterpriseEvents: enterpriseEventsEnglish,
        enterpriseTrainings: enterpriseTrainingsEnglish,
        enterpriseFinance: enterpriseFinanceEnglish,
        enterpriseFinanceRecords: enterpriseFinanceRecordsEnglish,
        productTaxClass: productTaxClassEnglish,
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
i18n.addResourceBundle("en", "enterpriseFinance", enterpriseFinanceEnglish, true, true);
i18n.addResourceBundle("en", "enterpriseFinanceRecords", enterpriseFinanceRecordsEnglish, true, true);
i18n.addResourceBundle("en", "productTaxClass", productTaxClassEnglish, true, true);

export default i18n;
