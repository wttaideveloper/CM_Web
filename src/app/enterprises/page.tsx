"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

const enterprises = [
  {
    id: 1,
    name: "Pinnacle Wellness Co.",
    category: "Wellness Center",
    location: "Austin, TX",
    members: "284",
    revenue: "$12.4K",
    joined: "Jun 4, 2026",
    status: "Active",
  },
  {
    id: 2,
    name: "NutriCore Studio",
    category: "Nutrition",
    location: "Denver, CO",
    members: "192",
    revenue: "$8.7K",
    joined: "May 22, 2026",
    status: "Active",
  },
  {
    id: 3,
    name: "MindFlow Center",
    category: "Mental Health",
    location: "Portland, OR",
    members: "118",
    revenue: "$5.9K",
    joined: "May 16, 2026",
    status: "Pending",
  },
  {
    id: 4,
    name: "FlexFit Academy",
    category: "Fitness",
    location: "Chicago, IL",
    members: "356",
    revenue: "$16.8K",
    joined: "Apr 28, 2026",
    status: "Active",
  },
  {
    id: 5,
    name: "CalmSpace Retreat",
    category: "Retreat",
    location: "Sedona, AZ",
    members: "76",
    revenue: "$3.2K",
    joined: "Apr 11, 2026",
    status: "Inactive",
  },
  {
    id: 6,
    name: "Vital Sports Clinic",
    category: "Sports Therapy",
    location: "Miami, FL",
    members: "219",
    revenue: "$10.1K",
    joined: "Mar 30, 2026",
    status: "Active",
  },
  {
    id: 7,
    name: "GreenRoot Organics",
    category: "Organic Products",
    location: "Boulder, CO",
    members: "143",
    revenue: "$6.5K",
    joined: "Mar 18, 2026",
    status: "Pending",
  },
];

const filters = ["Category", "Status", "Location"];

function statusClass(status: string) {
  if (status === "Active") {
    return "bg-[#e8f6ee] text-[#16825b]";
  }

  if (status === "Pending") {
    return "bg-[#fff7e5] text-[#b7791f]";
  }

  return "bg-[#f1f4f3] text-[#6b7f79]";
}

function ListIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M8 6h12M8 12h12M8 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m13.5 6.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MoreVerticalIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v.01M12 12v.01M12 19v.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function EnterprisesPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [openActionsId, setOpenActionsId] = useState<number | null>(null);
  const listSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!listSectionRef.current?.contains(event.target as Node)) {
        setOpenActionsId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionsId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Enterprises</h2>
          <p className="mt-1 text-sm text-[#52736a]">
            Manage wellness businesses, profiles, and operating status.
          </p>
        </div>
        <button
  onClick={() => router.push("/enterprises/create")}
  className="h-12 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
>
  + Add Enterprise
</button>
      </div>

      <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            placeholder="Search enterprises"
            className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58] lg:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a]"
              >
                {filter}
              </button>
            ))}
            <div className="ml-1 flex rounded-full border border-[#d7e5df] bg-[#f9fcfa] p-1">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  viewMode === "list" ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a]"
                }`}
              >
                <ListIcon />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  viewMode === "grid" ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a]"
                }`}
              >
                <GridIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <section ref={listSectionRef} className="mt-5 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#edf3f0] px-5 py-4">
            <h3 className="text-base font-bold text-[#06201c]">7 enterprises found</h3>
            <span className="text-sm text-[#52736a]">Updated just now</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] table-fixed text-left">
              <thead className="bg-[#f8fbf9] text-[11px] uppercase tracking-[0.1em] text-[#7f9d94]">
                <tr>
                  <th className="w-[22%] px-3 py-3 font-bold">Enterprise</th>
                  <th className="w-[14%] px-3 py-3 font-bold">Category</th>
                  <th className="w-[14%] px-3 py-3 font-bold">Location</th>
                  <th className="w-[9%] px-3 py-3 font-bold">Members</th>
                  <th className="w-[10%] px-3 py-3 font-bold">Revenue</th>
                  <th className="w-[10%] px-3 py-3 font-bold">Joined</th>
                  <th className="w-[9%] px-3 py-3 font-bold">Status</th>
                  <th className="w-[12%] px-3 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3f0]">
                {enterprises.map((enterprise) => (
                  <tr key={enterprise.id} className="h-[64px] cursor-pointer text-xs transition-colors duration-150 hover:bg-emerald-50/60">
                    <td className="px-3 font-semibold text-[#06201c]">
                      {enterprise.name}
                    </td>
                    <td className="px-3 text-[#52736a]">{enterprise.category}</td>
                    <td className="px-3 text-[#52736a]">{enterprise.location}</td>
                    <td className="px-3 font-semibold text-[#06201c]">
                      {enterprise.members}
                    </td>
                    <td className="px-3 font-semibold text-[#06201c]">
                      {enterprise.revenue}
                    </td>
                    <td className="px-3 text-[#52736a]">{enterprise.joined}</td>
                    <td className="px-3">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                          enterprise.status,
                        )}`}
                      >
                        {enterprise.status}
                      </span>
                    </td>
                    <td className="px-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => router.push(`/enterprises/${enterprise.id}`)}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] transition-colors hover:bg-[#eef8f2] hover:text-[#1f6a58]"
                          aria-label={`View ${enterprise.name}`}
                        >
                          <EyeIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/enterprises/${enterprise.id}/edit`)}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] transition-colors hover:bg-[#eef8f2] hover:text-[#1f6a58]"
                          aria-label={`Edit ${enterprise.name}`}
                        >
                          <PencilIcon />
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenActionsId((current) =>
                                current === enterprise.id ? null : enterprise.id,
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] transition-colors hover:bg-[#eef8f2] hover:text-[#1f6a58]"
                            aria-label={`More actions for ${enterprise.name}`}
                            aria-expanded={openActionsId === enterprise.id}
                          >
                            <MoreVerticalIcon />
                          </button>

                          <div
                            className={`absolute right-0 top-[calc(100%+8px)] z-20 w-40 rounded-xl border border-[#e1ebe6] bg-white p-1 shadow-[0_12px_24px_rgba(7,53,45,0.12)] transition duration-150 ${
                              openActionsId === enterprise.id
                                ? "pointer-events-auto scale-100 opacity-100"
                                : "pointer-events-none scale-95 opacity-0"
                            }`}
                          >
                            {["View", "Edit", "Duplicate", "Archive", "Delete"].map((action) => (
                              <button
                                key={action}
                                type="button"
                                onClick={() => setOpenActionsId(null)}
                                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[#06201c] transition-colors hover:bg-[#f4faf7]"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#edf3f0] px-5 py-4 text-sm text-[#52736a] sm:flex-row sm:items-center sm:justify-between">
            <p>Showing 1-7 of 142 enterprises</p>
            <div className="flex gap-2">
              <button className="h-10 rounded-full border border-[#d7e5df] px-4 font-semibold">
                Previous
              </button>
              <button className="h-10 rounded-full bg-[#1f6a58] px-4 font-semibold text-white">
                Next
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {enterprises.map((enterprise) => (
              <article
                key={enterprise.name}
                className="flex min-h-[260px] flex-col justify-between rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm transition-colors duration-150 hover:bg-emerald-50/60"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e8f6ee] text-base font-extrabold text-[#1f6a58]">
                        {enterprise.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 max-w-[15ch] text-sm font-bold leading-5 text-[#06201c]">
                          {enterprise.name}
                        </h3>
                        <p className="mt-1 text-xs text-[#52736a]">{enterprise.category}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                        enterprise.status,
                      )}`}
                    >
                      {enterprise.status}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-[#52736a]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f1f7f4] text-[#1f6a58]">
                      <svg
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </span>
                    <p className="truncate">{enterprise.location}</p>
                  </div>

                  <div className="mt-4 border-t border-[#edf3f0] pt-4">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#7f9d94]">
                          Members
                        </p>
                        <p className="mt-1 truncate font-semibold text-[#06201c]">
                          {enterprise.members}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#7f9d94]">
                          Revenue
                        </p>
                        <p className="mt-1 truncate font-semibold text-[#06201c]">
                          {enterprise.revenue}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#7f9d94]">
                          Joined
                        </p>
                        <p className="mt-1 break-words font-semibold leading-5 text-[#06201c]">
                          {enterprise.joined}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/enterprises/${enterprise.id}`}
                  className="inline-flex items-center gap-1 pt-4 text-sm font-bold text-[#1f6a58] hover:text-[#185746]"
                >
                  <span>View Details</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
