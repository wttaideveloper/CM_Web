"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { formatAttendanceAuditDateTime } from "./event-detail-formatters";
import type { EventStatus } from "./event-status";
import { checkInEventParticipant, checkOutEventParticipant, getEventAttendance, type EventAttendanceParticipant, type ValidateEventQrResponse, uncheckInEventParticipant, validateEventQr } from "./events.service";

function humanizeStatus(value: string): string {
  const normalized = value.trim().replace(/[_-]+/g, " ");
  return normalized ? normalized.replace(/\b\w/g, (character) => character.toUpperCase()) : "Status unavailable";
}
function canCheckIn(participant: EventAttendanceParticipant): boolean { return participant.status.trim().toLowerCase() === "confirmed" && participant.checked_in_at === null; }
function canUndoCheckIn(participant: EventAttendanceParticipant): boolean { return participant.checked_in_at !== null; }
function canCheckOut(participant: EventAttendanceParticipant): boolean { return participant.checked_in_at !== null && participant.checked_out_at === null; }
function canManageAttendance(status: EventStatus): boolean { return status === "published"; }

/** Renders the backend-authoritative Event attendance report and attendance actions. */
export default function EventAttendanceSection({ eventId, eventStatus, timeZone }: { eventId: string; eventStatus: EventStatus; timeZone: string }) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [participantSearch, setParticipantSearch] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [validatedTicket, setValidatedTicket] = useState<ValidateEventQrResponse | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const scanQrTriggerRef = useRef<HTMLButtonElement | null>(null);
  const attendanceOperational = canManageAttendance(eventStatus);
  const attendanceQuery = useQuery({ queryKey: ["event-attendance", eventId], queryFn: () => getEventAttendance(eventId), enabled: Boolean(eventId), staleTime: 30_000, retry: 1 });
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ["event-attendance", eventId] }); };
  const checkInMutation = useMutation({ mutationFn: (participant: EventAttendanceParticipant) => checkInEventParticipant(eventId, { registration_id: participant.registration_id }), onSuccess: async (_response, participant) => { setFeedback(participant.participant_name + " checked in."); await refresh(); }, onError: () => setFeedback("Unable to check in this participant. Please try again.") });
  const uncheckInMutation = useMutation({ mutationFn: (participant: EventAttendanceParticipant) => uncheckInEventParticipant(eventId, { registration_id: participant.registration_id }), onSuccess: async (_response, participant) => { setFeedback(participant.participant_name + " check-in undone."); await refresh(); }, onError: () => setFeedback("Unable to undo this participant check-in. Please try again.") });
  const checkOutMutation = useMutation({ mutationFn: (participant: EventAttendanceParticipant) => checkOutEventParticipant(eventId, { registration_id: participant.registration_id }), onSuccess: async (_response, participant) => { setFeedback(participant.participant_name + " checked out."); await refresh(); }, onError: () => setFeedback("Unable to check out this participant. Please try again.") });
  const validateQrMutation = useMutation({ mutationFn: (code: string) => validateEventQr(eventId, { qr_code: code }), onSuccess: (result) => { if (result.valid) { setFeedback(null); setValidatedTicket(result); } else { setValidatedTicket(null); setFeedback("Unable to validate this ticket. Please try again."); } }, onError: () => { setValidatedTicket(null); setFeedback("Unable to validate this ticket. Please try again."); } });
  const qrCheckInMutation = useMutation({ mutationFn: (code: string) => checkInEventParticipant(eventId, { qr_code: code }), onSuccess: async () => { setValidatedTicket(null); setQrCode(""); setFeedback("Ticket checked in."); await refresh(); }, onError: () => setFeedback("Unable to check in this ticket. Please try again.") });
  const normalizedSearch = participantSearch.trim().toLocaleLowerCase();
  const validateQrCode = (code: string) => {
    if (attendanceOperational && code && !validateQrMutation.isPending && !qrCheckInMutation.isPending) {
      setFeedback(null); setValidatedTicket(null); validateQrMutation.mutate(code);
    }
  };
  const filteredParticipants = useMemo(() => {
    const participants = attendanceQuery.data?.participants ?? [];
    return normalizedSearch ? participants.filter((participant) => participant.participant_name.toLocaleLowerCase().includes(normalizedSearch) || participant.participant_email.toLocaleLowerCase().includes(normalizedSearch)) : participants;
  }, [attendanceQuery.data?.participants, normalizedSearch]);
  if (attendanceQuery.isLoading) return <section className="space-y-4" role="status" aria-label="Loading attendance"><div className="h-28 animate-pulse rounded-2xl bg-[#edf3f0]" /><div className="h-36 animate-pulse rounded-2xl bg-[#edf3f0]" /></section>;
  if (attendanceQuery.isError) return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm"><p role="alert" className="font-semibold text-[#b42318]">Unable to load attendance.</p><button type="button" onClick={() => void attendanceQuery.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></section>;
  if (!attendanceQuery.data) return null;
  const report = attendanceQuery.data;
  const pending = (participant: EventAttendanceParticipant) => (checkInMutation.isPending && checkInMutation.variables?.registration_id === participant.registration_id) || (uncheckInMutation.isPending && uncheckInMutation.variables?.registration_id === participant.registration_id) || (checkOutMutation.isPending && checkOutMutation.variables?.registration_id === participant.registration_id);
  const error = checkInMutation.isError || uncheckInMutation.isError || checkOutMutation.isError || validateQrMutation.isError || qrCheckInMutation.isError;
  return <section className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-3">{[{ label: "Registered", value: report.total_registered }, { label: "Attended", value: report.total_attended }, { label: "No Show", value: report.total_no_show }].map((metric) => <article key={metric.label} className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#7f9d94]">{metric.label}</p><p className="mt-2 text-3xl font-bold text-[#06201c]">{metric.value}</p></article>)}</div>
    {!attendanceOperational ? <p role="status" className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 py-3 text-sm font-semibold text-[#52736a]">Attendance actions are unavailable for this Event status.</p> : null}
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[#06201c]">Ticket check-in</p><p className="mt-1 text-sm text-[#52736a]">Scan a ticket QR code or enter it manually.</p></div><button ref={scanQrTriggerRef} type="button" onClick={() => setScannerOpen(true)} disabled={!attendanceOperational || validateQrMutation.isPending || qrCheckInMutation.isPending} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">Scan QR</button></div><form onSubmit={(event) => { event.preventDefault(); validateQrCode(qrCode.trim()); }} className="mt-4 flex flex-col gap-3 border-t border-[#edf3f0] pt-4 sm:flex-row sm:items-end"><label className="flex-1"><span className="mb-1 block text-sm font-semibold text-[#31594d]">Or enter ticket code manually</span><input value={qrCode} onChange={(event) => setQrCode(event.target.value)} disabled={!attendanceOperational} placeholder="Enter QR code..." className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60" /></label><button type="submit" disabled={!attendanceOperational || !qrCode.trim() || validateQrMutation.isPending || qrCheckInMutation.isPending} className="h-10 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60">{validateQrMutation.isPending ? "Validating..." : "Validate"}</button></form></section>
    {scannerOpen ? <QrScanner onClose={() => { setScannerOpen(false); window.requestAnimationFrame(() => scanQrTriggerRef.current?.focus()); }} onDetected={(code) => { setQrCode(code); setScannerOpen(false); window.requestAnimationFrame(() => scanQrTriggerRef.current?.focus()); validateQrCode(code); }} /> : null}
    {validatedTicket?.valid ? <section className="rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] p-4"><p className="text-sm font-bold text-[#1f6a58]">Valid ticket</p><p className="mt-2 font-bold text-[#06201c]">{validatedTicket.participant_name}</p><p className="mt-1 text-sm text-[#52736a]">{validatedTicket.participant_email}</p><p className="mt-2 text-sm font-semibold text-[#31594d]">{humanizeStatus(validatedTicket.status)}</p>{validatedTicket.event_title ? <p className="mt-1 text-sm text-[#52736a]">{validatedTicket.event_title}</p> : null}{attendanceOperational && validatedTicket.status.trim().toLowerCase() === "confirmed" ? <button type="button" disabled={qrCheckInMutation.isPending} onClick={() => { if (!qrCheckInMutation.isPending) { setFeedback(null); qrCheckInMutation.mutate(qrCode.trim()); } }} className="mt-3 h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{qrCheckInMutation.isPending ? "Checking in..." : "Check In"}</button> : null}</section> : null}
    {feedback ? <p aria-live="polite" className={error ? "rounded-xl bg-[#fff2f0] px-4 py-3 text-sm font-semibold text-[#b42318]" : "rounded-xl bg-[#e8f6ee] px-4 py-3 text-sm font-semibold text-[#1f6a58]"}>{feedback}</p> : null}
    {report.participants.length === 0 ? <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-12 text-center shadow-sm"><p className="font-bold text-[#06201c]">No attendance records yet</p><p className="mt-2 text-sm text-[#52736a]">Attendance will appear once registered participants are checked in.</p></section> : <section className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="w-full sm:max-w-md"><span className="sr-only">Search participants</span><input type="search" value={participantSearch} onChange={(event) => setParticipantSearch(event.target.value)} placeholder="Search participants..." className="h-11 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]" /></label><p aria-live="polite" className="text-sm text-[#52736a]">{normalizedSearch ? filteredParticipants.length + " of " + report.participants.length + " participants" : report.participants.length + " participants"}</p></div>{filteredParticipants.length === 0 ? <div className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-12 text-center shadow-sm"><p className="font-bold text-[#06201c]">No participants found</p><p className="mt-2 text-sm text-[#52736a]">Try a different name or email.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{filteredParticipants.map((participant) => <AttendanceParticipantCard key={participant.registration_id} attendanceOperational={attendanceOperational} participant={participant} timeZone={timeZone} pending={pending(participant)} isCheckingIn={checkInMutation.isPending && checkInMutation.variables?.registration_id === participant.registration_id} isUndoing={uncheckInMutation.isPending && uncheckInMutation.variables?.registration_id === participant.registration_id} isCheckingOut={checkOutMutation.isPending && checkOutMutation.variables?.registration_id === participant.registration_id} onCheckIn={() => { if (attendanceOperational) { setFeedback(null); checkInMutation.mutate(participant); } }} onUndo={() => { if (attendanceOperational) { setFeedback(null); uncheckInMutation.mutate(participant); } }} onCheckOut={() => { if (attendanceOperational) { setFeedback(null); checkOutMutation.mutate(participant); } }} />)}</div>}</section>}
  </section>;
}

function AttendanceParticipantCard({ attendanceOperational, participant, timeZone, pending, isCheckingIn, isUndoing, isCheckingOut, onCheckIn, onUndo, onCheckOut }: { attendanceOperational: boolean; participant: EventAttendanceParticipant; timeZone: string; pending: boolean; isCheckingIn: boolean; isUndoing: boolean; isCheckingOut: boolean; onCheckIn: () => void; onUndo: () => void; onCheckOut: () => void }) {
  return <article className="flex flex-col gap-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[#06201c]">{participant.participant_name}</p><p className="mt-1 text-sm text-[#52736a]">{participant.participant_email}</p><div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-[#edf3f0] px-3 py-1 text-[#31594d]">{humanizeStatus(participant.status)}</span><span className={participant.checked_in_at ? "rounded-full bg-[#e8f6ee] px-3 py-1 text-[#1f6a58]" : "rounded-full bg-[#f5f7f6] px-3 py-1 text-[#52736a]"}>{participant.checked_in_at ? "Checked in " + formatAttendanceAuditDateTime(participant.checked_in_at, timeZone) : "Not checked in"}</span>{participant.checked_out_at ? <span className="rounded-full bg-[#fff6e8] px-3 py-1 text-[#8a5a12]">Checked out {formatAttendanceAuditDateTime(participant.checked_out_at, timeZone)}</span> : null}</div></div>{attendanceOperational ? <div className="flex flex-wrap gap-2">{canUndoCheckIn(participant) ? <button type="button" disabled={pending} onClick={onUndo} className="h-10 rounded-full border border-[#b87923] px-4 text-sm font-bold text-[#8a5a12] disabled:cursor-not-allowed disabled:opacity-60">{isUndoing ? "Undoing..." : "Undo Check-in"}</button> : null}{canCheckOut(participant) ? <button type="button" disabled={pending} onClick={onCheckOut} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{isCheckingOut ? "Checking out..." : "Check Out"}</button> : null}{!canUndoCheckIn(participant) && canCheckIn(participant) ? <button type="button" disabled={pending} onClick={onCheckIn} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{isCheckingIn ? "Checking in..." : "Check In"}</button> : null}</div> : null}</article>;
}

type QrDetector = { detect: (source: ImageBitmapSource) => Promise<readonly { rawValue?: string }[]> };
type QrDetectorConstructor = new (options?: { formats?: string[] }) => QrDetector;

function getQrDetectorConstructor(): QrDetectorConstructor | null {
  return (window as unknown as { BarcodeDetector?: QrDetectorConstructor }).BarcodeDetector ?? null;
}

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
        setError("No camera is available. You can enter the ticket code manually.");
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
          setCameraStatus("Camera ready. Point it at a ticket QR code.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        streamRef.current = stream;
        if (!videoRef.current) { stop(); return; }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraStatus("Camera ready. Point it at a ticket QR code.");
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
        setError("Unable to access the camera. You can enter the ticket code manually.");
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
  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title" aria-describedby="qr-scanner-status" className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/60 p-4"><section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between gap-4"><h2 id="qr-scanner-title" className="text-lg font-bold text-[#06201c]">Scan ticket QR code</h2><button type="button" autoFocus onClick={closeScanner} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-bold text-[#31594d]">Cancel</button></div><p id="qr-scanner-status" aria-live="polite" className="sr-only">{error ?? cameraStatus}</p>{error ? <p role="alert" className="mt-5 text-sm font-semibold text-[#b42318]">{error}</p> : <div className="relative mt-5 overflow-hidden rounded-xl bg-[#06201c]"><video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" /><div aria-hidden="true" className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/80" /></div>}<button type="button" onClick={closeScanner} className="mt-4 text-sm font-semibold text-[#1f6a58] underline">Close scanner</button></section></div>;
}
