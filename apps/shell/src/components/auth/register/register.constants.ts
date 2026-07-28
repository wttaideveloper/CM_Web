import type { RegistrationPlan } from "@/services/registration-ui.service";

export type CountryDialOption = {
  name: string;
  isoCode: string;
  dialCode: string;
};

export const countryDialOptions: CountryDialOption[] = [
  { name: "Bangladesh", isoCode: "BD", dialCode: "+880" },
  { name: "United States", isoCode: "US", dialCode: "+1" },
  { name: "India", isoCode: "IN", dialCode: "+91" },
  { name: "United Kingdom", isoCode: "GB", dialCode: "+44" },
  { name: "Canada", isoCode: "CA", dialCode: "+1" },
  { name: "Australia", isoCode: "AU", dialCode: "+61" },
  { name: "Pakistan", isoCode: "PK", dialCode: "+92" },
  { name: "Sri Lanka", isoCode: "LK", dialCode: "+94" },
  { name: "Nepal", isoCode: "NP", dialCode: "+977" },
  { name: "Singapore", isoCode: "SG", dialCode: "+65" },
  { name: "United Arab Emirates", isoCode: "AE", dialCode: "+971" },
  { name: "Saudi Arabia", isoCode: "SA", dialCode: "+966" },
];

export const countryOptions = [
  "United States",
  "India",
  "United Kingdom",
  "Canada",
  "Australia",
  "Other",
];

export const industryOptions = [
  "Healthcare",
  "Wellness",
  "Fitness",
  "Pharmacy",
  "Insurance",
  "Medical Devices",
  "Other",
];

export const companySizeOptions = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export type RegistrationPlanDefinition = {
  plan: RegistrationPlan;
  label: string;
  badge?: string;
  description: string;
  features: string[];
  buttonLabel: string;
};

export const registrationPlans: RegistrationPlanDefinition[] = [
  {
    plan: "starter",
    label: "Starter",
    description: "For small teams getting started",
    features: ["Essential platform access", "Basic analytics", "Core team management", "Standard support"],
    buttonLabel: "Choose Starter",
  },
  {
    plan: "professional",
    label: "Professional",
    badge: "Most Popular",
    description: "For growing healthcare organizations",
    features: [
      "Everything in Starter",
      "Advanced analytics",
      "More team members",
      "Priority support",
      "Enhanced integrations",
    ],
    buttonLabel: "Choose Professional",
  },
  {
    plan: "enterprise",
    label: "Enterprise",
    description: "For large organizations with advanced needs",
    features: [
      "Everything in Professional",
      "Custom permissions",
      "Enterprise integrations",
      "Dedicated support",
      "Advanced security",
    ],
    buttonLabel: "Choose Enterprise",
  },
];

export function normalizeWorkspaceSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidWorkspaceSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
