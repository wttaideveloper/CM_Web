"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { countryDialOptions } from "@/components/auth/register/register.constants";
import {
  getInviteRoles,
  getTenantMe,
  getTenantMemberById,
  getTenantMembers,
  inviteMember,
  getSession,
  AuthServiceError,
  type InviteRoleOption,
  type TenantDetails,
  type TenantMember,
  updateAuthProfile,
} from "@/services/auth.service";

type TabKey = "overview" | "members";

type ProfileFormState = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  preferredLocale: string;
};

type InviteFormState = {
  fullName: string;
  email: string;
  roleSlug: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function humanize(value: string | null | undefined) {
  if (!value) {
    return "Unavailable";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function findCountryOption(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = normalizeText(value);
  return (
    countryDialOptions.find(
      (country) => normalizeText(country.isoCode) === normalized || normalizeText(country.name) === normalized,
    ) ?? null
  );
}

function resolveCountrySelectValue(value: string | null | undefined) {
  return findCountryOption(value)?.isoCode ?? "";
}

function resolveCountryLabel(value: string | null | undefined) {
  return findCountryOption(value)?.name ?? value ?? "Unavailable";
}

function getInviteErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof AuthServiceError)) {
    return fallback;
  }

  if (error.status === 401) {
    return "Your session is no longer authorized to invite members. Please sign in again.";
  }

  if (error.status === 403) {
    return "You do not have permission to invite members for this tenant.";
  }

  if (error.status === 409) {
    return "An invite for this member already exists or the member is already part of the tenant.";
  }

  if (error.status === 400 || error.status === 422) {
    return "Please check the invite details and try again.";
  }

  return error.message || fallback;
}

function PageCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#06201c]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[#5f7a71]">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-medium text-[#16332b]">{children}</label>;
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
  disabled = false,
}: {
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: "text" | "email" | "password" | "tel";
  readOnly?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      className={`h-10 w-full rounded-xl border px-3 text-sm text-[#06201c] outline-none transition placeholder:text-[#8aa19a] ${
        readOnly || disabled
          ? "cursor-not-allowed border-[#e1ebe6] bg-[#f7fbf8]"
          : "border-[#d7e5df] bg-[#f7fbf8] focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/10"
      }`}
    />
  );
}

function SelectInput({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/10"
    >
      {children}
    </select>
  );
}

function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#e8f6ee] px-2.5 py-1 text-xs font-semibold text-[#1f6a58]">
      {children}
    </span>
  );
}

function DisabledButton({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      disabled
      className={`inline-flex h-10 items-center justify-center rounded-full border border-dashed border-[#d7e5df] bg-[#f7fbf8] px-4 text-sm font-semibold text-[#8aa19a] ${className}`}
    >
      {children}
    </button>
  );
}

function LoadingBlock() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-40 rounded-full bg-[#edf3f0]" />
      <div className="h-10 rounded-xl bg-[#edf3f0]" />
      <div className="h-10 rounded-xl bg-[#edf3f0]" />
      <div className="h-10 rounded-xl bg-[#edf3f0]" />
    </div>
  );
}

