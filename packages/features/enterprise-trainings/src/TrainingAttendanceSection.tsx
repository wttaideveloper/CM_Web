"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { formatDetailDateTime } from "./detail-formatters";
import { checkInTrainingParticipant, listTrainingEnrolments, uncheckInTrainingParticipant, validateTrainingQr, TrainingsApiError, type ValidateTrainingQrResponse } from "./trainings.service";

/** One enrolment row normalized for the attendance UI (backend emits `qr_code` per row). */
interface AttendanceEnrolment {
  enrolmentId: string;
  participantName: string;
  participantEmail: string;
  status: string;
  checkedInAt: string | null;
}

function toAttendanceEnrolment(value: unknown, index: number): AttendanceEnrolment | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const enrolmentId = typeof record.id === "string" ? record.id : String(index);
  if (!enrolmentId) return null;
  const participantName = typeof record.participant_name === "string" ? record.participant_name : typeof record.name === "string" ? record.name : "Participant";
  const participantEmail = typeof record.participant_email === "string" ? record.participant_email : typeof record.email === "string" ? record.email : "";
  const status = typeof record.status === "string" ? record.status : "";
  const checkedInAt = typeof record.checked_in_at === "string" ? record.checked_in_at : null;
  return { enrolmentId, participantName, participantEmail, status, checkedInAt };
}

function canCheckIn(enrolment: AttendanceEnrolment): boolean {
  return enrolment.status.trim().toLowerCase() === "confirmed" && enrolment.checkedInAt === null;
}

function canUndoCheckIn(enrolment: AttendanceEnrolment): boolean {
  return enrolment.checkedInAt !== null;
}

function humanizeStatus(value: string): string {
  const normalized = value.trim().replace(/[_-]+/g, " ");
  return normalized ? normalized.replace(/\b\w/g, (character) => character.toUpperCase()) : "Status unavailable";
}

/**
 * Renders training enrolment QR check-in: camera scan, manual code entry,
 * validate-then-check-in, and per-enrolment check-in / undo with `checked_in_at`.
 */
