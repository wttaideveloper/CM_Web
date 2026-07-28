"use client";

import AppShell from "@/components/layout/AppShell";
import Link from "next/link";

type ProviderTypeCard = {
  title: string;
  description: string;
  totalRegistered: number;
  active: number;
  permissions: string[];
  documents: string[];
  sections: string[];
};

const providerTypeCards: ProviderTypeCard[] = [
  {
    title: "Enterprise Provider",
    description:
      "A registered business or organization with multiple employees or service providers. Can have teams, multiple locations, and branch accounts.",
    totalRegistered: 112,
    active: 108,
    permissions: [
      "Multiple staff accounts",
      "Branch management",
      "Team scheduling",
      "Bulk product listing",
      "Enterprise analytics",
    ],
    documents: ["Business Registration", "Tax Certificate", "Industry License"],
    sections: ["1 Business Info", "2 Legal Documents", "3 Service Details", "4 Online Presence"],
  },
  {
    title: "Individual Provider",
    description:
      "A self-employed professional who offers services independently. Manages their own profile, schedule, and client relationships.",
    totalRegistered: 30,
    active: 28,
    permissions: [
      "Personal profile",
      "Solo scheduling",
      "Individual service listing",
      "Personal analytics",
      "Direct client messaging",
    ],
    documents: ["Professional License", "Government-issued ID", "Proof of Qualification"],
    sections: ["1 Personal Info", "2 Professional Details", "3 Service Offerings", "4 Online Links"],
  },
];

function TypeIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15M14 8h5a1 1 0 0 1 1 1v11M8 8h.01M8 12h.01M8 16h.01M11 8h.01M11 12h.01M11 16h.01M17 12h.01M17 16h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <path
        d="m5 12 4.2 4.2L19 6.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h4l9.5-9.5a1.75 1.75 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProviderTypeCardView({
  card,
  variant,
}: {
  card: ProviderTypeCard;
  variant: "enterprise" | "individual";
}) {
  const iconClass =
    variant === "enterprise" ? "bg-[#1f6a58] text-white" : "bg-[#9333ea] text-white";

  return (
    <section className="rounded-[20px] border border-[#dfe9e4] bg-white p-5 shadow-[0_8px_24px_rgba(15,61,51,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
            <TypeIcon />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-[#06201c]">{card.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-[#52736a]">{card.description}</p>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#1f6a58] transition hover:underline"
        >
          <PencilIcon />
          Edit
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#eef6f2] px-4 py-4 text-center">
          <p className="text-3xl font-bold text-[#0f6f57]">{card.totalRegistered}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#52736a]">
            Total Registered
          </p>
        </div>
        <div className="rounded-2xl bg-[#e9fbf2] px-4 py-4 text-center">
          <p className="text-3xl font-bold text-[#0f6f57]">{card.active}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#52736a]">
            Active
          </p>
        </div>
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-bold text-[#06201c]">Platform Permissions</h4>
        <div className="mt-3 space-y-2">
          {card.permissions.map((permission) => (
            <div key={permission} className="flex items-center gap-2.5 text-sm text-[#355a51]">
              <span className="flex h-4 w-4 items-center justify-center text-[#1f6a58]">
                <CheckIcon />
              </span>
              <span>{permission}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-bold text-[#06201c]">Required Documents</h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {card.documents.map((document) => (
            <span
              key={document}
              className="rounded-full bg-[#edf4ff] px-2.5 py-1 text-[11px] font-semibold text-[#1d5ed8]"
            >
              {document}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-bold text-[#06201c]">Registration Form Sections</h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {card.sections.map((section) => (
            <span
              key={section}
              className="rounded-full bg-[#f1f4f3] px-2.5 py-1 text-[11px] font-semibold text-[#506b63]"
            >
              {section}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-[#edf3f0] pt-4">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/onboarding-forms"
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#e8f6ee] px-4 text-sm font-bold text-[#1f6a58] transition hover:bg-[#dff1e7]"
          >
            Edit Form
          </Link>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-full border border-[#d7e5df] bg-white px-4 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#f4faf7]"
          >
            Preview
          </button>
        </div>
      </div>
    </section>
  );
}

export default function EnterpriseTypesPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
              SUPER ADMIN · CONFIGURATION
            </p>
            <h2 className="text-2xl font-bold text-[#06201c] sm:text-3xl">
              Enterprise & Individual Types
            </h2>
            <p className="max-w-3xl text-sm text-[#52736a]">
              Configure different registration workflows, permissions, and document requirements for
              each provider type
            </p>
          </div>

          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]"
          >
            + Add Provider Type
          </button>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          {providerTypeCards.map((card, index) => (
            <ProviderTypeCardView
              key={card.title}
              card={card}
              variant={index === 0 ? "enterprise" : "individual"}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
