"use client";

import AppShell from "@/components/layout/AppShell";
import { useMemo, useState } from "react";

type SubAdmin = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
  permissions: string[];
  status: "Active" | "Inactive";
  lastActive: string;
};

const subAdmins: SubAdmin[] = [
  {
    id: "priya-sharma",
    name: "Priya Sharma",
    email: "priya@invigoratehealth.com",
    initials: "PS",
    role: "Operations Manager",
    permissions: ["Approvals", "Enterprise Mgmt", "Reports"],
    status: "Active",
    lastActive: "2 hrs ago",
  },
  {
    id: "james-liu",
    name: "James Liu",
    email: "james@invigoratehealth.com",
    initials: "JL",
    role: "Content Moderator",
    permissions: ["Products", "Services", "Events"],
    status: "Active",
    lastActive: "1 day ago",
  },
  {
    id: "monica-okafor",
    name: "Monica Okafor",
    email: "monica@invigoratehealth.com",
    initials: "MO",
    role: "Support Lead",
    permissions: ["Approvals", "Categories"],
    status: "Active",
    lastActive: "5 hrs ago",
  },
  {
    id: "david-chen",
    name: "David Chen",
    email: "david@invigoratehealth.com",
    initials: "DC",
    role: "Analytics Specialist",
    permissions: ["Reports", "Analytics"],
    status: "Inactive",
    lastActive: "3 days ago",
  },
];

const permissionOptions = [
  { label: "Approvals", checked: true },
  { label: "Enterprise Mgmt", checked: true },
  { label: "Products", checked: false },
  { label: "Services", checked: false },
  { label: "Events", checked: false },
  { label: "Trainings", checked: false },
  { label: "Categories", checked: false },
  { label: "Reports", checked: true },
  { label: "Analytics", checked: false },
  { label: "Integrations", checked: false },
  { label: "Form Builder", checked: false },
  { label: "User Management", checked: false },
];

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3 5 6v5c0 4.2 2.8 8 7 10 4.2-2 7-5.8 7-10V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h4l9.5-9.5a1.75 1.75 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SubAdminsPage() {
  const [query, setQuery] = useState("");

  const filteredAdmins = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return subAdmins;
    }

    return subAdmins.filter((admin) => {
      return (
        admin.name.toLowerCase().includes(normalized) ||
        admin.email.toLowerCase().includes(normalized) ||
        admin.role.toLowerCase().includes(normalized) ||
        admin.permissions.some((permission) => permission.toLowerCase().includes(normalized))
      );
    });
  }, [query]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1220px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
              SUPER ADMIN · ACCESS CONTROL
            </p>
            <h2 className="text-2xl font-bold text-[#06201c] sm:text-3xl">
              Sub-Admin Management
            </h2>
            <p className="max-w-3xl text-sm text-[#52736a]">
              Create sub-admin accounts and configure granular permissions for each team member
            </p>
          </div>

          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]"
          >
            Invite Sub-Admin
          </button>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-[20px] border border-[#e1ebe6] bg-white shadow-[0_8px_24px_rgba(15,61,51,0.06)]">
            <div className="flex flex-col gap-3 border-b border-[#edf3f0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[#355a51]">4 sub-admins</p>
              <label className="relative block w-full sm:w-auto">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8ca69e]">
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search sub-admins..."
                  className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f8fbf9] pl-10 pr-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58] sm:w-[300px]"
                />
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[#edf3f0] bg-[#fbfdfc]">
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#8ca69e]">
                      SUB-ADMIN
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#8ca69e]">
                      ROLE
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#8ca69e]">
                      PERMISSIONS
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#8ca69e]">
                      STATUS
                    </th>
                    <th className="hidden px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#8ca69e] 2xl:table-cell">
                      LAST ACTIVE
                    </th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-[#8ca69e]">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="h-16 border-b border-[#edf3f0] last:border-b-0">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1f6a58] text-xs font-bold text-white">
                            {admin.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#06201c]">{admin.name}</p>
                            <p className="truncate text-xs text-[#7f9d94]">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-block max-w-[140px] truncate rounded-full bg-[#f1f4f3] px-2 py-0.5 text-[10px] font-medium text-[#506b63]">
                          {admin.role}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {admin.permissions.map((permission) => (
                            <span
                              key={permission}
                              className="rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[10px] font-semibold text-[#1f6a58]"
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            admin.status === "Active"
                              ? "bg-[#e8f6ee] text-[#16825b]"
                              : "bg-[#f1f4f3] text-[#6b7f79]"
                          }`}
                        >
                          {admin.status}
                        </span>
                      </td>
                      <td className="hidden px-3 py-2.5 text-sm text-[#506b63] 2xl:table-cell">{admin.lastActive}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-2 text-[#688079]">
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-[#f4faf7] hover:text-[#1f6a58]"
                          >
                            <ShieldIcon />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-[#f4faf7] hover:text-[#1f6a58]"
                          >
                            <PencilIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-[20px] border border-[#e1ebe6] bg-white p-4 shadow-[0_8px_24px_rgba(15,61,51,0.06)]">
            <h3 className="text-base font-bold text-[#06201c]">Invite New Sub-Admin</h3>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm font-bold text-[#06201c]">Full Name *</span>
                <input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f4faf7] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#06201c]">Email Address *</span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f4faf7] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#06201c]">Role *</span>
                <select className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f4faf7] px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]">
                  {[
                    "Operations Manager",
                    "Content Moderator",
                    "Support Lead",
                    "Analytics Specialist",
                  ].map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="text-sm font-bold text-[#06201c]">Permissions</span>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                  {permissionOptions.map((permission) => (
                    <label
                      key={permission.label}
                      className="inline-flex items-center gap-2 text-xs font-medium text-[#355a51]"
                    >
                      <input
                        type="checkbox"
                        defaultChecked={permission.checked}
                        className="h-4 w-4 rounded border-[#c6ddd3] text-[#1f6a58] focus:ring-[#1f6a58]"
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]"
              >
                Send Invite
              </button>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