export default function TrainingAttendanceSection({ trainingId }: { trainingId: string }) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [participantSearch, setParticipantSearch] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [validatedEnrolment, setValidatedEnrolment] = useState<ValidateTrainingQrResponse | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const scanQrTriggerRef = useRef<HTMLButtonElement | null>(null);
  const enrolmentsQuery = useQuery({ queryKey: ["trainings", trainingId, "enrolments"], queryFn: () => listTrainingEnrolments(trainingId), enabled: Boolean(trainingId), staleTime: 30_000, retry: 1 });
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "enrolments"] }); };
  const checkInMutation = useMutation({ mutationFn: (enrolment: AttendanceEnrolment) => checkInTrainingParticipant(trainingId, { enrolment_id: enrolment.enrolmentId }), onSuccess: async (_response, enrolment) => { setFeedback(enrolment.participantName + " checked in."); await refresh(); }, onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to check in this participant. Please try again.") });
  const uncheckInMutation = useMutation({ mutationFn: (enrolment: AttendanceEnrolment) => uncheckInTrainingParticipant(trainingId, { enrolment_id: enrolment.enrolmentId }), onSuccess: async (_response, enrolment) => { setFeedback(enrolment.participantName + " check-in undone."); await refresh(); }, onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to undo this participant check-in. Please try again.") });
  const validateQrMutation = useMutation({ mutationFn: (code: string) => validateTrainingQr(trainingId, { qr_code: code }), onSuccess: (result) => { if (result.valid) { setFeedback(null); setValidatedEnrolment(result); } else { setValidatedEnrolment(null); setFeedback("Unable to validate this QR code. Please try again."); } }, onError: (error) => { setValidatedEnrolment(null); setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to validate this QR code. Please try again."); } });
  const qrCheckInMutation = useMutation({ mutationFn: (code: string) => checkInTrainingParticipant(trainingId, { qr_code: code }), onSuccess: async () => { setValidatedEnrolment(null); setQrCode(""); setFeedback("Enrolment checked in."); await refresh(); }, onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to check in this QR code. Please try again.") });
  const normalizedSearch = participantSearch.trim().toLocaleLowerCase();
  const validateQrCode = (code: string) => {
    if (code && !validateQrMutation.isPending && !qrCheckInMutation.isPending) {
      setFeedback(null); setValidatedEnrolment(null); validateQrMutation.mutate(code);
    }
  };
  const enrolments = useMemo(() => (enrolmentsQuery.data ?? []).map(toAttendanceEnrolment).filter((item): item is AttendanceEnrolment => item !== null), [enrolmentsQuery.data]);
  const filteredEnrolments = useMemo(() => normalizedSearch ? enrolments.filter((enrolment) => enrolment.participantName.toLocaleLowerCase().includes(normalizedSearch) || enrolment.participantEmail.toLocaleLowerCase().includes(normalizedSearch)) : enrolments, [enrolments, normalizedSearch]);
  if (enrolmentsQuery.isLoading) return <section className="space-y-4" role="status" aria-label="Loading check-in"><div className="h-28 animate-pulse rounded-2xl bg-[#edf3f0]" /><div className="h-36 animate-pulse rounded-2xl bg-[#edf3f0]" /></section>;
  if (enrolmentsQuery.isError) return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm"><p role="alert" className="font-semibold text-[#b42318]">Unable to load check-in.</p><button type="button" onClick={() => void enrolmentsQuery.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></section>;
  const pending = (enrolment: AttendanceEnrolment) => (checkInMutation.isPending && checkInMutation.variables?.enrolmentId === enrolment.enrolmentId) || (uncheckInMutation.isPending && uncheckInMutation.variables?.enrolmentId === enrolment.enrolmentId);
  const error = checkInMutation.isError || uncheckInMutation.isError || validateQrMutation.isError || qrCheckInMutation.isError;
  return <section className="space-y-5">
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[#06201c]">Enrolment check-in</p><p className="mt-1 text-sm text-[#52736a]">Scan an enrolment QR code or enter it manually.</p></div><button ref={scanQrTriggerRef} type="button" onClick={() => setScannerOpen(true)} disabled={validateQrMutation.isPending || qrCheckInMutation.isPending} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">Scan QR</button></div><form onSubmit={(event) => { event.preventDefault(); validateQrCode(qrCode.trim()); }} className="mt-4 flex flex-col gap-3 border-t border-[#edf3f0] pt-4 sm:flex-row sm:items-end"><label className="flex-1"><span className="mb-1 block text-sm font-semibold text-[#31594d]">Or enter QR code manually</span><input value={qrCode} onChange={(event) => setQrCode(event.target.value)} placeholder="Enter QR code..." className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]" /></label><button type="submit" disabled={!qrCode.trim() || validateQrMutation.isPending || qrCheckInMutation.isPending} className="h-10 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60">{validateQrMutation.isPending ? "Validating..." : "Validate"}</button></form></section>
    {scannerOpen ? <QrScanner onClose={() => { setScannerOpen(false); window.requestAnimationFrame(() => scanQrTriggerRef.current?.focus()); }} onDetected={(code) => { setQrCode(code); setScannerOpen(false); window.requestAnimationFrame(() => scanQrTriggerRef.current?.focus()); validateQrCode(code); }} /> : null}
    {validatedEnrolment?.valid ? <section className="rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] p-4"><p className="text-sm font-bold text-[#1f6a58]">Valid enrolment</p><p className="mt-2 font-bold text-[#06201c]">{validatedEnrolment.participant_name}</p><p className="mt-1 text-sm text-[#52736a]">{validatedEnrolment.participant_email}</p><p className="mt-2 text-sm font-semibold text-[#31594d]">{humanizeStatus(validatedEnrolment.status)}</p>{validatedEnrolment.training_title ? <p className="mt-1 text-sm text-[#52736a]">{validatedEnrolment.training_title}</p> : null}{<button type="button" disabled={qrCheckInMutation.isPending} onClick={() => { if (!qrCheckInMutation.isPending) { setFeedback(null); qrCheckInMutation.mutate(qrCode.trim()); } }} className="mt-3 h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{qrCheckInMutation.isPending ? "Checking in..." : "Check In"}</button>}</section> : null}
    {feedback ? <p aria-live="polite" className={error ? "rounded-xl bg-[#fff2f0] px-4 py-3 text-sm font-semibold text-[#b42318]" : "rounded-xl bg-[#e8f6ee] px-4 py-3 text-sm font-semibold text-[#1f6a58]"}>{feedback}</p> : null}
    {enrolments.length === 0 ? <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-12 text-center shadow-sm"><p className="font-bold text-[#06201c]">No enrolments yet</p><p className="mt-2 text-sm text-[#52736a]">Check-in will appear once participants enrol.</p></section> : <section className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="w-full sm:max-w-md"><span className="sr-only">Search enrolments</span><input type="search" value={participantSearch} onChange={(event) => setParticipantSearch(event.target.value)} placeholder="Search enrolments..." className="h-11 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]" /></label><p aria-live="polite" className="text-sm text-[#52736a]">{normalizedSearch ? filteredEnrolments.length + " of " + enrolments.length + " enrolments" : enrolments.length + " enrolments"}</p></div>{filteredEnrolments.length === 0 ? <div className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-12 text-center shadow-sm"><p className="font-bold text-[#06201c]">No enrolments found</p><p className="mt-2 text-sm text-[#52736a]">Try a different name or email.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{filteredEnrolments.map((enrolment) => <article key={enrolment.enrolmentId} className="flex flex-col gap-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[#06201c]">{enrolment.participantName}</p>{enrolment.participantEmail ? <p className="mt-1 text-sm text-[#52736a]">{enrolment.participantEmail}</p> : null}<div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-[#edf3f0] px-3 py-1 text-[#31594d]">{humanizeStatus(enrolment.status)}</span><span className={enrolment.checkedInAt ? "rounded-full bg-[#e8f6ee] px-3 py-1 text-[#1f6a58]" : "rounded-full bg-[#f5f7f6] px-3 py-1 text-[#52736a]"}>{enrolment.checkedInAt ? "Checked in " + formatDetailDateTime(enrolment.checkedInAt) : "Not checked in"}</span></div></div><div className="flex flex-wrap gap-2">{canUndoCheckIn(enrolment) ? <button type="button" disabled={pending(enrolment)} onClick={() => uncheckInMutation.mutate(enrolment)} className="h-10 rounded-full border border-[#b87923] px-4 text-sm font-bold text-[#8a5a12] disabled:cursor-not-allowed disabled:opacity-60">{uncheckInMutation.isPending && uncheckInMutation.variables?.enrolmentId === enrolment.enrolmentId ? "Undoing..." : "Undo Check-in"}</button> : null}{!canUndoCheckIn(enrolment) && canCheckIn(enrolment) ? <button type="button" disabled={pending(enrolment)} onClick={() => checkInMutation.mutate(enrolment)} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{checkInMutation.isPending && checkInMutation.variables?.enrolmentId === enrolment.enrolmentId ? "Checking in..." : "Check In"}</button> : null}</div></article>)}</div>}</section>}
  </section>;
}

type QrDetector = { detect: (source: ImageBitmapSource) => Promise<readonly { rawValue?: string }[]> };
type QrDetectorConstructor = new (options?: { formats?: string[] }) => QrDetector;

function getQrDetectorConstructor(): QrDetectorConstructor | null {
  return (window as unknown as { BarcodeDetector?: QrDetectorConstructor }).BarcodeDetector ?? null;
}

/** Camera QR scanner: prefers the native BarcodeDetector, falls back to `@zxing/browser`. */
function QrScanner({ onClose, onDetected }: { onClose: () => void; onDetected: (value: string) => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const cleanupRef = useRef<() => void>(() => undefined);
  const detectedRef = useRef(false);
  const [cameraStatus, setCameraStatus] = useState("Starting camera…");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const stop = () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const videoStream = videoRef.current?.srcObject;
      if (videoStream instanceof MediaStream) videoStream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      streamRef.current = null;
    };
    cleanupRef.current = stop;
    const start = async () => {
      const Detector = getQrDetectorConstructor();
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("No camera is available. You can enter the QR code manually.");
        return;
      }
      try {
        if (!Detector) {
          if (!videoRef.current) return;
          const reader = new BrowserQRCodeReader();
          const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } }, audio: false }, videoRef.current, (result) => {
            const value = result?.getText().trim();
            if (value && !detectedRef.current) { detectedRef.current = true; stop(); onDetected(value); }
          });
          controlsRef.current = controls;
          if (detectedRef.current) controls.stop();
          setCameraStatus("Camera ready. Point it at an enrolment QR code.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        streamRef.current = stream;
        if (!videoRef.current) { stop(); return; }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraStatus("Camera ready. Point it at an enrolment QR code.");
        const detector = new Detector({ formats: ["qr_code"] });
        const scan = async () => {
          if (detectedRef.current || !videoRef.current) return;
          try {
            const result = await detector.detect(videoRef.current);
            const value = result[0]?.rawValue?.trim();
            if (value) { detectedRef.current = true; stop(); onDetected(value); return; }
          } catch {
            // Unreadable frames are expected while a code is not in view.
          }
          frameRef.current = requestAnimationFrame(() => void scan());
        };
        frameRef.current = requestAnimationFrame(() => void scan());
      } catch {
        stop();
        setError("Unable to access the camera. You can enter the QR code manually.");
      }
    };
    void start();
    return () => {
      stop();
      if (cleanupRef.current === stop) cleanupRef.current = () => undefined;
    };
  }, [onDetected]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { cleanupRef.current(); onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled])') ?? []);
      const currentIndex = focusable.findIndex((element) => element === document.activeElement);
      const nextIndex = event.shiftKey ? (currentIndex - 1 + focusable.length) % focusable.length : (currentIndex + 1) % focusable.length;
      focusable[nextIndex]?.focus();
      event.preventDefault();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const closeScanner = () => { cleanupRef.current(); onClose(); };
  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title" aria-describedby="qr-scanner-status" className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/60 p-4"><section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between gap-4"><h2 id="qr-scanner-title" className="text-lg font-bold text-[#06201c]">Scan enrolment QR code</h2><button type="button" autoFocus onClick={closeScanner} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-bold text-[#31594d]">Cancel</button></div><p id="qr-scanner-status" aria-live="polite" className="sr-only">{error ?? cameraStatus}</p>{error ? <p role="alert" className="mt-5 text-sm font-semibold text-[#b42318]">{error}</p> : <div className="relative mt-5 overflow-hidden rounded-xl bg-[#06201c]"><video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" /><div aria-hidden="true" className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/80" /></div>}<button type="button" onClick={closeScanner} className="mt-4 text-sm font-semibold text-[#1f6a58] underline">Close scanner</button></section></div>;
}
