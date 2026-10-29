"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { useRegistration } from "@/contexts/RegistrationContext";
import {
  completeTenantApplicationUpload,
  getDocumentRequirements,
  getMyTenantApplication,
  initTenantApplicationUpload,
  RegistrationApiError,
  type TenantApplicationDocument,
  uploadTenantApplicationFile,
} from "@/services/registration-ui.service";

type DocumentsStepProps = {
  onBack: () => void;
  onContinue: () => void;
};

/** Collects the required application documents and exposes a new-tab preview for each file. */
export default function DocumentsStep({ onBack, onContinue }: DocumentsStepProps) {
  const { userId, tenantApplication, documentRequirements, updateRegistration } = useRegistration();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Set<string>>(() => new Set());
  const [completedDocuments, setCompletedDocuments] = useState<Record<string, TenantApplicationDocument>>({});
  const [localPreviewUrls, setLocalPreviewUrls] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const localPreviewUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (documentRequirements.length) return;
    void getDocumentRequirements()
      .then((requirements) => updateRegistration({ documentRequirements: requirements }))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load document requirements."));
  }, [documentRequirements.length, updateRegistration]);

  useEffect(() => () => {
    for (const url of Object.values(localPreviewUrlsRef.current)) URL.revokeObjectURL(url);
  }, []);

  const documents = new Map((tenantApplication?.documents ?? []).map((document) => [document.documentType, document]));
  for (const [documentType, document] of Object.entries(completedDocuments)) documents.set(documentType, document);
  const uploaded = new Set(documents.keys());
  const requiredComplete = documentRequirements.filter((item) => item.required).every((item) => uploaded.has(item.documentType));

  async function upload(documentType: string, file: File) {
    if (uploading.has(documentType)) return;
    if (!tenantApplication) {
      setError("Your application is not ready for document uploads. Please try again in a moment.");
      return;
    }

    setUploading((current) => new Set(current).add(documentType));
    setError(null);
    try {
      const contentType = file.type || "application/octet-stream";
      const init = await initTenantApplicationUpload(tenantApplication.id, userId, {
        documentType,
        fileName: file.name,
        contentType,
        fileSizeBytes: file.size,
      });
      await uploadTenantApplicationFile(init.uploadUrl, file);
      let application = await completeTenantApplicationUpload(tenantApplication.id, userId, {
        documentType,
        storageKey: init.storageKey,
        fileName: file.name,
        contentType,
        fileSizeBytes: file.size,
      });
      let completed = application.documents.find((document) => document.documentType === documentType);
      if (!completed) {
        application = await getMyTenantApplication(userId);
        completed = application.documents.find((document) => document.documentType === documentType);
      }
      if (!completed) throw new RegistrationApiError("The uploaded document was not returned by the registration service.", "invalid_response");
      setCompletedDocuments((current) => ({ ...current, [documentType]: completed }));
      updateRegistration({ tenantApplication: application });
    } catch (reason) {
      setError(reason instanceof RegistrationApiError || reason instanceof Error ? reason.message : "Unable to upload document.");
    } finally {
      setUploading((current) => {
        const next = new Set(current);
        next.delete(documentType);
        return next;
      });
    }
  }

  function handleFileSelected(documentType: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const existingPreviewUrl = localPreviewUrlsRef.current[documentType];
    if (existingPreviewUrl) URL.revokeObjectURL(existingPreviewUrl);
    const previewUrl = URL.createObjectURL(file);
    localPreviewUrlsRef.current[documentType] = previewUrl;
    setLocalPreviewUrls((current) => ({ ...current, [documentType]: previewUrl }));
    void upload(documentType, file);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[#06201c]">Required documents</h2>
        <p className="text-sm leading-6 text-[#52736a]">Upload the documents required for your application.</p>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-2xl bg-[#fff6f6] p-3 text-sm text-[#b42318]">{error}</p> : null}
      <div className="mt-5 space-y-3">
        {documentRequirements.map((item) => {
          const document = documents.get(item.documentType);
          const isUploading = uploading.has(item.documentType);
          const previewUrl = document?.downloadUrl ?? localPreviewUrls[item.documentType];

          return (
            <div key={item.documentType} className="rounded-2xl border border-[#d8e4df] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#06201c]">
                    {item.label}
                    {item.required
                      ? <span className="ml-2 text-xs text-[#b42318]">Required</span>
                      : <span className="ml-2 text-xs text-[#52736a]">Optional</span>}
                  </p>
                  <p className="mt-1 text-sm text-[#52736a]">{item.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    ref={(element) => { fileInputRefs.current[item.documentType] = element; }}
                    type="file"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                    disabled={isUploading}
                    onChange={(event) => handleFileSelected(item.documentType, event)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[item.documentType]?.click()}
                    disabled={isUploading}
                    className="inline-flex h-10 cursor-pointer items-center rounded-[14px] bg-[#1f6a58] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`${document ? "Replace" : "Choose"} ${item.label}`}
                  >
                    {isUploading ? "Uploading…" : document ? "Replace" : "Choose file"}
                  </button>
                  {previewUrl ? (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center rounded-[14px] border border-[#1f6a58] px-4 text-xs font-bold text-[#1f6a58]"
                      aria-label={`Preview ${document?.fileName ?? item.label}`}
                    >
                      Preview
                    </a>
                  ) : null}
                </div>
              </div>
              {document ? <p className="mt-2 text-xs font-semibold text-[#1f6a58]">Uploaded</p> : null}
              {document?.fileName ? <p className="mt-1 truncate text-xs text-[#52736a]">{document.fileName}</p> : null}
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-0 mt-5 flex gap-3 border-t border-[#e5ece8] bg-white/95 pt-4">
        <button type="button" onClick={onBack} className="h-11 rounded-[14px] border border-[#d8e4df] px-4 text-sm font-bold">Back</button>
        <button
          type="button"
          disabled={!requiredComplete}
          onClick={onContinue}
          className="ml-auto h-11 rounded-[14px] bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#8fb5aa]"
        >
          Review application
        </button>
      </div>
    </div>
  );
}
