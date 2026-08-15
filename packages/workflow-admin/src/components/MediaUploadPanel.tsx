"use client";

import { useState } from "react";
import { completeWorkflowMediaUpload, getWorkflowMediaAccessUrl, initWorkflowMediaUpload, uploadWorkflowMediaFile, type WorkflowMedia } from "@ihp/workflow-runtime";
import { WorkspaceCard } from "./WorkspacePrimitives";

/** Exercises the documented direct-to-storage media upload flow without persisting base64 content. */
export function MediaUploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [media, setMedia] = useState<WorkflowMedia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const upload = async () => { if (!file || isUploading) return; setIsUploading(true); setError(null); setPreviewUrl(null); try { const init = await initWorkflowMediaUpload({ fileName: file.name, contentType: file.type || "application/octet-stream", fileSizeBytes: file.size, kind: "file", purpose: "form" }); await uploadWorkflowMediaFile(file, init.data); const complete = await completeWorkflowMediaUpload({ mediaId: init.data.mediaId, storageKey: init.data.storageKey, fileName: file.name, contentType: file.type || "application/octet-stream", kind: "file", purpose: "form" }); setMedia(complete.data); } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Media upload failed."); } finally { setIsUploading(false); } };
  const preview = async () => { if (!media) return; setError(null); try { const response = await getWorkflowMediaAccessUrl(media.storageKey, media.mediaId); setPreviewUrl(response.data.accessUrl); } catch (previewError) { setError(previewError instanceof Error ? previewError.message : "Media preview failed."); } };
  return <WorkspaceCard title="Media test"><p className="text-sm text-[#52736a]">Init → direct raw PUT → complete. The selected file is never converted to base64.</p><div className="mt-3 flex flex-wrap items-center gap-2"><input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} aria-label="Select media file" /><button type="button" disabled={!file || isUploading} onClick={() => void upload()} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isUploading ? "Uploading…" : "Upload"}</button></div>{error ? <p role="alert" className="mt-3 text-sm text-[#b42318]">{error}</p> : null}{media ? <div className="mt-3 rounded-xl bg-[#f4f8f6] p-3 text-xs text-[#16332b]"><p>mediaId: {media.mediaId}</p><p>storageKey: {media.storageKey}</p><p className="break-all">mediaUrl: {media.mediaUrl}</p><p>{media.contentType} · {media.sizeBytes} bytes</p><button type="button" onClick={() => void preview()} className="mt-2 font-semibold text-[#1f6a58]">Preview media</button>{previewUrl ? <><a className="ml-3 font-semibold text-[#1f6a58] underline" href={previewUrl} target="_blank" rel="noreferrer">Open preview</a><p className="mt-2 break-all">accessUrl: {previewUrl}</p></> : null}</div> : null}</WorkspaceCard>;
}
