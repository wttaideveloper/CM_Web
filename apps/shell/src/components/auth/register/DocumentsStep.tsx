"use client";

import { useEffect, useState } from "react";
import { useRegistration } from "@/contexts/RegistrationContext";
import { completeTenantApplicationUpload, getDocumentRequirements, initTenantApplicationUpload, uploadTenantApplicationFile, RegistrationApiError } from "@/services/registration-ui.service";

export default function DocumentsStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const { userId, tenantApplication, documentRequirements, updateRegistration } = useRegistration();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (documentRequirements.length) return;
    void getDocumentRequirements().then((requirements) => updateRegistration({ documentRequirements: requirements })).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load document requirements."));
  }, [documentRequirements.length, updateRegistration]);

  const uploaded = new Set(tenantApplication?.documents.map((document) => document.documentType));
  const requiredComplete = documentRequirements.filter((item) => item.required).every((item) => uploaded.has(item.documentType));

  async function upload(documentType: string, file: File) {
    if (!tenantApplication || busy) return;
    setBusy(documentType); setError(null);
    try {
      const contentType = file.type || "application/octet-stream";
      const init = await initTenantApplicationUpload(tenantApplication.id, userId, { documentType, fileName: file.name, contentType, fileSizeBytes: file.size });
      await uploadTenantApplicationFile(init.uploadUrl, file);
      const application = await completeTenantApplicationUpload(tenantApplication.id, userId, { documentType, storageKey: init.storageKey, fileName: file.name, contentType, fileSizeBytes: file.size });
      updateRegistration({ tenantApplication: application });
    } catch (reason) {
      setError(reason instanceof RegistrationApiError || reason instanceof Error ? reason.message : "Unable to upload document.");
    } finally { setBusy(null); }
  }

  return <div className="flex h-full flex-col"><div className="space-y-2"><h2 className="text-xl font-bold text-[#06201c]">Required documents</h2><p className="text-sm leading-6 text-[#52736a]">Upload the documents required for your application.</p></div>{error ? <p role="alert" className="mt-4 rounded-2xl bg-[#fff6f6] p-3 text-sm text-[#b42318]">{error}</p> : null}<div className="mt-5 space-y-3">{documentRequirements.map((item) => <div key={item.documentType} className="rounded-2xl border border-[#d8e4df] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#06201c]">{item.label}{item.required ? <span className="ml-2 text-xs text-[#b42318]">Required</span> : <span className="ml-2 text-xs text-[#52736a]">Optional</span>}</p><p className="mt-1 text-sm text-[#52736a]">{item.description}</p></div><label className="cursor-pointer rounded-full bg-[#1f6a58] px-3 py-2 text-xs font-bold text-white">{busy === item.documentType ? "Uploading…" : uploaded.has(item.documentType) ? "Replace" : "Choose file"}<input type="file" className="sr-only" disabled={Boolean(busy)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(item.documentType, file); event.currentTarget.value = ""; }} /></label></div>{uploaded.has(item.documentType) ? <p className="mt-2 text-xs font-semibold text-[#1f6a58]">Uploaded</p> : null}</div>)}</div><div className="sticky bottom-0 mt-5 flex gap-3 border-t border-[#e5ece8] bg-white/95 pt-4"><button type="button" onClick={onBack} className="h-11 rounded-[14px] border border-[#d8e4df] px-4 text-sm font-bold">Back</button><button type="button" disabled={!requiredComplete} onClick={onContinue} className="ml-auto h-11 rounded-[14px] bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#8fb5aa]">Review application</button></div></div>;
}
