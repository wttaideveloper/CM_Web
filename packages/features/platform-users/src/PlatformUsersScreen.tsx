"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { usePlatformUsers } from "./platform-users.queries";
import { PlatformUsersApiError } from "./platform-users.service";

function formatDate(value: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof PlatformUsersApiError && error.status === 401) return "Super Admin authentication is required.";
  if (error instanceof PlatformUsersApiError && error.status === 403) return "You do not have permission to access users.";
  return "Unable to load users.";
}

function BooleanBadge({ value, yes, no }: { value: boolean; yes: string; no: string }) {
  return <span className={value ? "inline-flex rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[11px] font-bold text-[#16825b]" : "inline-flex rounded-full bg-[#f1f4f3] px-2.5 py-1 text-[11px] font-bold text-[#6b7f79]"}>{value ? yes : no}</span>;
}

function UsersTable() {
  const usersQuery = usePlatformUsers();
  const [search, setSearch] = useState("");
  const users = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (usersQuery.data?.items ?? []).filter((user) => !query || user.fullName.toLocaleLowerCase().includes(query) || user.email.toLocaleLowerCase().includes(query));
  }, [search, usersQuery.data?.items]);

  return <>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-bold text-[#06201c]">Users</h2><p className="mt-1 text-sm text-[#52736a]">Browse all platform users.</p></div></div>
    <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><label className="block w-full lg:max-w-sm"><span className="sr-only">Search users</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]" /></label></div>
    <section className="mt-5 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#edf3f0] px-5 py-4"><h3 className="text-base font-bold text-[#06201c]">{usersQuery.isSuccess ? `${usersQuery.data.total} users found` : "Users"}</h3></div>{usersQuery.isLoading ? <div className="px-5 py-16 text-center"><p className="font-bold text-[#06201c]">Loading users...</p></div> : usersQuery.isError ? <div className="px-5 py-16 text-center"><p role="alert" className="font-bold text-[#b42318]">{getErrorMessage(usersQuery.error)}</p><button type="button" onClick={() => void usersQuery.refetch()} className="mt-4 h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white">Retry</button></div> : users.length === 0 ? <div className="px-5 py-16 text-center"><p className="font-bold text-[#06201c]">No users found.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-[#f8fbf9] text-[11px] uppercase tracking-[0.1em] text-[#7f9d94]"><tr><th className="px-4 py-3">Full Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Email Verified</th><th className="px-4 py-3">Super Admin</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Last Login</th></tr></thead><tbody className="divide-y divide-[#edf3f0]">{users.map((user) => <tr key={user.id}><td className="px-4 py-3 font-semibold text-[#06201c]">{user.fullName}</td><td className="px-4 py-3 text-[#52736a]">{user.email}</td><td className="px-4 py-3 capitalize text-[#52736a]">{user.status}</td><td className="px-4 py-3"><BooleanBadge value={user.emailVerified} yes="Verified" no="Unverified" /></td><td className="px-4 py-3"><BooleanBadge value={user.isSuperAdmin} yes="Yes" no="No" /></td><td className="px-4 py-3 text-[#52736a]">{formatDate(user.createdAt)}</td><td className="px-4 py-3 text-[#52736a]">{formatDate(user.lastLoginAt)}</td></tr>)}</tbody></table></div>}</section>
  </>;
}

/** Renders the read-only dedicated Super Admin global users workspace. */
export default function PlatformUsersScreen() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return <QueryClientProvider client={client}><UsersTable /></QueryClientProvider>;
}
