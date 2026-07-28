"use client";

import { useEffect, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import ProfileEditModal from "@/components/profile/ProfileEditModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAuthMe,
  type AuthUser,
} from "@/services/auth.service";

function emptyToNotProvided(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

function getInitials(name: string, email: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || email.trim().slice(0, 2).toUpperCase() || "IH";
}

function formatRole(role: string | null | undefined) {
  if (!role?.trim()) {
    return "Not provided";
  }

  return role
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getApiErrorMessage(error: unknown) {
  if (!(error instanceof Error) || !error.message) {
    return "We could not update your profile. Please try again.";
  }

  try {
    const payload = JSON.parse(error.message) as { detail?: string; message?: string };
    return payload.detail || payload.message || "We could not update your profile. Please try again.";
  } catch {
    return error.message;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-[#edf3f0] py-3 last:border-b-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7f9d94]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#16332b]">{value}</p>
    </div>
  );
}

export default function AdminProfilePage() {
  const { user: sessionUser, updateUser } = useAuth();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await getAuthMe();
        if (!isActive) {
          return;
        }

        setProfile(response.data);
        updateUser(response.data);
      } catch (error) {
        if (isActive) {
          setLoadError(getApiErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [updateUser]);

  const displayedProfile = profile ?? sessionUser;
  const membership = displayedProfile?.membership;
  const role = membership?.tenantRole ?? displayedProfile?.roles?.tenantRole;
  const tenantName = membership?.tenantName ?? displayedProfile?.roles?.tenantName;
  const email = displayedProfile?.email ?? "";
  const fullName = displayedProfile?.fullName ?? "";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">ENTERPRISE OWNER</p>
          <h1 className="mt-1 text-2xl font-bold text-[#06201c]">My Profile</h1>
          <p className="mt-1 text-sm text-[#5f7a71]">Manage your personal account information</p>
        </div>

        {isLoading ? (
          <div className="space-y-5" aria-label="Loading profile">
            <div className="h-36 animate-pulse rounded-2xl border border-[#e1ebe6] bg-[#f7fbf8]" />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="h-72 animate-pulse rounded-2xl border border-[#e1ebe6] bg-[#f7fbf8]" />
              <div className="h-72 animate-pulse rounded-2xl border border-[#e1ebe6] bg-[#f7fbf8]" />
            </div>
          </div>
        ) : loadError ? (
          <section className="rounded-2xl border border-[#f3c5bf] bg-[#fff7f6] p-5 text-sm text-[#b42318]">
            <p className="font-bold">Unable to load your profile</p>
            <p className="mt-1">{loadError}</p>
          </section>
        ) : displayedProfile ? (
          <>
            {successMessage ? (
              <div className="rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-medium text-[#167550]" role="status">
                {successMessage}
              </div>
            ) : null}

            <section className="flex flex-col gap-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e8f6ee] text-lg font-bold text-[#1f6a58]">
                  {getInitials(fullName, email)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-[#06201c]">{emptyToNotProvided(fullName)}</h2>
                  <p className="mt-0.5 truncate text-sm text-[#52736a]">{emptyToNotProvided(email)}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#1f6a58]">{formatRole(role)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage(null);
                  setIsEditing(true);
                }}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646]"
              >
                Edit Profile
              </button>
            </section>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-[#06201c]">Personal Information</h2>
                <div className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  <DetailRow label="Full Name" value={emptyToNotProvided(fullName)} />
                  <DetailRow label="Phone" value={emptyToNotProvided(displayedProfile.phone)} />
                  <DetailRow label="Email" value={emptyToNotProvided(email)} />
                  <DetailRow label="Country" value={emptyToNotProvided(displayedProfile.country)} />
                  <DetailRow label="Address" value={emptyToNotProvided(displayedProfile.address)} />
                  <DetailRow label="Preferred Language" value={emptyToNotProvided(displayedProfile.preferredLocale)} />
                </div>
              </section>

              <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-[#06201c]">Organization &amp; Account</h2>
                <div className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  <DetailRow label="Organization" value={emptyToNotProvided(tenantName)} />
                  <DetailRow label="Role" value={formatRole(role)} />
                  <DetailRow label="Email Verified" value={displayedProfile.emailVerified ? "Yes" : "No"} />
                  <DetailRow label="User ID" value={emptyToNotProvided(displayedProfile.userId ?? displayedProfile.id)} />
                </div>
              </section>
            </div>
          </>
        ) : null}
      </div>

      {isEditing && displayedProfile ? (
        <ProfileEditModal
          user={displayedProfile}
          onClose={() => setIsEditing(false)}
          onProfileUpdated={(nextUser) => {
            setProfile(nextUser);
            setSuccessMessage("Profile updated successfully.");
          }}
        />
      ) : null}
    </AppShell>
  );
}
