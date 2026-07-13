"use client";

import { useState } from "react";

import { useRegistration } from "@/contexts/RegistrationContext";
import { registerOrganization, RegistrationApiError } from "@/services/auth.service";

type PlanStepProps = {
  onBack: () => void;
  onCompleted: () => void;
};

type PlanValue = "starter" | "professional" | "enterprise";

type PlanCard = {
  plan: PlanValue;
  label: string;
  description: string;
  badge?: string;
  features: string[];
};

const planCards: PlanCard[] = [
  {
    plan: "starter",
    label: "Starter",
    description: "For small teams getting started",
    features: ["Essential platform access", "Basic analytics", "Core team management", "Standard support"],
  },
  {
    plan: "professional",
    label: "Professional",
    badge: "Most Popular",
    description: "For growing healthcare organizations",
    features: ["Everything in Starter", "Advanced analytics", "More team members", "Priority support"],
  },
  {
    plan: "enterprise",
    label: "Enterprise",
    description: "For large organizations with advanced needs",
    features: ["Everything in Professional", "Custom permissions", "Enterprise integrations", "Dedicated support"],
  },
];

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
      <path d="m4.5 10.5 3.1 3.1 7.9-7.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RadioIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
        selected ? "border-[#1f6a58] bg-[#1f6a58]" : "border-[#c8d8d2] bg-white"
      }`}
      aria-hidden="true"
    >
      {selected ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
    </span>
  );
}

export default function PlanStep({ onBack, onCompleted }: PlanStepProps) {
  const {
    userId,
    password,
    tenantName,
    tenantSlug,
    industryType,
    companySize,
    plan,
    updateRegistration,
  } = useRegistration();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function selectPlan(nextPlan: PlanValue) {
    updateRegistration({ plan: nextPlan });
    setFormError(null);
  }

  async function handleCompleteSetup() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await registerOrganization({
        userId,
        password,
        tenantName: tenantName.trim(),
        tenantSlug: tenantSlug.trim(),
        industryType,
        companySize,
        plan,
      });

      updateRegistration({
        password: "",
        confirmPassword: "",
        createdTenant: response.data.tenant,
      });
      onCompleted();
    } catch (error) {
      if (error instanceof RegistrationApiError) {
        setFormError(error.message);
      } else {
        setFormError(error instanceof Error ? error.message : "Unable to complete registration.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[#06201c]">Choose your plan</h2>
        <p className="text-sm leading-6 text-[#52736a]">
          Select the plan that best fits your organization
        </p>
      </div>

      {formError ? (
        <div className="mt-5 rounded-2xl border border-[#fecdca] bg-[#fff6f6] px-4 py-3 text-sm text-[#b42318]">
          {formError}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <fieldset className="grid gap-3 lg:grid-cols-3">
          <legend className="sr-only">Select a plan</legend>
          {planCards.map((item) => {
            const selected = plan === item.plan;
            const id = `plan-${item.plan}`;

            return (
              <div key={item.plan} className="relative">
                <input
                  id={id}
                  type="radio"
                  name="plan"
                  value={item.plan}
                  checked={selected}
                  onChange={() => selectPlan(item.plan)}
                  className="sr-only"
                />
                <label
                  htmlFor={id}
                  className={`flex h-full cursor-pointer flex-col rounded-[18px] border p-4 text-left outline-none transition focus-within:ring-4 focus-within:ring-[#1f6a58]/10 ${
                    selected
                      ? "border-[#1f6a58] bg-[#f5fbf8] shadow-[0_0_0_1px_rgba(31,106,88,0.14)]"
                      : "border-[#d8e4df] bg-white hover:border-[#9ec3b7] hover:bg-[#fbfdfc]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-bold text-[#06201c]">{item.label}</h3>
                        {item.badge ? (
                          <span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[11px] font-bold text-[#1f6a58]">
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-5 text-[#52736a]">{item.description}</p>
                    </div>
                    <RadioIndicator selected={selected} />
                  </div>

                  <ul className="mt-3 space-y-2 text-sm text-[#35544b]">
                    {item.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckIcon />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </label>
              </div>
            );
          })}
        </fieldset>
      </div>

      <div className="sticky bottom-0 mt-5 border-t border-[#e5ece8] bg-white/95 pt-4 backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#d8e4df] bg-white px-4 text-sm font-bold text-[#06201c] transition hover:bg-[#f7fbf9] sm:w-auto"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => void handleCompleteSetup()}
            disabled={isSubmitting || !plan}
            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#1f6a58] px-4 text-sm font-bold text-white transition hover:bg-[#185746] disabled:cursor-not-allowed disabled:bg-[#8fb5aa] sm:ml-auto sm:w-auto"
          >
            {isSubmitting ? "Completing Setup..." : "Complete Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
