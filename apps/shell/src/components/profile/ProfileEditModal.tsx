"use client";

import { useState, type FormEvent } from "react";

import { useAuth } from "@/contexts/AuthContext";
import {
  getAuthMe,
  updateAuthProfile,
  type AuthUser,
  type UpdateAuthProfilePayload,
} from "@/services/auth.service";

type ProfileEditModalProps = {
  user: AuthUser;
  onClose: () => void;
  onProfileUpdated: (user: AuthUser) => void;
};

function getProfileForm(user: AuthUser): UpdateAuthProfilePayload {
  return {
    fullName: user.fullName ?? "",
    phone: user.phone ?? "",
    address: user.address ?? "",
    country: user.country ?? "",
    preferredLocale: user.preferredLocale ?? "",
  };
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

export default function ProfileEditModal({ user, onClose, onProfileUpdated }: ProfileEditModalProps) {
  const { updateUser } = useAuth();
  const [form, setForm] = useState<UpdateAuthProfilePayload>(() => getProfileForm(user));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      await updateAuthProfile(form);
      const response = await getAuthMe();
      updateUser(response.data);
      onProfileUpdated(response.data);
      onClose();
    } catch (error) {
      setSaveError(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#06201c]/35 p-0 sm:items-center sm:justify-center sm:p-5" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="edit-profile-title" className="text-lg font-bold text-[#06201c]">Edit Profile</h2>
            <p className="mt-1 text-sm text-[#52736a]">Update your personal account information.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[#52736a] hover:text-[#06201c]"
            disabled={isSaving}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ["Full Name", "fullName", "text"],
              ["Phone", "phone", "tel"],
              ["Country", "country", "text"],
              ["Preferred Language", "preferredLocale", "text"],
            ].map(([label, key, type]) => (
              <label key={key} className="block text-sm font-semibold text-[#16332b]">
                {label}
                <input
                  type={type}
                  value={form[key as keyof UpdateAuthProfilePayload]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58]"
                />
              </label>
            ))}
          </div>

          <label className="block text-sm font-semibold text-[#16332b]">
            Address
            <textarea
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              className="mt-1.5 min-h-24 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 py-2.5 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58]"
            />
          </label>

          {saveError ? <p className="text-sm font-medium text-[#b42318]">{saveError}</p> : null}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#f7fbf8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
