"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  getProfileDisplayName,
  getSuperAdminProfile,
  superAdminProfileQueryKey,
} from "@/lib/super-admin-profile";
import { PlatformPasswordSettings } from "./PlatformPasswordSettings";

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#edf3f0] py-3 last:border-b-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7f9d94]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#16332b]">{value}</p>
    </div>
  );
}

function ProfileEditor({ initialFullName, initialEmail }: { initialFullName: string; initialEmail: string }) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [showContract, setShowContract] = useState(false);

  const suggestedContract = {
    method: "PATCH",
    path: "/api/v1/auth/me",
    request: { fullName: "string (optional)", email: "string (optional)" },
    response: { status: 200, body: { data: { id: "uuid", email: "string", fullName: "string", emailVerified: true } } },
  };

  const curlExample = `curl -X PATCH "https://<SUPER_ADMIN_API>/api/v1/auth/me" \\n  -H "Authorization: Bearer <access-token>" \\n  -H "Content-Type: application/json" \\n  -d '${JSON.stringify({ fullName: "New Name", email: "new@example.com" })}'`;

  function handleCancel() {
    setEditing(false);
    setFullName(initialFullName);
    setEmail(initialEmail);
    setMessage(null);
    setShowContract(false);
  }

  function handleSave() {
    // Upstream does not currently support profile updates per dedicated Swagger.
    // Instead show the suggested backend contract and cURL so backend can implement it.
    setMessage("Profile updates are not supported by the Super Admin API. Share the suggested contract with the backend team to enable this feature.");
    setShowContract(true);
    setEditing(false);
  }

  return (
    <div className="mt-3">
      {!editing ? (
        <>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <AccountDetail label="Full Name" value={fullName || "Not provided"} />
            <AccountDetail label="Email" value={email || "Not provided"} />
            {/* Other read-only fields are rendered by the outer component */}
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setEditing(true)} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white">
              Edit
            </button>
            <button type="button" onClick={() => { setMessage("Request change: please contact the backend team to update this profile."); setShowContract(true); }} className="h-10 rounded-full border border-[#c9ddd7] px-5 text-sm font-semibold text-[#16332b]">
              Request change
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-3">
          <label className="block text-sm font-semibold text-[#16332b]">
            Full name
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm" />
          </label>
          <label className="block text-sm font-semibold text-[#16332b]">
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm" />
          </label>
          <div className="flex gap-3">
            <button type="submit" className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white">Save</button>
            <button type="button" onClick={handleCancel} className="h-10 rounded-full border border-[#c9ddd7] px-5 text-sm font-semibold text-[#16332b]">Cancel</button>
          </div>
        </form>
      )}

      {message ? <p role="alert" className="mt-3 text-sm text-[#52736a]">{message}</p> : null}

      {showContract ? (
        <div className="mt-4 rounded-md border border-[#e6efe9] bg-[#fbfffb] p-4">
          <p className="text-sm font-semibold text-[#16332b]">Suggested backend contract</p>
          <pre className="mt-2 max-w-full overflow-auto bg-white p-3 text-xs">{JSON.stringify(suggestedContract, null, 2)}</pre>
          <p className="mt-2 text-sm text-[#52736a]">cURL example:</p>
          <pre className="mt-2 max-w-full overflow-auto bg-white p-3 text-xs">{curlExample}</pre>
        </div>
      ) : null}
    </div>
  );
}

/** Displays the authenticated Super Admin identity for Profile and Account Settings routes. */
export function PlatformAccountScreen({ title, showPasswordSettings = false }: { title: string; showPasswordSettings?: boolean }) {
  const profileQuery = useQuery({
    queryKey: superAdminProfileQueryKey,
    queryFn: getSuperAdminProfile,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
  const profile = profileQuery.data;

  return (
    <section className="mx-auto w-full max-w-4xl">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">SUPER ADMIN ACCOUNT</p>
      <h1 className="mt-2 text-3xl font-bold text-[#06201c]">{title}</h1>
      <p className="mt-2 text-sm text-[#52736a]">{showPasswordSettings ? "Manage your account security and view your Super Admin account information." : "View your Super Admin account information."}</p>

      {profileQuery.isLoading ? (
        <div className="mt-6 animate-pulse rounded-2xl border border-[#e1ebe6] bg-white p-6" role="status" aria-label="Loading account information">
          <div className="h-5 w-48 rounded bg-[#e8f6ee]" />
          <div className="mt-5 h-4 w-full rounded bg-[#f1f7f4]" />
          <div className="mt-4 h-4 w-3/4 rounded bg-[#f1f7f4]" />
        </div>
      ) : profileQuery.isError ? (
        <section role="alert" className="mt-6 rounded-2xl border border-[#f0c8c4] bg-[#fff8f7] p-6">
          <p className="text-sm font-semibold text-[#b42318]">Unable to load your account information.</p>
          <button type="button" onClick={() => void profileQuery.refetch()} className="mt-3 text-sm font-bold text-[#1f6a58] underline">
            Retry
          </button>
        </section>
      ) : profile ? (
        <>
          <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#06201c]">{getProfileDisplayName(profile) ?? "Profile"}</h2>

            <ProfileEditor initialFullName={getProfileDisplayName(profile) ?? ""} initialEmail={profile.email ?? ""} />

            {!showPasswordSettings ? (
              <p className="mt-4 rounded-xl bg-[#f7fbf8] px-4 py-3 text-sm text-[#52736a]">
                Profile details are managed by the Super Admin identity service. Profile editing is not currently available in its API. Use the &quot;Request change&quot; action to create a backend request.
              </p>
            ) : null}
          </section>
          {showPasswordSettings ? <PlatformPasswordSettings email={profile.email ?? ""} /> : null}
        </>
      ) : (
        <section role="alert" className="mt-6 rounded-2xl border border-[#f0c8c4] bg-[#fff8f7] p-6">
          <p className="text-sm font-semibold text-[#b42318]">Your Super Admin session could not be verified.</p>
          <button type="button" onClick={() => void profileQuery.refetch()} className="mt-3 text-sm font-bold text-[#1f6a58] underline">
            Retry
          </button>
        </section>
      )}
    </section>
  );
}
