"use client";

import { useState } from "react";

import AppShell from "@/components/layout/AppShell";
import InviteUserModal from "@/components/profile/InviteUserModal";
import ProfileEditModal from "@/components/profile/ProfileEditModal";
import PasswordResetModal from "@/components/profile/PasswordResetModal";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

function emptyToNotProvided(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

function formatValue(value: string | null | undefined) {
  if (!value?.trim()) {
    return "Not provided";
  }

  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-[#edf3f0] py-3 last:border-b-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7f9d94]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#16332b]">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-[#06201c]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { tenant, isLoadingTenant, tenantError } = useTenant();
  const [isEditing, setIsEditing] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const tenantRole = user?.membership?.tenantRole ?? user?.roles?.tenantRole;
  const canInviteUsers = user?.membership?.canInviteUsers ?? user?.roles?.canInviteUsers;
  const canManageInvitations =
    (tenantRole === "tenant_owner" || tenantRole === "tenant_admin") && canInviteUsers !== false;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">ENTERPRISE OWNER</p>
          <h1 className="mt-1 text-2xl font-bold text-[#06201c]">Enterprise Settings</h1>
          <p className="mt-1 text-sm text-[#5f7a71]">Manage your account and organization settings</p>
        </div>

        {profileSuccess ? (
          <div className="rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-medium text-[#167550]" role="status">
            {profileSuccess}
          </div>
        ) : null}
        {passwordSuccess ? (
          <div className="rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-medium text-[#167550]" role="status">
            {passwordSuccess}
          </div>
        ) : null}
        {inviteSuccess ? (
          <div className="rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-medium text-[#167550]" role="status">
            {inviteSuccess}
          </div>
        ) : null}

        <div className={`grid grid-cols-1 gap-5 ${canManageInvitations ? "xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]" : ""}`}>
          <Card title="Personal Information">
            {user ? (
              <>
                <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  <DetailRow label="Full Name" value={emptyToNotProvided(user.fullName)} />
                  <DetailRow label="Phone" value={emptyToNotProvided(user.phone)} />
                  <DetailRow label="Email" value={emptyToNotProvided(user.email)} />
                  <DetailRow label="Country" value={emptyToNotProvided(user.country)} />
                  <DetailRow label="Address" value={emptyToNotProvided(user.address)} />
                  <DetailRow label="Preferred Language" value={emptyToNotProvided(user.preferredLocale)} />
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileSuccess(null);
                      setIsEditing(true);
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646]"
                  >
                    Edit Profile
                  </button>
                </div>
              </>
            ) : (
              <p className="py-2 text-sm text-[#52736a]">Loading personal information...</p>
            )}
          </Card>

          {canManageInvitations ? (
            <Card title="Team &amp; Invitations">
              <div className="space-y-4">
                <p className="text-sm text-[#52736a]">
                  {tenantRole === "tenant_owner"
                    ? "Invite administrators and team members."
                    : "Invite team members to your organization."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setInviteSuccess(null);
                    setIsInviting(true);
                  }}
                  className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646]"
                >
                  Invite User
                </button>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="Subscription &amp; Billing">
            {isLoadingTenant ? (
              <p className="py-2 text-sm text-[#52736a]">Loading subscription information...</p>
            ) : tenantError ? (
              <p className="py-2 text-sm text-[#b42318]">Unable to load subscription information: {tenantError}</p>
            ) : tenant ? (
              <div className="space-y-4">
                <div>
                  <DetailRow label="Current Plan" value={formatValue(tenant.plan)} />
                  <DetailRow label="Subscription Status" value={formatValue(tenant.status)} />
                  <DetailRow label="Organization" value={emptyToNotProvided(tenant.name)} />
                </div>
                <p className="text-xs text-[#7f9d94]">Billing actions will be available soon.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-10 flex-1 cursor-not-allowed items-center justify-center rounded-full bg-[#e8f6ee] px-4 text-sm font-semibold text-[#7f9d94] opacity-70"
                  >
                    Upgrade Plan
                  </button>
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-10 flex-1 cursor-not-allowed items-center justify-center rounded-full border border-[#d7e5df] bg-white px-4 text-sm font-semibold text-[#7f9d94] opacity-70"
                  >
                    Download Invoice
                  </button>
                </div>
              </div>
            ) : (
              <p className="py-2 text-sm text-[#52736a]">Subscription information is not available.</p>
            )}
          </Card>

          <Card title="Account Security">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#16332b]">Password</p>
                <p className="mt-1 text-sm text-[#52736a]">Reset your account password securely using email verification.</p>
              </div>
              <button
                type="button"
                disabled={!user}
                onClick={() => {
                  setPasswordSuccess(null);
                  setIsResettingPassword(true);
                }}
                className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset Password
              </button>
            </div>
          </Card>
        </div>
      </div>

      {isEditing && user ? (
        <ProfileEditModal
          user={user}
          onClose={() => setIsEditing(false)}
          onProfileUpdated={() => setProfileSuccess("Profile updated successfully.")}
        />
      ) : null}
      {isResettingPassword && user ? (
        <PasswordResetModal
          email={user.email}
          onClose={() => setIsResettingPassword(false)}
          onSuccess={() => setPasswordSuccess("Password updated successfully.")}
        />
      ) : null}
      {isInviting ? (
        <InviteUserModal
          onClose={() => setIsInviting(false)}
          onSuccess={() => setInviteSuccess("Invitation sent successfully.")}
        />
      ) : null}
    </AppShell>
  );
}
