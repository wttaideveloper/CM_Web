"use client";

import { useState } from "react";

import AppShell from "@/components/layout/AppShell";

const tabs = ["Service Info", "Pricing", "Availability", "Review"];

const weekdays = [
  { day: "Monday", enabled: true },
  { day: "Tuesday", enabled: true },
  { day: "Wednesday", enabled: true },
  { day: "Thursday", enabled: true },
  { day: "Friday", enabled: true },
  { day: "Saturday", enabled: false },
  { day: "Sunday", enabled: false },
];

const summary = [
  ["Service", "Personal Training Session"],
  ["Enterprise", "Pinnacle Wellness Co."],
  ["Category", "Training"],
  ["Duration", "60 min"],
  ["Format", "In-person"],
  ["Price", "$95.00"],
  ["Availability", "Monday-Friday, 09:00 AM - 06:00 PM"],
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold text-[#06201c]">{children}</span>;
}

function controlClass() {
  return "h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]";
}

function inputClass() {
  return `mt-1.5 ${controlClass()}`;
}

function selectClass() {
  return inputClass();
}

function scheduleSelectClass() {
  return controlClass();
}

export default function CreateServicePage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <AppShell>
      <div className="flex items-start gap-3">
        <button
          aria-label="Back"
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e5df] text-[#52736a]"
        >
          &larr;
        </button>
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Create Service</h2>
          <p className="mt-1 text-sm text-[#52736a]">Add a new bookable service</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-bold ${
              activeTab === tab
                ? "bg-[#e9f4ee] text-[#1f6a58]"
                : "text-[#52736a] hover:bg-[#f4faf7]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className="mt-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        {activeTab === "Service Info" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Service Information</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Define the service, delivery details, and booking basics.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Service Name*</FieldLabel>
                <input
                  type="text"
                  placeholder="Personal Training Session"
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Category*</FieldLabel>
                <select className={selectClass()} defaultValue="Training">
                  {["Training", "Coaching", "Classes", "Recovery", "Therapy", "Mindfulness"].map(
                    (option) => (
                      <option key={option}>{option}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Enterprise*</FieldLabel>
                <select className={selectClass()} defaultValue="Pinnacle Wellness Co.">
                  {["Pinnacle Wellness Co.", "NutriCore Studio", "FlexFit Academy"].map(
                    (option) => (
                      <option key={option}>{option}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Duration (minutes)*</FieldLabel>
                <input type="text" placeholder="60" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Max Participants</FieldLabel>
                <input type="text" placeholder="1" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Provider/Instructor</FieldLabel>
                <input type="text" placeholder="Sarah Jones" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Delivery Format</FieldLabel>
                <select className={selectClass()} defaultValue="In-person">
                  {["In-person", "Virtual (Zoom)", "Hybrid"].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <FieldLabel>Description*</FieldLabel>
                <textarea
                  placeholder="Describe the service experience, outcomes, and requirements."
                  className="mt-1.5 min-h-24 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                />
              </label>
            </div>
          </>
        ) : null}

        {activeTab === "Pricing" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Pricing &amp; Cancellation</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Configure session pricing and cancellation terms.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Session Price*</FieldLabel>
                <input type="text" placeholder="95.00" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Package Price (optional)</FieldLabel>
                <input
                  type="text"
                  placeholder="5-pack for $425"
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Currency</FieldLabel>
                <select className={selectClass()} defaultValue="USD ($)">
                  {["USD ($)", "INR (₹)", "EUR (€)"].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Cancellation Policy</FieldLabel>
                <select
                  className={selectClass()}
                  defaultValue="Flexible - full refund 24hrs before"
                >
                  {[
                    "Flexible - full refund 24hrs before",
                    "Moderate - full refund 48hrs before",
                    "Strict - no refund",
                  ].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : null}

        {activeTab === "Availability" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Weekly Schedule</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Set bookable days, operating hours, and slot length.
              </p>
            </div>
            <div className="space-y-3">
              {weekdays.map((day) => (
                <div
                  key={day.day}
                  className="grid gap-3 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-3 md:grid-cols-[1.1fr_1fr_1fr_1fr]"
                >
                  <label className="flex h-[46px] items-center gap-3 text-sm font-bold text-[#06201c]">
                    <input
                      type="checkbox"
                      defaultChecked={day.enabled}
                      className="h-4 w-4 accent-[#1f6a58]"
                    />
                    {day.day}
                  </label>
                  {day.enabled ? (
                    <>
                      <select className={scheduleSelectClass()} defaultValue="09:00 AM">
                        {["09:00 AM", "10:00 AM", "11:00 AM"].map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                      <select className={scheduleSelectClass()} defaultValue="06:00 PM">
                        {["05:00 PM", "06:00 PM", "07:00 PM"].map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                      <select className={scheduleSelectClass()} defaultValue="60 min">
                        {["30 min", "45 min", "60 min", "90 min"].map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <div className="flex h-[46px] items-center text-sm text-[#8ca69e] md:col-span-3">
                      Not available
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {activeTab === "Review" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Review Service</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Review all details before publishing this service.
              </p>
            </div>
            <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-5">
              <div className="grid gap-4 md:grid-cols-2">
                {summary.map(([label, value]) => (
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
          </>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-[#edf3f0] pt-4 sm:flex-row sm:justify-end">
          <button className="h-[46px] rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">
            Save Draft
          </button>
          <button className="h-[46px] rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm">
            Continue →
          </button>
        </div>
      </section>
    </AppShell>
  );
}
