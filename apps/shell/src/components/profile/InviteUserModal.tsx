"use client";

import { useEffect, useState, type FormEvent } from "react";

import { getInviteRoles, inviteUser, type InviteRole } from "@/services/auth.service";

type InviteUserModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

function formatRoleSlug(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  try {
    const payload = JSON.parse(error.message) as { detail?: unknown; message?: unknown };
    const message = typeof payload.message === "string" ? payload.message : null;
    const detail = typeof payload.detail === "string"
      ? payload.detail
      : Array.isArray(payload.detail)
        ? payload.detail
          .map((item) => typeof item === "object" && item !== null && "msg" in item && typeof item.msg === "string" ? item.msg : null)
          .filter((item): item is string => Boolean(item))
          .join(", ")
        : null;

    return detail || message || fallback;
  } catch {
    return error.message;
  }
}

export default function InviteUserModal({ onClose, onSuccess }: InviteUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [roles, setRoles] = useState<InviteRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    void getInviteRoles()
      .then((nextRoles) => {
        if (!isActive) {
          return;
        }

        setRoles(nextRoles);
      })
      .catch((error) => {
        if (isActive) {
          setRolesError(getApiErrorMessage(error, "Unable to load invitation roles."));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingRoles(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !roleSlug) {
      setSubmitError("Enter a name, email, and role to send an invitation.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await inviteUser({ full_name: trimmedName, email: trimmedEmail, role_slug: roleSlug });
      onSuccess();
      onClose();
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "Unable to send the invitation. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#06201c]/35 p-0 sm:items-center sm:justify-center sm:p-5" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="invite-user-title" className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="invite-user-title" className="text-lg font-bold text-[#06201c]">Invite User</h2>
            <p className="mt-1 text-sm text-[#52736a]">Invite a member to your organization and assign their access role.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="text-sm font-semibold text-[#52736a] hover:text-[#06201c] disabled:cursor-not-allowed disabled:opacity-60">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-[#16332b]">
            Full Name
            <input value={fullName} onChange={(event) => { setFullName(event.target.value); setSubmitError(null); }} autoComplete="name" className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58]" />
          </label>
          <label className="block text-sm font-semibold text-[#16332b]">
            Email
            <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSubmitError(null); }} autoComplete="email" className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58]" />
          </label>
          <label className="block text-sm font-semibold text-[#16332b]">
            Role
            <select value={roleSlug} onChange={(event) => { setRoleSlug(event.target.value); setSubmitError(null); }} disabled={isLoadingRoles || Boolean(rolesError)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58] disabled:cursor-not-allowed disabled:text-[#8aa19a]">
              <option value="">{isLoadingRoles ? "Loading roles..." : "Select a role"}</option>
              {roles.map((role) => <option key={role.slug} value={role.slug}>{role.name || formatRoleSlug(role.slug)}</option>)}
            </select>
          </label>
          {rolesError ? <p className="text-sm font-medium text-[#b42318]">{rolesError}</p> : null}
          {submitError ? <p className="text-sm font-medium text-[#b42318]">{submitError}</p> : null}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="inline-flex h-10 items-center justify-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#f7fbf8] disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
            <button type="submit" disabled={isSubmitting || isLoadingRoles || Boolean(rolesError)} className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Sending..." : "Send Invitation"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
