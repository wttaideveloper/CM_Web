"use client";

import { useState } from "react";

import AppShell from "@/components/layout/AppShell";

const notificationDefaults: Array<{ label: string; enabled: boolean }> = [
  { label: "New bookings", enabled: true },
  { label: "Customer reviews", enabled: true },
  { label: "Payment confirmations", enabled: true },
  { label: "Platform announcements", enabled: false },
  { label: "Marketing tips", enabled: false },
];

function LockIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-[#16332b]">
      {children}
    </label>
  );
}

function TextInput({
  defaultValue,
  placeholder,
  type = "text",
}: {
  defaultValue?: string;
  placeholder?: string;
  type?: "text" | "email" | "password";
}) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58]"
    />
  );
}

function ToggleRow({
  label,
  enabled,
  onToggle,
  isLast,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 py-3 ${isLast ? "" : "border-b border-[#edf3f0]"}`}>
      <span className="text-sm font-medium text-[#16332b]">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          enabled ? "bg-[#1f6a58]" : "bg-[#d7dfdb]"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-[#06201c]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AdminSettingsPage() {
  const [notifications, setNotifications] = useState(notificationDefaults);

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-72px)] bg-[#f7fbf8] px-6 py-6">
        <div className="mx-auto w-full max-w-7xl space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
              ENTERPRISE OWNER · SETTINGS
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#06201c]">Enterprise Settings</h1>
            <p className="mt-1 text-sm text-[#5f7a71]">
              Manage your enterprise profile, billing, and preferences
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card title="Profile Settings">
              <div className="space-y-4">
                <div className="space-y-2">
                  <InputLabel>Enterprise Name</InputLabel>
                  <TextInput defaultValue="Pinnacle Wellness Co." />
                </div>
                <div className="space-y-2">
                  <InputLabel>Contact Email</InputLabel>
                  <TextInput type="email" defaultValue="hello@pinnacle.com" />
                </div>
                <div className="space-y-2">
                  <InputLabel>Phone</InputLabel>
                  <TextInput defaultValue="+1 (415) 555-0192" />
                </div>
                <div className="space-y-2">
                  <InputLabel>Business Description</InputLabel>
                  <textarea
                    placeholder="Share a short description about your enterprise..."
                    className="h-28 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 py-2.5 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58]"
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646]"
                >
                  Save Changes
                </button>
              </div>
            </Card>

            <Card title="Notifications">
              <div>
                {notifications.map((item, index) => (
                  <ToggleRow
                    key={item.label}
                    label={item.label}
                    enabled={item.enabled}
                    isLast={index === notifications.length - 1}
                    onToggle={() => {
                      setNotifications((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, enabled: !entry.enabled }
                            : entry,
                        ),
                      );
                    }}
                  />
                ))}
              </div>
            </Card>

            <Card title="Subscription & Billing">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#dceae2] bg-[#eef6f2] p-4">
                  <p className="text-sm font-semibold text-[#06201c]">Professional Plan</p>
                  <p className="mt-1 text-sm text-[#52736a]">$149/month · Renews Jun 24, 2026</p>
                </div>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-center rounded-full bg-[#e8f6ee] px-4 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#dbf0e5]"
                  >
                    Upgrade Plan
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-center rounded-full border border-[#d7e5df] bg-white px-4 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#f7fbf8]"
                  >
                    Download Invoice
                  </button>
                </div>
              </div>
            </Card>

            <Card title="Account Security">
              <div className="space-y-4">
                <div className="space-y-2">
                  <InputLabel>Current Password</InputLabel>
                  <TextInput type="password" placeholder="••••••••••••" />
                </div>
                <div className="space-y-2">
                  <InputLabel>New Password</InputLabel>
                  <TextInput type="password" placeholder="••••••••••••" />
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646]"
                >
                  <LockIcon />
                  Update Password
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
