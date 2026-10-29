"use client";

import { useEffect, useRef, useState } from "react";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const control = "min-w-0 flex-1 rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 font-normal outline-none focus:border-[#1f6a58]";

/** UI-only URL and local file control used by the new Training form preview. */
export function MediaUploadField({ label, placeholder, required, value, onChange, tipsOn }: { label: string; placeholder: string; required: boolean; value: string; onChange: (value: string) => void; tipsOn: boolean }) {
  const [url, setUrl] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);
  const clear = () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; setFileInfo(null); onChange(""); setMessage(""); };
  const addLink = () => {
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("invalid link");
      clear(); onChange(parsed.toString()); setMessage("Link added to this preview.");
    } catch { setMessage("We could not load this link. Please check the address and try again."); }
  };
  const addFile = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_BYTES) { setMessage(`This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please upload a file smaller than 10 MB.`); return; }
    if (!ACCEPTED_TYPES.has(file.type)) { setMessage("Choose a PNG, JPG, WEBP, or PDF file."); return; }
    clear();
    try {
      const previewUrl = URL.createObjectURL(file);
      objectUrlRef.current = previewUrl;
      setFileInfo({ name: file.name, size: file.size, type: file.type });
      onChange(previewUrl); setMessage("");
    } catch { setMessage("We could not preview this file. Please try another one."); }
  };
  const isImage = fileInfo?.type.startsWith("image/") ?? false;
  return <div className="text-sm font-semibold text-[#355a51]">{label || "Training material"}{required ? <span className="ml-1 text-[#b42318]" aria-label="required">*</span> : null}<div className="mt-2 flex flex-wrap gap-2"><input value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addLink(); } }} placeholder={placeholder || "Paste an HTTP or HTTPS link"} aria-label={`${label || "Training material"} link`} className={control} /><button type="button" onClick={addLink} className="rounded-lg border border-[#cfe0d8] px-3 py-2 text-[#1f6a58]">+ Add</button><button type="button" onClick={() => setUploadOpen((open) => !open)} className="rounded-lg border border-[#cfe0d8] px-3 py-2 text-[#1f6a58]">+ Upload</button></div>
    {tipsOn ? <p className="mt-2 text-xs font-normal text-[#718d84]">Add a web link or attach a file. Upload previews stay on this device.</p> : null}
    {uploadOpen ? <label onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFile(event.dataTransfer.files[0]); }} className={`mt-3 block cursor-pointer rounded-xl border-2 border-dashed p-5 text-center text-xs font-normal ${dragging ? "border-[#1f6a58] bg-[#eaf5ef]" : "border-[#cfe0d8] bg-white"}`}><span>{dragging ? "Release mouse to attach file" : "Drop a file here or choose one"}</span><span className="mt-1 block text-[#718d84]">Supports: PNG, JPG, WEBP, PDF · Maximum 10 MB</span><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="sr-only" onChange={(event) => addFile(event.target.files?.[0])} /></label> : null}
    {value ? <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#dfe9e4] bg-white p-3 text-xs font-normal"><div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#eef6f2]">{isImage ? <img src={value} alt={`Preview of ${fileInfo?.name ?? label}`} className="h-full w-full object-cover" /> : <span className="font-bold text-[#1f6a58]">{fileInfo?.type === "application/pdf" ? "PDF" : "LINK"}</span>}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold text-[#12352e]">{fileInfo?.name ?? value}</p><p className="mt-1 text-[#718d84]">{fileInfo ? `${(fileInfo.size / 1024 / 1024).toFixed(2)} MB` : "Web link"}</p></div><button type="button" onClick={clear} className="font-bold text-[#b42318]">Remove</button></div> : null}
    {message ? <p role="status" className="mt-2 text-xs font-normal text-[#52736a]">{message}</p> : null}</div>;
}
