"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { CreatedTenant, RegistrationPlan } from "@/services/registration-ui.service";

export type RegistrationStep = 1 | 2 | 3 | 4 | 5;

type RegistrationState = {
  currentStep: RegistrationStep;
  maxStepReached: RegistrationStep;
  userId: string;
  ownerAccountCreated: boolean;
  emailVerified: boolean;
  registeredEmail: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  country: string;
  tenantName: string;
  tenantSlug: string;
  tenantSlugTouched: boolean;
  industryType: string;
  companySize: string;
  plan: RegistrationPlan;
  createdTenant: CreatedTenant | null;
};

type RegistrationUpdate = Partial<
  Pick<
    RegistrationState,
    | "userId"
    | "ownerAccountCreated"
    | "emailVerified"
    | "registeredEmail"
    | "email"
    | "password"
    | "confirmPassword"
    | "fullName"
    | "phone"
    | "country"
    | "tenantName"
    | "tenantSlug"
    | "tenantSlugTouched"
    | "industryType"
    | "companySize"
    | "plan"
    | "createdTenant"
  >
>;

type RegistrationContextValue = RegistrationState & {
  updateRegistration: (patch: RegistrationUpdate) => void;
  advanceToStep: (step: RegistrationStep) => void;
  goToStep: (step: RegistrationStep) => void;
  clearRegistrationState: () => void;
};

const INITIAL_REGISTRATION_STATE: RegistrationState = {
  currentStep: 1,
  maxStepReached: 1,
  userId: "",
  ownerAccountCreated: false,
  emailVerified: false,
  registeredEmail: "",
  email: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  phone: "",
  country: "",
  tenantName: "",
  tenantSlug: "",
  tenantSlugTouched: false,
  industryType: "",
  companySize: "",
  plan: "starter",
  createdTenant: null,
};

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RegistrationState>(INITIAL_REGISTRATION_STATE);

  const updateRegistration = useCallback((patch: RegistrationUpdate) => {
    setState((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  const advanceToStep = useCallback((step: RegistrationStep) => {
    setState((current) => ({
      ...current,
      currentStep: step,
      maxStepReached: Math.max(current.maxStepReached, step) as RegistrationStep,
    }));
  }, []);

  const goToStep = useCallback((step: RegistrationStep) => {
    setState((current) => {
      if (step > current.maxStepReached) {
        return current;
      }

      return {
        ...current,
        currentStep: step,
      };
    });
  }, []);

  const clearRegistrationState = useCallback(() => {
    setState(INITIAL_REGISTRATION_STATE);
  }, []);

  const value = useMemo<RegistrationContextValue>(
    () => ({
      ...state,
      updateRegistration,
      advanceToStep,
      goToStep,
      clearRegistrationState,
    }),
    [advanceToStep, clearRegistrationState, goToStep, state, updateRegistration],
  );

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

export function useRegistration() {
  const context = useContext(RegistrationContext);

  if (!context) {
    throw new Error("useRegistration must be used within RegistrationProvider");
  }

  return context;
}
