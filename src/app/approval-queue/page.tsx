"use client";

import { useState } from "react";

import AppShell from "@/components/layout/AppShell";

type ApplicationStatus = "Pending" | "Info Needed" | "Approved" | "Rejected";
type FilterTab = "Pending" | "Info Requested" | "Approved" | "Rejected";

type ApplicationItem = {
  id: string;
  name: string;
  owner: string;
  email: string;
  type: "Enterprise" | "Individual";
  category: string;
  submitted: string;
  status: ApplicationStatus;
  docs: string[];
};

const tabs: FilterTab[] = ["Pending", "Info Requested", "Approved", "Rejected"];

const applications: ApplicationItem[] = [
  {
    id: "APP-001",
    name: "Sunrise Family Clinic",
    owner: "Dr. Sarah Chen",
    email: "sarah@sunriseclinic.com",
    type: "Enterprise",
    category: "Healthcare",
    submitted: "Jun 15, 2026",
    status: "Pending",
    docs: ["Registration Cert", "Medical License", "GST Certificate"],
  },
  {
    id: "APP-002",
    name: "Dr. Alex Turner",
    owner: "Dr. Alex Turner",
    email: "alex@turner-physio.com",
    type: "Individual",
    category: "Physiotherapy",
    submitted: "Jun 14, 2026",
    status: "Pending",
    docs: ["Professional License", "ID Proof"],
  },
  {
    id: "APP-003",
    name: "MindFlow Center",
    owner: "Jordan Lee",
    email: "jordan@mindflow.com",
    type: "Enterprise",
    category: "Mental Health",
    submitted: "Jun 13, 2026",
    status: "Info Needed",
    docs: ["Business Registration", "Practice License"],
  },
];

function QueueIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="7" r="1.25" fill="currentColor" />
      <circle cx="14" cy="12" r="1.25" fill="currentColor" />
      <circle cx="10" cy="17" r="1.25" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function statusClass(status: ApplicationStatus) {
  if (status === "Pending") {
    return "bg-[#fff7e5] text-[#b7791f]";
  }

  if (status === "Info Needed") {
    return "bg-[#eef4ff] text-[#2563eb]";
  }

  if (status === "Approved") {
    return "bg-[#e8f6ee] text-[#16825b]";
  }

  return "bg-[#fff1f0] text-[#b42318]";
}

function matchesTab(status: ApplicationStatus, tab: FilterTab) {
  if (tab === "Info Requested") {
    return status === "Info Needed";
  }

  return status === tab;
}

