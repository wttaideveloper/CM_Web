"use client";

import { useState } from "react";

import AppShell from "@/components/layout/AppShell";

const steps = ["Business Info", "Contact", "Address", "Branding", "Review"];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold text-[#06201c]">{children}</span>;
}

function inputClass() {
  return "mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]";
}

function selectClass() {
  return inputClass();
}

function StepCircle({
  index,
  currentStep,
}: {
  index: number;
  currentStep: number;
}) {
  const isCompleted = index < currentStep;
  const isCurrent = index === currentStep;

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
        isCurrent
          ? "border-[#1f6a58] bg-[#1f6a58] text-white"
          : isCompleted
            ? "border-[#2f8a66] bg-[#e9f4ee] text-[#1f6a58]"
            : "border-[#d7e5df] bg-white text-[#8ca69e]"
      }`}
    >
      {isCompleted ? (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="m5 12 4 4 10-10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        index + 1
      )}
    </div>
  );
}

export default function CreateEnterprisePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            aria-label="Back"
            disabled={isFirstStep}
            onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e5df] text-[#52736a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            &larr;
          </button>
          <div>
            <h2 className="text-2xl font-bold text-[#06201c]">Create Enterprise</h2>
            <p className="mt-1 text-sm text-[#52736a]">
              Add a wellness business profile to the platform.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-0 overflow-x-auto pb-1">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step} className="flex min-w-[132px] items-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  className="flex items-center gap-3 text-left"
                >
                  <StepCircle index={index} currentStep={currentStep} />
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        isCurrent || isCompleted ? "text-[#06201c]" : "text-[#8ca69e]"
                      }`}
                    >
                      {step}
                    </p>
                  </div>
                </button>
                {index < steps.length - 1 ? (
                  <div className="mx-3 h-px flex-1">
                    <div
                      className={`mt-[18px] h-px w-full ${
                        isCompleted ? "bg-[#2f8a66]" : "bg-[#d7e5df]"
                      }`}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        {currentStep === 0 ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Business Information</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Enter the core details used across the enterprise profile.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Enterprise Name*</FieldLabel>
                <input
                  type="text"
                  placeholder="Pinnacle Wellness Co."
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Trading / DBA Name</FieldLabel>
                <input type="text" placeholder="Pinnacle Wellness" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Registration Number*</FieldLabel>
                <input type="text" placeholder="REG-2026-0142" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Business Category*</FieldLabel>
                <select className={selectClass()} defaultValue="Fitness & Wellness">
                  {[
                    "Fitness & Wellness",
                    "Nutrition",
                    "Mental Health",
                    "Physical Therapy",
                    "Sports Medicine",
                    "Mindfulness",
                  ].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Website URL</FieldLabel>
                <input
                  type="text"
                  placeholder="https://pinnaclewellness.com"
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Year Founded</FieldLabel>
                <select className={selectClass()} defaultValue="2021">
                  {["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"].map(
                    (option) => (
                      <option key={option}>{option}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block md:col-span-2">
                <FieldLabel>Description*</FieldLabel>
                <textarea
                  placeholder="Describe the enterprise, services, and wellness focus."
                  className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                />
              </label>
            </div>
          </>
        ) : null}

        {currentStep === 1 ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Contact</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Add the primary and backup contact details.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Primary Contact Name*</FieldLabel>
                <input type="text" placeholder="Sarah Johnson" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Job Title</FieldLabel>
                <input type="text" placeholder="Founder & CEO" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Email Address*</FieldLabel>
                <input
                  type="email"
                  placeholder="sarah@pinnacle.com"
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Phone Number*</FieldLabel>
                <input type="text" placeholder="+1 (415) 555-0192" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Secondary Email</FieldLabel>
                <input type="email" placeholder="ops@pinnacle.com" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Secondary Phone</FieldLabel>
                <input type="text" placeholder="+1 (415) 555-0134" className={inputClass()} />
              </label>
            </div>
          </>
        ) : null}

        {currentStep === 2 ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Address</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Capture the enterprise location and mailing details.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <FieldLabel>Street Address*</FieldLabel>
                <input
                  type="text"
                  placeholder="124 Wellness Ave"
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Suite / Unit</FieldLabel>
                <input type="text" placeholder="Suite 400" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>City*</FieldLabel>
                <input type="text" placeholder="San Francisco" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>State / Province*</FieldLabel>
                <input type="text" placeholder="CA" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Postal Code*</FieldLabel>
                <input type="text" placeholder="94105" className={inputClass()} />
              </label>
              <label className="block md:col-span-2">
                <FieldLabel>Country*</FieldLabel>
                <select className={selectClass()} defaultValue="United States">
                  {[
                    "United States",
                    "India",
                    "United Kingdom",
                    "Canada",
                    "Australia",
                  ].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : null}

        {currentStep === 3 ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Branding</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Upload your logo, banner, and brand colors.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-dashed border-[#b8d1c7] bg-[#f9fcfa] p-5">
                <p className="text-sm font-bold text-[#06201c]">Enterprise Logo</p>
                <p className="mt-1 text-sm text-[#52736a]">
                  PNG, SVG up to 2MB &middot; Recommended 400x400
                </p>
                <div className="mt-4 flex h-28 items-center justify-center rounded-2xl border border-[#d7e5df] bg-white text-sm text-[#8ca69e]">
                  Upload logo
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-[#b8d1c7] bg-[#f9fcfa] p-5">
                <p className="text-sm font-bold text-[#06201c]">Cover / Banner Image</p>
                <p className="mt-1 text-sm text-[#52736a]">
                  JPG, PNG up to 10MB &middot; Recommended 1200x400
                </p>
                <div className="mt-4 flex h-28 items-center justify-center rounded-2xl border border-[#d7e5df] bg-white text-sm text-[#8ca69e]">
                  Upload banner
                </div>
              </div>
              <label className="block">
                <FieldLabel>Brand Color</FieldLabel>
                <input type="text" placeholder="#1F5D4E" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Tagline</FieldLabel>
                <input
                  type="text"
                  placeholder="Your wellness, our mission"
                  className={inputClass()}
                />
              </label>
            </div>
          </>
        ) : null}

        {currentStep === 4 ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Review &amp; Submit</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Review the details below before creating the enterprise.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["Enterprise Name", "Pinnacle Wellness Co."],
                    ["Category", "Fitness & Wellness"],
                    ["Contact", "Sarah Johnson"],
                    ["Email", "sarah@pinnacle.com"],
                    ["Phone", "+1 (415) 555-0192"],
                    ["City", "San Francisco, CA"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#06201c]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#e1ebe6] bg-white p-5">
                <div className="rounded-2xl bg-[#e8f6ee] p-4 text-[#16825b]">
                  <p className="text-sm font-bold">All required fields completed</p>
                  <p className="mt-1 text-sm leading-5 text-[#14532d]">
                    Review the details above, then click Submit to create this enterprise.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button className="h-12 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">
            Save as Draft
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              disabled={isFirstStep}
              onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
              className="h-12 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              onClick={() =>
                isLastStep
                  ? undefined
                  : setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
              }
              className="h-12 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
            >
              {isLastStep ? "Submit Enterprise" : "Continue →"}
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
