"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import OnboardingFormPreview from "../components/preview/OnboardingFormPreview";
import {
  OnboardingFormViewErrorState,
  OnboardingFormViewLoadingState,
} from "../components/preview/OnboardingFormViewStates";
import { sortSections } from "../lib/builder.helpers";
import { getOnboardingFormById } from "../services/onboarding-form.service";
import type { OnboardingFormDto } from "../types/onboarding-form.types";

function getFormIdFromParams(params: { id?: string | string[] }) {
  return Array.isArray(params.id) ? params.id[0] ?? "" : params.id ?? "";
}

export default function OnboardingFormViewScreen() {
  const params = useParams() as { id?: string | string[] };
  const formId = getFormIdFromParams(params);
  const [form, setForm] = useState<OnboardingFormDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchForm() {
      if (!formId) {
        setForm(null);
        setError("Missing onboarding form id.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const data = await getOnboardingFormById(formId);
        if (cancelled) return;
        setForm({ ...data, sections: sortSections(data.sections) });
      } catch (fetchError) {
        if (!cancelled) {
          setForm(null);
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load onboarding form.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void fetchForm();
    return () => { cancelled = true; };
  }, [formId, reloadToken]);

  if (isLoading) return <OnboardingFormViewLoadingState />;
  if (error) return <OnboardingFormViewErrorState message={error} onRetry={() => setReloadToken((current) => current + 1)} />;
  return form ? <OnboardingFormPreview form={form} /> : null;
}