export default function ApprovalQueuePage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("Pending");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredApplications = applications.filter((application) => {
    const matchesStatus = matchesTab(application.status, activeTab);
    const matchesSearch =
      !normalizedQuery ||
      application.name.toLowerCase().includes(normalizedQuery) ||
      application.email.toLowerCase().includes(normalizedQuery) ||
      application.category.toLowerCase().includes(normalizedQuery);

    return matchesStatus && matchesSearch;
  });

  const selectedApplication =
    filteredApplications.find((application) => application.id === selectedId) ?? null;

  return (
    <AppShell>
      <div className="w-full min-w-0 overflow-x-hidden">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
              SUPER ADMIN · APPROVALS
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[#06201c]">Approval Queue</h2>
            <p className="mt-1.5 max-w-2xl text-sm text-[#52736a]">
              Review and approve new enterprise and individual registrations before they go live
            </p>
          </div>

          <span className="inline-flex h-9 items-center rounded-full bg-[#fff7e5] px-3.5 text-sm font-bold text-[#b7791f]">
            3 Pending
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-[#e1ebe6] bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`inline-flex h-8 items-center rounded-xl px-3 text-sm font-bold transition ${
                activeTab === tab
                  ? "bg-[#e9f4ee] text-[#0f5d4a]"
                  : "text-[#52736a] hover:bg-[#f4faf7]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <label className="relative block w-full sm:max-w-[320px]">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7f9d94]">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search applications..."
              className="h-9 w-full rounded-2xl border border-[#d7e5df] bg-white pl-10 pr-3.5 text-sm text-[#06201c] outline-none transition placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
            />
          </label>

          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[#d7e5df] bg-white px-3.5 text-sm font-semibold text-[#52736a] transition hover:bg-[#f4faf7]"
          >
            <FilterIcon />
            Filter by Type
          </button>
        </div>

        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-3">
            {filteredApplications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d7e5df] bg-white px-5 py-12 text-center shadow-sm">
                <p className="text-sm font-bold text-[#06201c]">No applications found.</p>
                <p className="mt-1.5 text-sm text-[#52736a]">Try adjusting the search or tab filter.</p>
              </div>
            ) : (
              filteredApplications.map((application) => {
                const isSelected = application.id === selectedApplication?.id;

                return (
                  <article
                    key={application.id}
                    className={`rounded-[18px] border bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected
                        ? "border-[#1f6a58] shadow-[0_10px_24px_rgba(31,106,88,0.12)]"
                        : "border-[#e1ebe6]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(application.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f6ee] text-xs font-bold text-[#1f6a58]">
                            {application.type === "Enterprise" ? "EN" : "IN"}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-[#06201c]">{application.name}</h3>
                            <p className="mt-0.5 text-xs text-[#52736a]">{application.owner}</p>
                            <p className="text-xs text-[#52736a]">{application.email}</p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(application.status)}`}
                        >
                          {application.status === "Info Needed" ? "Info Requested" : application.status}
                        </span>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {[application.type, application.category, application.submitted].map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full bg-[#f4faf7] px-2.5 py-1 text-[11px] font-semibold text-[#52736a]"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {application.docs.map((doc) => (
                          <span
                            key={doc}
                            className="rounded-full border border-[#e1ebe6] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#52736a]"
                          >
                            {doc}
                          </span>
                        ))}
                      </div>
                    </button>

                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#edf3f0] pt-2.5">
                      <button
                        type="button"
                        className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#185746]"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-[#fff7e5] px-3 py-1.5 text-[11px] font-bold text-[#b7791f] transition hover:bg-[#fdf0cf]"
                      >
                        Request Info
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-[#fff1f0] px-3 py-1.5 text-[11px] font-bold text-[#b42318] transition hover:bg-[#fde5e2]"
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <aside className="rounded-[18px] border border-[#e1ebe6] bg-white p-4 shadow-sm xl:sticky xl:top-[92px] xl:h-fit xl:max-w-[380px]">
            {!selectedApplication ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f6ee] text-[#1f6a58]">
                  <QueueIcon />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#06201c]">Select an Application</h3>
                <p className="mt-1.5 max-w-sm text-sm text-[#52736a]">
                  Click any application to review its details and submitted documents
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7f9d94]">
                  {selectedApplication.id}
                </p>
                <h3 className="mt-1.5 text-lg font-bold text-[#06201c]">{selectedApplication.name}</h3>

                <div className="mt-3 divide-y divide-[#edf3f0] rounded-xl border border-[#edf3f0] bg-[#f9fcfa] px-3">
                  {[
                    ["Type", selectedApplication.type],
                    ["Category", selectedApplication.category],
                    ["Owner", selectedApplication.owner],
                    ["Email", selectedApplication.email],
                    ["Submitted", selectedApplication.submitted],
                    [
                      "Status",
                      selectedApplication.status === "Info Needed"
                        ? "Info Requested"
                        : selectedApplication.status,
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-xs font-semibold text-[#52736a]">{label}</span>
                      <span className="text-right text-xs font-bold text-[#06201c]">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                    Submitted Documents
                  </h4>
                  <div className="mt-2 space-y-1.5">
                    {selectedApplication.docs.map((doc) => (
                      <div
                        key={doc}
                        className="flex items-center justify-between rounded-xl border border-[#edf3f0] px-3 py-2"
                      >
                        <span className="text-xs font-medium text-[#06201c]">{doc}</span>
                        <button
                          type="button"
                          className="rounded-full border border-[#d7e5df] px-2.5 py-1 text-[10px] font-bold text-[#1f6a58] transition hover:bg-[#f4faf7]"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <button
                    type="button"
                    className="w-full rounded-full bg-[#1f6a58] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#185746]"
                  >
                    Approve & Activate
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-full bg-[#fff7e5] px-3 py-2 text-xs font-bold text-[#b7791f] transition hover:bg-[#fdf0cf]"
                  >
                    Request More Info
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-full bg-[#fff1f0] px-3 py-2 text-xs font-bold text-[#b42318] transition hover:bg-[#fde5e2]"
                  >
                    Reject Application
                  </button>
                </div>

                <div className="mt-4">
                  <label className="block">
                    <span className="text-xs font-bold text-[#06201c]">Admin Notes</span>
                    <textarea
                      placeholder="Add notes or reason for decision..."
                      className="mt-2 h-20 w-full resize-none rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2 text-xs text-[#06201c] outline-none transition placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                    />
                  </label>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
