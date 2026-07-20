"use client";

import { useRouter } from "next/navigation";

import { useRegistration } from "@/contexts/RegistrationContext";

type RegistrationSuccessStepProps = {
  onContinueToSignIn?: () => void;
};

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="m7 12 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function RegistrationSuccessStep({ onContinueToSignIn }: RegistrationSuccessStepProps) {
  const router = useRouter();
  const { email, tenantName, tenantSlug, plan, createdTenant, clearRegistrationState } = useRegistration();

  const workspaceSlug = createdTenant?.slug ?? tenantSlug;
  const organizationName = createdTenant?.name ?? tenantName;
  const selectedPlan = createdTenant?.plan ?? plan;

  const handleContinue = () => {
    clearRegistrationState();

    if (onContinueToSignIn) {
      onContinueToSignIn();
      return;
    }

    router.push("/auth/login");
  };

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f6ee] text-[#1f6a58]">
        <CheckIcon />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#06201c]">Your workspace is ready!</h2>
        <p className="text-sm leading-6 text-[#52736a]">
          Your Invigorate Health organization has been created successfully.
        </p>
      </div>

      <div className="rounded-[20px] border border-[#d8e4df] bg-[#f7fbf9] p-5 text-left">
        <div className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <span className="font-semibold text-[#35544b]">Organization:</span>
            <span className="text-right font-medium text-[#06201c]">{organizationName || "—"}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="font-semibold text-[#35544b]">Workspace:</span>
            <span className="text-right font-medium text-[#06201c]">
              invigorate.health/{workspaceSlug || "—"}
            </span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="font-semibold text-[#35544b]">Plan:</span>
            <span className="text-right font-medium text-[#06201c]">{selectedPlan || "—"}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="font-semibold text-[#35544b]">Owner:</span>
            <span className="text-right font-medium text-[#06201c]">{email || "—"}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleContinue}
        className="inline-flex h-11 w-full items-center justify-center rounded-[14px] bg-[#1f6a58] px-4 text-sm font-bold text-white transition hover:bg-[#185746]"
      >
        Continue to Sign In
      </button>
    </div>
  );
}
