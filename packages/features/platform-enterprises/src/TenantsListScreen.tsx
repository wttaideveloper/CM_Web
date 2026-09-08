"use client";

import { useMemo, useState } from "react";

import { PlatformTenantApiError } from "./tenant.service";
import { usePlatformEnterpriseTenants, usePlatformTenant, usePlatformTenantUsers } from "./tenant.queries";
import type { PlatformTenant, PlatformTenantUser } from "./tenant.types";

function formatDate(value: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function errorMessage(error: unknown): string {
  if (error instanceof PlatformTenantApiError && error.status === 401) return "Super Admin authentication is required.";
  if (error instanceof PlatformTenantApiError && error.status === 403) return "You do not have permission to access tenant data.";
  return "Unable to load tenants.";
}

function tenantUsersErrorMessage(error: unknown): string {
  if (error instanceof PlatformTenantApiError && error.status === 401) return "Super Admin authentication is required.";
  if (error instanceof PlatformTenantApiError && error.status === 403) return "You do not have permission to access tenant data.";
  return "Unable to load tenant users.";
}

function StatusBadge({ value }: { value: string }) {
  return <span className="inline-flex rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[11px] font-bold capitalize text-[#16825b]">{value}</span>;
}

function TenantDetailDialog({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const tenantQuery = usePlatformTenant(tenantId);
  return <div role="dialog" aria-modal="true" aria-label="Tenant details" className="fixed inset-0 z-[90] flex justify-end bg-[#06201c]/25" onMouseDown={onClose}>
    <section className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-[#06201c]">Tenant details</h2><button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm font-semibold text-[#1f6a58]">Close</button></div>
      {tenantQuery.isLoading ? <p className="mt-8 text-sm text-[#52736a]">Loading tenant details…</p> : tenantQuery.isError ? <div className="mt-8"><p role="alert" className="font-semibold text-[#b42318]">{errorMessage(tenantQuery.error)}</p><button type="button" onClick={() => void tenantQuery.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div> : tenantQuery.data ? <TenantDetails tenant={tenantQuery.data} /> : null}
    </section>
  </div>;
}

function TenantDetails({ tenant }: { tenant: PlatformTenant }) {
  const fields = [["Tenant", tenant.name], ["Slug", tenant.slug], ["Tenant UUID", tenant.id], ["Plan", tenant.plan], ["Status", tenant.status], ["Created", formatDate(tenant.createdAt)], ["Last activated", formatDate(tenant.lastActivatedAt)]];
  return <dl className="mt-8 divide-y divide-[#edf3f0] rounded-2xl border border-[#e1ebe6]">{fields.map(([label, value]) => <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-3 text-sm"><dt className="font-semibold text-[#52736a]">{label}</dt><dd className="break-words text-[#06201c]">{value}</dd></div>)}</dl>;
}

function TenantUsersDialog({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const usersQuery = usePlatformTenantUsers(tenantId);
  return <div role="dialog" aria-modal="true" aria-label="Tenant users" className="fixed inset-0 z-[90] flex justify-end bg-[#06201c]/25" onMouseDown={onClose}>
    <section className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-[#06201c]">Tenant users</h2><button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm font-semibold text-[#1f6a58]">Close</button></div>
      {usersQuery.isLoading ? <p className="mt-8 text-sm text-[#52736a]">Loading tenant users...</p> : usersQuery.isError ? <div className="mt-8"><p role="alert" className="font-semibold text-[#b42318]">{tenantUsersErrorMessage(usersQuery.error)}</p><button type="button" onClick={() => void usersQuery.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div> : <TenantUsers users={usersQuery.data?.items ?? []} />}
    </section>
  </div>;
}

function TenantUsers({ users }: { users: PlatformTenantUser[] }) {
  if (users.length === 0) return <p className="mt-8 text-sm text-[#52736a]">No users found for this tenant.</p>;
  return <div className="mt-8 overflow-x-auto rounded-2xl border border-[#e1ebe6]"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-[#f8fbf9] text-xs uppercase tracking-wide text-[#7f9d94]"><tr><th className="px-4 py-3 font-bold">Full Name</th><th className="px-4 py-3 font-bold">Email</th><th className="px-4 py-3 font-bold">Role</th><th className="px-4 py-3 font-bold">Membership Status</th><th className="px-4 py-3 font-bold">User Status</th><th className="px-4 py-3 font-bold">Joined</th><th className="px-4 py-3 font-bold">Last Login</th><th className="px-4 py-3 font-bold">Knowledge Roles</th></tr></thead><tbody className="divide-y divide-[#edf3f0]">{users.map((user) => <tr key={user.membershipId}><td className="px-4 py-3 font-semibold text-[#06201c]">{user.fullName}</td><td className="px-4 py-3 text-[#52736a]">{user.email}</td><td className="px-4 py-3 text-[#52736a]">{user.role}</td><td className="px-4 py-3 text-[#52736a]">{user.membershipStatus}</td><td className="px-4 py-3 text-[#52736a]">{user.userStatus}</td><td className="px-4 py-3 text-[#52736a]">{formatDate(user.joinedAt)}</td><td className="px-4 py-3 text-[#52736a]">{formatDate(user.lastLoginAt)}</td><td className="px-4 py-3 text-[#52736a]">{user.knowledgeRoles.length > 0 ? user.knowledgeRoles.join(", ") : "—"}</td></tr>)}</tbody></table></div>;
}

/** Renders dedicated Super Admin tenants with no legacy WebAuth tenant discovery dependency. */
export default function TenantsListScreen() {
  const tenantsQuery = usePlatformEnterpriseTenants();
  const [search, setSearch] = useState("");
  const [detailTenantId, setDetailTenantId] = useState<string | null>(null);
  const [usersTenantId, setUsersTenantId] = useState<string | null>(null);
  const visibleTenants = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (tenantsQuery.data?.items ?? []).filter((tenant) => !query || tenant.name.toLocaleLowerCase().includes(query) || tenant.slug.toLocaleLowerCase().includes(query));
  }, [search, tenantsQuery.data?.items]);

  return <>
    <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><label className="block w-full lg:max-w-sm"><span className="sr-only">Search tenants</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tenants" className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]" /></label></div>
    <section className="mt-5 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#edf3f0] px-5 py-4"><h2 className="text-base font-bold text-[#06201c]">{tenantsQuery.isSuccess ? `${tenantsQuery.data.total} tenants found` : "Tenants"}</h2></div>
      {tenantsQuery.isLoading ? <div className="px-5 py-16 text-center"><p className="font-bold text-[#06201c]">Loading tenants…</p></div> : tenantsQuery.isError ? <div className="px-5 py-16 text-center"><p role="alert" className="font-bold text-[#b42318]">{errorMessage(tenantsQuery.error)}</p><button type="button" onClick={() => void tenantsQuery.refetch()} className="mt-4 h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white">Retry</button></div> : visibleTenants.length === 0 ? <div className="px-5 py-16 text-center"><p className="font-bold text-[#06201c]">No tenants found.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#f8fbf9] text-[11px] uppercase tracking-[0.1em] text-[#7f9d94]"><tr><th className="px-4 py-3">Tenant</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Last activated</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf3f0]">{visibleTenants.map((tenant) => <tr key={tenant.id}><td className="px-4 py-3"><p className="font-semibold text-[#06201c]">{tenant.name}</p><p className="mt-0.5 text-xs text-[#52736a]">{tenant.slug}</p></td><td className="px-4 py-3 capitalize text-[#52736a]">{tenant.plan}</td><td className="px-4 py-3"><StatusBadge value={tenant.status} /></td><td className="px-4 py-3 text-[#52736a]">{formatDate(tenant.createdAt)}</td><td className="px-4 py-3 text-[#52736a]">{formatDate(tenant.lastActivatedAt)}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => setDetailTenantId(tenant.id)} className="mr-3 font-semibold text-[#1f6a58]">View</button><button type="button" onClick={() => setUsersTenantId(tenant.id)} className="font-semibold text-[#1f6a58]">Users</button></td></tr>)}</tbody></table></div>}
    </section>
    {detailTenantId ? <TenantDetailDialog tenantId={detailTenantId} onClose={() => setDetailTenantId(null)} /> : null}
    {usersTenantId ? <TenantUsersDialog tenantId={usersTenantId} onClose={() => setUsersTenantId(null)} /> : null}
  </>;
}
