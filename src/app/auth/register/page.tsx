"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useRegistration, type RegistrationStep } from "@/contexts/RegistrationContext";
import OwnerDetailsStep from "@/components/auth/register/OwnerDetailsStep";
import VerifyEmailStep from "@/components/auth/register/VerifyEmailStep";
import OrganizationStep from "@/components/auth/register/OrganizationStep";
import PlanStep from "@/components/auth/register/PlanStep";
import RegistrationSuccessStep from "@/components/auth/register/RegistrationSuccessStep";

const stepLabels: Array<{ step: RegistrationStep; label: string }> = [
  { step: 1, label: "Account" },
  { step: 2, label: "Verify" },
  { step: 3, label: "Organization" },
  { step: 4, label: "Plan" },
  { step: 5, label: "Complete" },
];

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <path d="m5 12 4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stepper({
  currentStep,
  maxStepReached,
  onStepClick,
}: {
  currentStep: RegistrationStep;
  maxStepReached: RegistrationStep;
  onStepClick: (step: RegistrationStep) => void;
}) {
  return (
    <div className="mb-4 grid grid-cols-5 gap-1.5">
      {stepLabels.map((item) => {
        const completed = item.step < maxStepReached;
        const current = item.step === currentStep;
        const disabled = item.step > maxStepReached;

        return (
          <button
            key={item.step}
            type="button"
            onClick={() => onStepClick(item.step)}
            disabled={disabled}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-2.5 text-center transition ${
              current
                ? "border-[#1f6a58] bg-[#f5fbf8] text-[#1f6a58]"
                : completed
                  ? "border-[#d6eadf] bg-white text-[#06201c] hover:border-[#9cc9b6]"
                  : "border-[#e5ece8] bg-[#fafcfc] text-[#99ada6] opacity-70"
            } disabled:cursor-not-allowed`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                current
                  ? "bg-[#1f6a58] text-white"
                  : completed
                    ? "bg-[#e8f6ee] text-[#1f6a58]"
                    : "bg-[#edf2ef] text-[#99ada6]"
              }`}
            >
              {completed ? <CheckIcon /> : item.step}
            </span>
            <span className="text-[10px] font-semibold tracking-[0.04em]">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function LeftPanel() {
  return (
    <section className="relative flex min-h-[640px] overflow-hidden bg-[#1f6a58] px-6 py-8 text-white sm:px-10 lg:sticky lg:top-0 lg:h-[100svh] lg:px-12 lg:py-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(255,255,255,0.18)_0_1px,transparent_1px),linear-gradient(135deg,rgba(16,88,72,0.94),rgba(45,116,95,0.86))] bg-[length:48px_48px,auto]" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-[-3%] top-[12%] h-80 w-60 -rotate-5 rounded-[28px] border border-white/10 bg-transparent" />
        <div className="absolute left-[3%] top-[52%] h-64 w-28 rotate-3 rounded-[30px] border border-white/10 bg-transparent" />
        <div className="absolute right-[7%] top-[11%] h-64 w-[28rem] rotate-3 rounded-2xl border border-white/10 bg-transparent" />
        <div className="absolute right-[4%] top-[50%] h-64 w-28 -rotate-3 rounded-[30px] border border-white/10 bg-transparent" />
        <div className="absolute left-[34%] bottom-[10%] h-40 w-72 rotate-[-4deg] rounded-[24px] border border-white/10 bg-transparent" />
        <div className="absolute right-[-7%] bottom-[-8%] h-64 w-[31rem] rotate-3 rounded-2xl border border-white/10 bg-transparent" />
      </div>

      <div className="relative z-10 flex w-full max-w-[760px] flex-col lg:h-full">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/10 lg:h-10 lg:w-10">
            <svg
              aria-hidden="true"
              className="h-8 w-8 lg:h-5 lg:w-5"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M25 7C15.2 7.9 8.3 13.6 7.6 23.7C15.7 24.2 23.1 18.8 25 7Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 22.8C12 19.4 15.4 17.5 20 16.6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-[28px] font-bold tracking-tight lg:text-[22px]">Invigorate Health</p>
        </div>

        <div className="mt-16 max-w-[620px] sm:mt-20 lg:mt-10">
          <p className="text-[12px] font-bold uppercase tracking-[0.28em] text-white/65 sm:text-[13px]">
            Enterprise Platform
          </p>
          <h1 className="mt-5 max-w-[500px] text-[40px] font-extrabold leading-[1.12] tracking-normal text-white sm:text-[48px] lg:mt-4 lg:text-[34px] lg:leading-[1.1]">
            Build your organization workspace
          </h1>
          <p className="mt-5 max-w-[500px] text-xl leading-[1.55] text-white/95 sm:text-[23px] lg:mt-4 lg:text-[15px] lg:leading-[1.4]">
            Register your enterprise, verify your email, and launch a tailored healthcare workspace.
          </p>
        </div>

        <div className="mt-auto grid w-full max-w-[430px] grid-cols-3 gap-5 pb-8 pt-16 lg:pb-8 lg:pt-6">
          <div className="text-left">
            <p className="text-[30px] font-extrabold lg:text-[22px]">5</p>
            <p className="mt-1 text-[12px] text-white/70">Steps</p>
          </div>
          <div className="text-left">
            <p className="text-[30px] font-extrabold lg:text-[22px]">1</p>
            <p className="mt-1 text-[12px] text-white/70">Secure Account</p>
          </div>
          <div className="text-left">
            <p className="text-[30px] font-extrabold lg:text-[22px]">∞</p>
            <p className="mt-1 text-[12px] text-white/70">Workspace Growth</p>
          </div>
        </div>

        <p className="absolute bottom-1 left-0 right-0 text-center text-[11px] text-white/45">
          &copy; 2026 Invigorate Health, Inc. — Admin & Owner Portal
        </p>
      </div>
    </section>
  );
}

export default function AuthRegisterPage() {
  const router = useRouter();
  const { currentStep, maxStepReached, goToStep, advanceToStep, clearRegistrationState, updateRegistration } =
    useRegistration();

  const stepContent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return <OwnerDetailsStep />;
      case 2:
        return (
          <VerifyEmailStep
            onBack={() => goToStep(1)}
            onVerified={() => {
              updateRegistration({ emailVerified: true });
              advanceToStep(3);
            }}
          />
        );
      case 3:
        return <OrganizationStep onBack={() => goToStep(2)} onContinue={() => advanceToStep(4)} />;
      case 4:
        return <PlanStep onBack={() => goToStep(3)} onCompleted={() => advanceToStep(5)} />;
      case 5:
        return (
          <RegistrationSuccessStep
            onContinueToSignIn={() => {
              clearRegistrationState();
              router.push("/auth/login");
            }}
          />
        );
    }
  }, [advanceToStep, clearRegistrationState, currentStep, goToStep, router, updateRegistration]);

  return (
    <main className="min-h-screen bg-white text-[#06201c] lg:h-[100svh] lg:overflow-hidden">
      <div className="grid min-h-screen lg:h-full lg:grid-cols-[1.06fr_minmax(0,1fr)]">
        <LeftPanel />

        <section className="flex min-h-screen items-start justify-center px-6 py-8 sm:px-10 lg:h-full lg:min-h-0 lg:items-stretch lg:justify-start lg:overflow-hidden lg:px-8 lg:py-6">
          <div className="flex w-full max-w-[560px] lg:h-full lg:max-w-none">
            <div className="flex h-full w-full flex-col overflow-y-auto overscroll-contain rounded-[26px] border border-[#dfece5] bg-white p-5 shadow-[0_16px_38px_rgba(7,53,45,0.08)] sm:p-6">
              <Stepper
                currentStep={currentStep}
                maxStepReached={maxStepReached}
                onStepClick={goToStep}
              />
              <div className="min-h-0 flex-1">{stepContent}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