function MemberRow({
  member,
  onViewDetails,
}: {
  member: TenantMember;
  onViewDetails: (membershipId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#06201c]">{member.fullName}</p>
          <p className="text-sm text-[#5f7a71]">{member.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge>{humanize(member.role)}</StatusBadge>
          <StatusBadge>{humanize(member.status)}</StatusBadge>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5f7a71]">
        <span>Joined: {formatDate(member.joinedAt ?? member.createdAt)}</span>
        <button
          type="button"
          onClick={() => onViewDetails(member.membershipId)}
          className="text-sm font-semibold text-[#1f6a58] hover:underline"
        >
          View details
        </button>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#e1ebe6] bg-white shadow-[0_20px_60px_rgba(7,53,45,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#edf3f0] px-5 py-4">
          <h3 className="text-lg font-bold text-[#06201c]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f4faf7]"
            aria-label="Close modal"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function TenantSummary({ tenant }: { tenant: TenantDetails | null }) {
  if (!tenant) {
    return <LoadingBlock />;
  }

  const items = [
    { label: "Organization Name", value: tenant.name },
    { label: "Workspace URL", value: tenant.slug },
    { label: "Industry Type", value: humanize(tenant.industryType) },
    { label: "Company Size", value: humanize(tenant.companySize) },
    { label: "Country", value: humanize(tenant.country) },
    { label: "Plan", value: humanize(tenant.plan) },
    { label: "Status", value: humanize(tenant.status) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">{item.label}</p>
          <p className="mt-2 break-words text-sm font-semibold text-[#06201c]">{item.value || "Unavailable"}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { authenticatedUser, setAuthenticatedUser } = useAuth();
  const currentTenantRole =
    authenticatedUser?.membership?.tenantRole ?? authenticatedUser?.roles?.tenantRole ?? null;
  const currentMembership = authenticatedUser?.membership ?? authenticatedUser?.roles ?? null;

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantError, setTenantError] = useState<string | null>(null);

  const [members, setMembers] = useState<TenantMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [inviteRoles, setInviteRoles] = useState<InviteRoleOption[]>([]);
  const [inviteRolesLoading, setInviteRolesLoading] = useState(true);
  const [inviteRolesError, setInviteRolesError] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    fullName: authenticatedUser?.fullName ?? "",
    email: authenticatedUser?.email ?? "",
    phone: authenticatedUser?.phone ?? "",
    address: authenticatedUser?.address ?? "",
    country: resolveCountrySelectValue(authenticatedUser?.country),
    preferredLocale: authenticatedUser?.preferredLocale ?? "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    fullName: "",
    email: "",
    roleSlug: "",
  });
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [memberDetails, setMemberDetails] = useState<TenantMember | null>(null);
  const [memberDetailsLoading, setMemberDetailsLoading] = useState(false);
  const [memberDetailsError, setMemberDetailsError] = useState<string | null>(null);
  const [memberDetailsRetryId, setMemberDetailsRetryId] = useState<string | null>(null);

  const hasInviteableRoles = useMemo(() => inviteRoles.length > 0, [inviteRoles]);

  const loadTenant = useCallback(async () => {
    let active = true;

    setTenantLoading(true);
    setTenantError(null);

    try {
      const response = await getTenantMe();
      if (active) {
        setTenant(response.data);
      }
    } catch (error) {
      if (active) {
        setTenantError(error instanceof Error ? error.message : "Tenant data could not be loaded.");
      }
    } finally {
      if (active) {
        setTenantLoading(false);
      }
    }

    return () => {
      active = false;
    };
  }, []);

  const loadMembers = useCallback(async () => {
    let active = true;

    setMembersLoading(true);
    setMembersError(null);

    try {
      const response = await getTenantMembers();
      if (active) {
        setMembers(response.data);
      }
    } catch (error) {
      if (active) {
        setMembersError(error instanceof Error ? error.message : "Members could not be loaded.");
      }
    } finally {
      if (active) {
        setMembersLoading(false);
      }
    }

    return () => {
      active = false;
    };
  }, []);

  const loadInviteRoles = useCallback(async () => {
    let active = true;

    setInviteRolesLoading(true);
    setInviteRolesError(null);

    try {
      const response = await getInviteRoles();
      if (active) {
        setInviteRoles(response.data);
      }
    } catch (error) {
      if (active) {
        setInviteRolesError(getInviteErrorMessage(error, "Invite roles could not be loaded."));
      }
    } finally {
      if (active) {
        setInviteRolesLoading(false);
      }
    }

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setProfileForm((current) => {
      const nextCountry =
        resolveCountrySelectValue(authenticatedUser?.country) ||
        resolveCountrySelectValue((authenticatedUser?.membership as { country?: string } | undefined)?.country) ||
        resolveCountrySelectValue(tenant?.country) ||
        current.country;

      return {
        ...current,
        fullName: authenticatedUser?.fullName ?? current.fullName,
        email: authenticatedUser?.email ?? current.email,
        phone: authenticatedUser?.phone ?? current.phone,
        address: authenticatedUser?.address ?? current.address,
        country: nextCountry,
        preferredLocale: authenticatedUser?.preferredLocale ?? current.preferredLocale,
      };
    });
  }, [authenticatedUser]);

  useEffect(() => {
    if (!tenant) {
      return;
    }

    setProfileForm((current) => ({
      ...current,
      country: current.country || resolveCountrySelectValue(tenant.country),
    }));
  }, [tenant]);

  useEffect(() => {
    void loadTenant();
    void loadMembers();
    void loadInviteRoles();
  }, [loadInviteRoles, loadMembers, loadTenant]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (profileSaving) {
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const response = await updateAuthProfile({
        fullName: profileForm.fullName.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
        country: profileForm.country.trim(),
        preferredLocale: profileForm.preferredLocale.trim(),
      });

      const nextUser = response.data
        ? {
            ...response.data,
            fullName: response.data.fullName || profileForm.fullName.trim(),
            phone: response.data.phone ?? profileForm.phone.trim(),
            address: response.data.address ?? profileForm.address.trim(),
            country: response.data.country ?? profileForm.country.trim(),
            preferredLocale: response.data.preferredLocale ?? profileForm.preferredLocale.trim(),
          }
        : authenticatedUser
          ? {
              ...authenticatedUser,
              fullName: profileForm.fullName.trim() || authenticatedUser.fullName,
              phone: profileForm.phone.trim(),
              address: profileForm.address.trim(),
              country: profileForm.country.trim(),
              preferredLocale: profileForm.preferredLocale.trim(),
            }
          : null;

      if (nextUser) {
        setAuthenticatedUser(nextUser);
      }

      setProfileForm({
        fullName: nextUser?.fullName ?? profileForm.fullName.trim(),
        email: nextUser?.email ?? profileForm.email,
        phone: nextUser?.phone ?? profileForm.phone.trim(),
        address: nextUser?.address ?? profileForm.address.trim(),
        country: resolveCountrySelectValue(nextUser?.country ?? profileForm.country),
        preferredLocale: nextUser?.preferredLocale ?? profileForm.preferredLocale.trim(),
      });

      setProfileMessage(response.message ?? "Profile updated successfully.");
    } catch (error) {
      const isNotAuthenticated =
        error instanceof AuthServiceError &&
        (error.status === 401 || error.status === 403) &&
        /not authenticated/i.test(error.message);

      if (isNotAuthenticated) {
        try {
          const session = await getSession();
          if (!session.authenticated || !session.data) {
            router.replace("/auth/login");
            return;
          }
        } catch {
          router.replace("/auth/login");
          return;
        }
      }

      setProfileError(error instanceof Error ? error.message : "Unable to update your profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (inviteSaving || !inviteForm.fullName.trim() || !inviteForm.email.trim() || !inviteForm.roleSlug) {
      return;
    }

    setInviteSaving(true);
    setInviteError(null);
    setInviteMessage(null);

    try {
      const response = await inviteMember({
        full_name: inviteForm.fullName.trim(),
        email: inviteForm.email.trim(),
        role_slug: inviteForm.roleSlug,
      });

      setInviteMessage(response.message ?? "Invitation sent successfully.");
      setInviteForm({ fullName: "", email: "", roleSlug: "" });
      setInviteOpen(false);

      const nextMembers = await getTenantMembers();
      setMembers(nextMembers.data);
    } catch (error) {
      setInviteError(getInviteErrorMessage(error, "Unable to send invite."));
    } finally {
      setInviteSaving(false);
    }
  }

  async function handleViewMemberDetails(membershipId: string) {
    setMemberDetails(null);
    setMemberDetailsError(null);
    setMemberDetailsRetryId(membershipId);
    setMemberDetailsLoading(true);

    try {
      const response = await getTenantMemberById(membershipId);
      setMemberDetails(response.data);
    } catch (error) {
      setMemberDetailsError(error instanceof Error ? error.message : "Unable to load member details.");
    } finally {
      setMemberDetailsLoading(false);
    }
  }

  const tenantPlan = tenant?.plan ? humanize(tenant.plan) : "Unavailable";
  const tenantStatus = tenant?.status ? humanize(tenant.status) : "Unavailable";

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-72px)] bg-[#f7fbf8] px-6 py-6">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
                Enterprise Owner - Settings
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#06201c]">Enterprise Settings</h1>
              <p className="mt-1 text-sm text-[#5f7a71]">
                Manage the real tenant record, your owner profile, and members in one place.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {tenant ? <StatusBadge>{tenantPlan}</StatusBadge> : null}
              {tenant ? <StatusBadge>{tenantStatus}</StatusBadge> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-sm">
            {[
              { key: "overview" as const, label: "Overview" },
              { key: "members" as const, label: "Members" },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    setProfileMessage(null);
                    setProfileError(null);
                    setInviteMessage(null);
                    setInviteError(null);
                  }}
                  className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
                    active ? "bg-[#e9f4ee] text-[#0f5d4a]" : "text-[#52736a] hover:bg-[#f4faf7]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "overview" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
              <div className="space-y-6">
                <PageCard title="Tenant Details" description="Read-only organization data from your live tenant record.">
                  {tenantLoading ? (
                    <LoadingBlock />
                  ) : tenantError ? (
                    <div className="space-y-3 rounded-xl border border-[#fecdca] bg-[#fff6f6] px-4 py-3 text-sm text-[#b42318]">
                      <p>{tenantError}</p>
                      <button
                        type="button"
                        onClick={() => void loadTenant()}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-[#f5c2bd] bg-white px-4 text-xs font-semibold text-[#b42318] transition hover:bg-[#fff0ef]"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <TenantSummary tenant={tenant} />
                      <div className="rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-4 py-3 text-sm text-[#52736a]">
                        Organization editing is not available yet.
                      </div>
                    </div>
                  )}
                </PageCard>

                <PageCard
                  title="Owner Profile"
                  description="Update your profile information without leaving settings."
                  action={<StatusBadge>{currentTenantRole ? humanize(currentTenantRole) : "Owner"}</StatusBadge>}
                >
                  <form className="space-y-4" onSubmit={handleProfileSubmit}>
                    {profileMessage ? (
                      <div className="rounded-xl border border-[#d1f4dc] bg-[#f3fbf5] px-4 py-3 text-sm text-[#1f6a58]">
                        {profileMessage}
                      </div>
                    ) : null}

                    {profileError ? (
                      <div className="rounded-xl border border-[#fecdca] bg-[#fff6f6] px-4 py-3 text-sm text-[#b42318]">
                        {profileError}
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <TextInput
                          value={profileForm.fullName}
                          onChange={(event) =>
                            setProfileForm((current) => ({ ...current, fullName: event.target.value }))
                          }
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <TextInput value={profileForm.email} readOnly />
                      </div>

                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <TextInput
                          value={profileForm.phone}
                          onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
                          placeholder="Enter phone number"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Country</Label>
                        <SelectInput
                          value={profileForm.country}
                          onChange={(event) =>
                            setProfileForm((current) => ({ ...current, country: event.target.value }))
                          }
                        >
                          <option value="">Select your country</option>
                          {countryDialOptions.map((country) => (
                            <option key={country.isoCode} value={country.isoCode}>
                              {country.name}
                            </option>
                          ))}
                        </SelectInput>
                      </div>

                      <div className="space-y-2">
                        <Label>Preferred Language</Label>
                        <TextInput
                          value={profileForm.preferredLocale}
                          onChange={(event) =>
                            setProfileForm((current) => ({ ...current, preferredLocale: event.target.value }))
                          }
                          placeholder="e.g. English"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Address</Label>
                        <TextInput
                          value={profileForm.address}
                          onChange={(event) => setProfileForm((current) => ({ ...current, address: event.target.value }))}
                          placeholder="Enter your address"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:bg-[#8fb5aa]"
                      >
                        {profileSaving ? "Saving..." : "Save Profile"}
                      </button>
                      <p className="text-sm text-[#5f7a71]">
                        Email stays read-only and the profile updates persist immediately.
                      </p>
                    </div>
                  </form>
                </PageCard>

                <PageCard title="Membership Details" description="Your current owner membership comes from session data.">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">Role</p>
                      <p className="mt-2 text-sm font-semibold text-[#06201c]">
                        {humanize(currentMembership?.tenantRole ?? currentMembership?.userRole ?? currentTenantRole)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">Tenant Name</p>
                      <p className="mt-2 text-sm font-semibold text-[#06201c]">
                        {currentMembership?.tenantName ?? tenant?.name ?? "Unavailable"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">Tenant Slug</p>
                      <p className="mt-2 text-sm font-semibold text-[#06201c]">
                        {currentMembership?.tenantSlug ?? tenant?.slug ?? "Unavailable"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">Can Invite Users</p>
                      <p className="mt-2 text-sm font-semibold text-[#06201c]">
                        {String(
                          Boolean(
                            currentMembership?.canInviteUsers ??
                              currentMembership?.tenantPermissions?.includes("invite_users") ??
                              currentMembership?.tenantPermissions?.includes("members:invite") ??
                              currentTenantRole === "tenant_owner",
                          ),
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4 md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">Permissions</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(currentMembership?.tenantPermissions ?? []).length > 0 ? (
                          currentMembership?.tenantPermissions?.map((permission) => (
                            <StatusBadge key={permission}>{permission}</StatusBadge>
                          ))
                        ) : (
                          <span className="text-sm font-medium text-[#52736a]">No explicit permissions returned.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </PageCard>

                <PageCard title="Billing" description="Your live subscription snapshot from the tenant record.">
                  <div className="space-y-4">
                    <div className="rounded-xl border border-[#d8e4df] bg-[#f7fbf9] p-4">
                      <p className="text-sm font-semibold text-[#06201c]">{tenantPlan}</p>
                      <p className="mt-1 text-sm text-[#52736a]">
                        Billing details are linked to the active tenant plan. No fake pricing or renewal date is shown.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <DisabledButton>Upgrade Plan</DisabledButton>
                      <DisabledButton>Download Invoice</DisabledButton>
                    </div>
                  </div>
                </PageCard>

                <PageCard title="Account Security" description="Password changes are not handled from this screen yet.">
                  <div className="space-y-4">
                    <div className="rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-4 py-3 text-sm text-[#52736a]">
                      Current Password and New Password fields are intentionally hidden.
                    </div>
                    <DisabledButton className="w-full">Reset password</DisabledButton>
                  </div>
                </PageCard>

                <PageCard title="Notifications" description="Notification preferences are displayed, but editing is coming soon.">
                  <div className="space-y-3">
                    <div className="rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-4 py-3 text-sm text-[#52736a]">
                      Notification preferences coming soon.
                    </div>
                    {[
                      "New bookings",
                      "Customer reviews",
                      "Payment confirmations",
                      "Platform announcements",
                      "Marketing tips",
                    ].map((label) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-xl border border-[#e6efea] bg-[#fbfdfc] px-4 py-3"
                      >
                        <span className="text-sm font-medium text-[#16332b]">{label}</span>
                        <button
                          type="button"
                          disabled
                          className="relative inline-flex h-6 w-11 cursor-not-allowed items-center rounded-full bg-[#d7dfdb]"
                        >
                          <span className="inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                </PageCard>

                <PageCard title="Business Description" description="This section is intentionally not editable yet.">
                  <div className="space-y-2">
                    <Label>Organization Description</Label>
                    <textarea
                      disabled
                      value="Not available yet"
                      className="h-28 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 py-2.5 text-sm text-[#8aa19a] outline-none"
                    />
                    <p className="text-sm text-[#52736a]">Not available yet.</p>
                  </div>
                </PageCard>
              </div>

              <div className="space-y-6">
                <PageCard title="Organization Snapshot" description="A quick read-only summary from the tenant service.">
                  {tenantLoading ? (
                    <LoadingBlock />
                  ) : tenantError ? (
                    <div className="space-y-3 rounded-xl border border-[#fecdca] bg-[#fff6f6] px-4 py-3 text-sm text-[#b42318]">
                      <p>{tenantError}</p>
                      <button
                        type="button"
                        onClick={() => void loadTenant()}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-[#f5c2bd] bg-white px-4 text-xs font-semibold text-[#b42318] transition hover:bg-[#fff0ef]"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">
                          Organization Name
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#06201c]">{tenant?.name || "Unavailable"}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">Workspace URL</p>
                          <p className="mt-2 text-sm font-semibold text-[#06201c]">{tenant?.slug || "Unavailable"}</p>
                        </div>
                        <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">Status</p>
                          <p className="mt-2 text-sm font-semibold text-[#06201c]">{tenantStatus}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-4 py-3 text-sm text-[#52736a]">
                        Organization editing is not available yet.
                      </div>
                    </div>
                  )}
                </PageCard>

                <PageCard
                  title="Members"
                  description="View your team, invite new members, and inspect membership details."
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setInviteError(null);
                        setInviteMessage(null);
                        setInviteOpen(true);
                      }}
                      disabled={inviteRolesLoading || !!inviteRolesError || !hasInviteableRoles}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-semibold text-white transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:bg-[#8fb5aa]"
                    >
                      Invite Member
                    </button>
                  }
                >
                  {membersLoading ? (
                    <LoadingBlock />
                  ) : membersError ? (
                    <div className="space-y-3 rounded-xl border border-[#fecdca] bg-[#fff6f6] px-4 py-3 text-sm text-[#b42318]">
                      <p>{membersError}</p>
                      <button
                        type="button"
                        onClick={() => void loadMembers()}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-[#f5c2bd] bg-white px-4 text-xs font-semibold text-[#b42318] transition hover:bg-[#fff0ef]"
                      >
                        Retry
                      </button>
                    </div>
                  ) : members.length > 0 ? (
                    <div className="space-y-3">
                      {members.map((member) => (
                        <MemberRow key={member.membershipId} member={member} onViewDetails={handleViewMemberDetails} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#d7e5df] bg-[#fbfdfc] px-4 py-8 text-center text-sm text-[#52736a]">
                      No members found yet.
                    </div>
                  )}

                  <div className="mt-4 rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-4 py-3 text-sm text-[#52736a]">
                    {inviteRolesLoading ? (
                      "Loading invite roles..."
                    ) : inviteRolesError ? (
                      <div className="space-y-3">
                        <p className="text-[#b42318]">{inviteRolesError}</p>
                        <button
                          type="button"
                          onClick={() => void loadInviteRoles()}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-[#d7e5df] bg-white px-4 text-xs font-semibold text-[#1f6a58] transition hover:bg-[#f7fbf8]"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      "Invite members using the roles returned by the live invite-role endpoint."
                    )}
                  </div>
                </PageCard>
              </div>
            </div>
          ) : (
            <PageCard
              title="Members"
              description="View team members and send invitations using the live tenant APIs."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setInviteError(null);
                    setInviteMessage(null);
                    setInviteOpen(true);
                  }}
                  disabled={inviteRolesLoading || !!inviteRolesError || !hasInviteableRoles}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-semibold text-white transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:bg-[#8fb5aa]"
                >
                  Invite Member
                </button>
              }
            >
              {membersLoading ? (
                <LoadingBlock />
              ) : membersError ? (
                <div className="space-y-3 rounded-xl border border-[#fecdca] bg-[#fff6f6] px-4 py-3 text-sm text-[#b42318]">
                  <p>{membersError}</p>
                  <button
                    type="button"
                    onClick={() => void loadMembers()}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-[#f5c2bd] bg-white px-4 text-xs font-semibold text-[#b42318] transition hover:bg-[#fff0ef]"
                  >
                    Retry
                  </button>
                </div>
              ) : members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member) => (
                    <MemberRow key={member.membershipId} member={member} onViewDetails={handleViewMemberDetails} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#d7e5df] bg-[#fbfdfc] px-4 py-8 text-center text-sm text-[#52736a]">
                  No members found yet.
                </div>
              )}
              <div className="mt-4 rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-4 py-3 text-sm text-[#52736a]">
                {inviteRolesLoading ? (
                  "Loading invite roles..."
                ) : inviteRolesError ? (
                  <div className="space-y-3">
                    <p className="text-[#b42318]">{inviteRolesError}</p>
                    <button
                      type="button"
                      onClick={() => void loadInviteRoles()}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-[#d7e5df] bg-white px-4 text-xs font-semibold text-[#1f6a58] transition hover:bg-[#f7fbf8]"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  "Invite roles are loaded from the backend and filtered by your tenant role."
                )}
              </div>
            </PageCard>
          )}

          {inviteMessage ? (
            <div className="rounded-xl border border-[#d1f4dc] bg-[#f3fbf5] px-4 py-3 text-sm text-[#1f6a58]">
              {inviteMessage}
            </div>
          ) : null}
        </div>
      </div>

      {inviteOpen ? (
        <Modal title="Invite Member" onClose={() => setInviteOpen(false)}>
          <form className="space-y-4" onSubmit={handleInviteSubmit}>
            {inviteError ? (
              <div className="space-y-3 rounded-xl border border-[#fecdca] bg-[#fff6f6] px-4 py-3 text-sm text-[#b42318]">
                <p>{inviteError}</p>
                <button
                  type="button"
                  onClick={() => void loadInviteRoles()}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-[#f5c2bd] bg-white px-4 text-xs font-semibold text-[#b42318] transition hover:bg-[#fff0ef]"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {inviteRolesError ? (
              <div className="space-y-3 rounded-xl border border-[#fecdca] bg-[#fff6f6] px-4 py-3 text-sm text-[#b42318]">
                <p>{inviteRolesError}</p>
                <button
                  type="button"
                  onClick={() => void loadInviteRoles()}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-[#f5c2bd] bg-white px-4 text-xs font-semibold text-[#b42318] transition hover:bg-[#fff0ef]"
                >
                  Retry
                </button>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Full Name</Label>
              <TextInput
                value={inviteForm.fullName}
                onChange={(event) => setInviteForm((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="Enter full name"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <TextInput
                value={inviteForm.email}
                onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="Enter email address"
                type="email"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <SelectInput
                value={inviteForm.roleSlug}
                onChange={(event) => setInviteForm((current) => ({ ...current, roleSlug: event.target.value }))}
              >
                <option value="">{inviteRolesLoading ? "Loading roles..." : "Select role"}</option>
                {inviteRoles.map((role) => {
                  return (
                    <option key={role.slug || role.name} value={role.slug}>
                      {role.name}
                    </option>
                  );
                })}
              </SelectInput>
              <p className="text-xs text-[#5f7a71]">
                Select any role returned by the backend invite-role endpoint.
              </p>
              {!hasInviteableRoles ? (
                <p className="text-xs font-medium text-[#8a5b00]">
                  No inviteable roles are available for your access level.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#d7e5df] bg-white px-4 text-sm font-semibold text-[#06201c] transition hover:bg-[#f7fbf8]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteSaving}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-semibold text-white transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:bg-[#8fb5aa]"
              >
                {inviteSaving ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {memberDetails || memberDetailsLoading || memberDetailsError ? (
        <Modal
          title={memberDetails ? `${memberDetails.fullName} - Membership Details` : "Membership Details"}
          onClose={() => {
            setMemberDetails(null);
            setMemberDetailsLoading(false);
            setMemberDetailsError(null);
            setMemberDetailsRetryId(null);
          }}
        >
          {memberDetailsLoading ? (
            <LoadingBlock />
          ) : memberDetailsError ? (
            <div className="space-y-3 rounded-xl border border-[#fecdca] bg-[#fff6f6] px-4 py-3 text-sm text-[#b42318]">
              <p>{memberDetailsError}</p>
              {memberDetailsRetryId ? (
                <button
                  type="button"
                  onClick={() => void handleViewMemberDetails(memberDetailsRetryId)}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-[#f5c2bd] bg-white px-4 text-xs font-semibold text-[#b42318] transition hover:bg-[#fff0ef]"
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : memberDetails ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">Full Name</p>
                  <p className="mt-2 text-sm font-semibold text-[#06201c]">{memberDetails.fullName}</p>
                </div>
                <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">Email</p>
                  <p className="mt-2 text-sm font-semibold text-[#06201c]">{memberDetails.email}</p>
                </div>
                <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">Role</p>
                  <p className="mt-2 text-sm font-semibold text-[#06201c]">{humanize(memberDetails.role)}</p>
                </div>
                <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">Status</p>
                  <p className="mt-2 text-sm font-semibold text-[#06201c]">{humanize(memberDetails.status)}</p>
                </div>
                <div className="rounded-xl border border-[#e6efea] bg-[#fbfdfc] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa19a]">Joined</p>
                  <p className="mt-2 text-sm font-semibold text-[#06201c]">
                    {formatDate(memberDetails.joinedAt ?? memberDetails.createdAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-4 py-3 text-sm text-[#52736a]">
                Mutating member actions are listed below but disabled until their request bodies are documented.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DisabledButton>Change role - Coming soon</DisabledButton>
                <DisabledButton>Update profile - Coming soon</DisabledButton>
                <DisabledButton>Activate - Coming soon</DisabledButton>
                <DisabledButton>Archive - Coming soon</DisabledButton>
                <DisabledButton>Soft delete - Coming soon</DisabledButton>
                <DisabledButton>Delete - Coming soon</DisabledButton>
              </div>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </AppShell>
  );
}
