"use client";

import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { deleteEvent, duplicateEvent, EventsApiError, updateEventStatus, type Event } from "./events.service";
import { canDeleteEvent, canEditEvent, getEventStatusActions, type EventStatusAction } from "./event-status";

/** Props for the shared Event card/detail contextual action menu. */
export interface EventActionsMenuProps {
  event: Event;
  includeNavigation?: boolean;
  onStatusSuccess?: (event: Event, action: EventStatusAction) => void;
  onDuplicateSuccess?: (event: Event) => void;
  onDeleteSuccess?: () => void;
}

interface SecondaryEventAction { label: string; confirmationTitle: string; confirmationDescription: string; confirmLabel: string; cancelLabel: string; pendingLabel: string; }
type ConfirmationAction = { kind: "status"; action: EventStatusAction } | { kind: "duplicate" | "delete"; action: SecondaryEventAction };
type MenuPosition = { top: number; left: number };

const duplicateEventAction: SecondaryEventAction = { label: "Duplicate event", confirmationTitle: "Duplicate event?", confirmationDescription: "A new event will be created using the details from this event.", confirmLabel: "Duplicate event", cancelLabel: "Cancel", pendingLabel: "Duplicating..." };
const deleteEventAction: SecondaryEventAction = { label: "Delete event", confirmationTitle: "Delete event?", confirmationDescription: "This event will be removed from your Events list. This action may not be reversible.", confirmLabel: "Delete event", cancelLabel: "Keep event", pendingLabel: "Deleting..." };

/** Renders accessible Event navigation and backend-authoritative lifecycle actions. */
export default function EventActionsMenu({ event, includeNavigation = true, onStatusSuccess, onDuplicateSuccess, onDeleteSuccess }: EventActionsMenuProps) {
  const queryClient = useQueryClient();
  const menuRootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const statusActions = getEventStatusActions(event.status);
  const canEdit = canEditEvent(event.status);
  const canDelete = canDeleteEvent(event.status);

  const closeConfirmation = () => {
    setConfirmationAction(null);
    setCancellationReason("");
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const statusMutation = useMutation({
    mutationFn: (action: EventStatusAction) => updateEventStatus(event.id, { status: action.targetStatus, ...(action.targetStatus === "cancelled" && cancellationReason.trim() ? { reason: cancellationReason.trim() } : {}) }),
    onSuccess: async (updatedEvent, action) => { await invalidateEventQueries(queryClient, event.id); closeConfirmation(); onStatusSuccess?.(updatedEvent, action); },
    onError: (error) => { closeConfirmation(); setActionError(getStatusErrorMessage(error)); },
  });
  const duplicateMutation = useMutation({
    mutationFn: () => duplicateEvent(event.id),
    onSuccess: async (duplicatedEvent) => { await queryClient.invalidateQueries({ queryKey: ["events", "list"] }); closeConfirmation(); onDuplicateSuccess?.(duplicatedEvent); },
    onError: (error) => { closeConfirmation(); setActionError(getDuplicateErrorMessage(error)); },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(event.id),
    onSuccess: async () => { await invalidateEventQueries(queryClient, event.id); closeConfirmation(); onDeleteSuccess?.(); },
    onError: (error) => { closeConfirmation(); setActionError(getDeleteErrorMessage(error)); },
  });
  const isMutationPending = statusMutation.isPending || duplicateMutation.isPending || deleteMutation.isPending;

  useEffect(() => {
    const closeOnOutsidePointer = (pointerEvent: MouseEvent) => {
      const target = pointerEvent.target as Node;
      if (!menuRootRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => { if (keyboardEvent.key === "Escape") { setIsOpen(false); setConfirmationAction(null); triggerRef.current?.focus(); } };
    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutsidePointer); document.removeEventListener("keydown", closeOnEscape); };
  }, []);
  useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }

    const updateMenuPosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const margin = 12;
      const gap = 8;
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const alignedLeft = triggerRect.right - menuRect.width;
      const left = Math.max(margin, Math.min(alignedLeft, viewportWidth - menuRect.width - margin));
      const below = triggerRect.bottom + gap;
      const above = triggerRect.top - menuRect.height - gap;
      const top = below + menuRect.height <= viewportHeight - margin || above < margin ? below : above;
      setMenuPosition({ top, left });
    };

    const frameId = window.requestAnimationFrame(updateMenuPosition);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);
  useEffect(() => { if (confirmationAction) cancelButtonRef.current?.focus(); }, [confirmationAction]);

  const selectAction = (action: ConfirmationAction) => { setIsOpen(false); setActionError(null); setCancellationReason(""); setConfirmationAction(action); };
  const confirmAction = () => {
    if (!confirmationAction || isMutationPending) return;
    setActionError(null);
    if (confirmationAction.kind === "status") statusMutation.mutate(confirmationAction.action);
    else if (confirmationAction.kind === "duplicate") duplicateMutation.mutate();
    else deleteMutation.mutate();
  };

  return <div ref={menuRootRef} className="relative inline-flex flex-col items-end"><button ref={triggerRef} type="button" aria-label="Event actions" aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)} onKeyDown={(keyboardEvent) => openMenuWithKeyboard(keyboardEvent, menuRef, setIsOpen)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e5df] text-[#52736a] outline-none transition hover:bg-[#f4faf7] focus-visible:ring-2 focus-visible:ring-[#1f6a58] disabled:opacity-60" disabled={isMutationPending}><MoreVerticalIcon /></button>
    {isOpen && typeof document !== "undefined" ? createPortal(<div ref={menuRef} role="menu" aria-label="Event actions" onKeyDown={handleMenuArrowKeys} className="fixed z-[100] min-w-48 rounded-xl border border-[#e1ebe6] bg-white p-1.5 shadow-xl" style={menuPosition ? { top: menuPosition.top, left: menuPosition.left } : { top: 0, left: 0, visibility: "hidden" }}>{includeNavigation ? <><MenuLink href={`/admin/events/${event.id}`}>View details</MenuLink>{canEdit ? <MenuLink href={`/admin/events/${event.id}/edit`}>Edit event</MenuLink> : null}</> : null}<button role="menuitem" type="button" onClick={() => selectAction({ kind: "duplicate", action: duplicateEventAction })} className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#52736a] outline-none hover:bg-[#f4faf7] focus-visible:bg-[#f4faf7]">Duplicate event</button>{statusActions.length > 0 ? <div role="separator" className="my-1 border-t border-[#edf3f0]" /> : null}{statusActions.map((action) => <button key={action.targetStatus} role="menuitem" type="button" onClick={() => selectAction({ kind: "status", action })} className={`flex w-full rounded-lg px-3 py-2 text-left text-sm font-semibold outline-none hover:bg-[#f4faf7] focus-visible:bg-[#f4faf7] ${action.targetStatus === "cancelled" ? "text-[#b42318]" : "text-[#1f6a58]"}`}>{action.label}</button>)}{canDelete ? <><div role="separator" className="my-1 border-t border-[#f3d5d1]" /><button role="menuitem" type="button" onClick={() => selectAction({ kind: "delete", action: deleteEventAction })} className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#b42318] outline-none hover:bg-[#fff7f6] focus-visible:bg-[#fff7f6]">Delete event</button></> : null}</div>, document.body) : null}
    {actionError ? <p role="alert" className="mt-2 max-w-56 text-right text-xs font-medium text-[#b42318]">{actionError}</p> : null}
    {confirmationAction && typeof document !== "undefined" ? createPortal(<EventActionConfirmationDialog action={confirmationAction.action} cancellationReason={cancellationReason} isPending={isMutationPending} cancelButtonRef={cancelButtonRef} onCancellationReasonChange={setCancellationReason} onCancel={closeConfirmation} onConfirm={confirmAction} destructive={confirmationAction.kind === "delete" || (confirmationAction.kind === "status" && confirmationAction.action.targetStatus === "cancelled")} />, document.body) : null}
  </div>;
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link role="menuitem" href={href} className="block rounded-lg px-3 py-2 text-sm font-semibold text-[#52736a] outline-none hover:bg-[#f4faf7] focus-visible:bg-[#f4faf7]">{children}</Link>; }
function EventActionConfirmationDialog({ action, cancellationReason, isPending, cancelButtonRef, onCancellationReasonChange, onCancel, onConfirm, destructive }: { action: EventStatusAction | SecondaryEventAction; cancellationReason: string; isPending: boolean; cancelButtonRef: React.RefObject<HTMLButtonElement | null>; onCancellationReasonChange: (reason: string) => void; onCancel: () => void; onConfirm: () => void; destructive: boolean }) {
  const isCancellation = "targetStatus" in action && action.targetStatus === "cancelled";
  return <div className="fixed inset-0 z-[110] flex items-end bg-[#06201c]/35 p-0 sm:items-center sm:justify-center sm:p-5" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="event-status-confirmation-title" aria-describedby="event-status-confirmation-description" onKeyDown={trapDialogFocus} className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"><h2 id="event-status-confirmation-title" className="text-lg font-bold text-[#06201c]">{action.confirmationTitle}</h2><p id="event-status-confirmation-description" className="mt-2 text-sm leading-6 text-[#52736a]">{action.confirmationDescription}</p>{isCancellation ? <label className="mt-4 block text-sm font-semibold text-[#06201c]">Reason <span className="font-normal text-[#52736a]">(optional)</span><textarea value={cancellationReason} onChange={(event) => onCancellationReasonChange(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-[#d7e5df] p-3 font-normal outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20" /></label> : null}<div className="mt-6 flex justify-end gap-3"><button ref={cancelButtonRef} type="button" onClick={onCancel} disabled={isPending} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:opacity-60">{action.cancelLabel}</button><button type="button" onClick={onConfirm} disabled={isPending} className={`h-10 rounded-full px-4 text-sm font-bold text-white disabled:opacity-60 ${destructive ? "bg-[#b42318]" : "bg-[#1f6a58]"}`}>{isPending ? action.pendingLabel : action.confirmLabel}</button></div></div></div>;
}

async function invalidateEventQueries(queryClient: QueryClient, eventId: string) { await Promise.all([queryClient.invalidateQueries({ queryKey: ["events", "list"] }), queryClient.invalidateQueries({ queryKey: ["events", "detail", eventId] })]); }
function getStatusErrorMessage(error: unknown): string { if (!(error instanceof EventsApiError)) return "Unable to update the event status. Please try again."; if (error.status === 401 || error.status === 403) return "You do not have permission to change this event status."; if (error.status === 404) return "This event no longer exists."; if (error.status === 409) return "This status change is not allowed for the event's current lifecycle state."; if (error.status === 422) return error.fieldErrors.status?.[0] ?? "This status change was not accepted."; return "Unable to update the event status. Please try again."; }
function getDuplicateErrorMessage(error: unknown): string { if (!(error instanceof EventsApiError)) return "Unable to duplicate this event. Please try again."; if (error.status === 401 || error.status ===403) return "You do not have permission to duplicate this event."; if (error.status === 404) return "This event no longer exists."; return "Unable to duplicate this event. Please try again."; }
function getDeleteErrorMessage(error: unknown): string { if (!(error instanceof EventsApiError)) return "Unable to delete this event. Please try again."; if (error.status === 401 || error.status === 403) return "You do not have permission to delete this event."; if (error.status === 404) return "This event no longer exists."; if (error.status === 409) return "This event cannot be deleted because it has related records or lifecycle restrictions."; return "Unable to delete this event. Please try again."; }
function handleMenuArrowKeys(event: React.KeyboardEvent<HTMLDivElement>) { if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return; const menuItems = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')); const currentIndex = menuItems.findIndex((item) => item === document.activeElement); const nextIndex = event.key === "ArrowDown" ? (currentIndex + 1 + menuItems.length) % menuItems.length : (currentIndex - 1 + menuItems.length) % menuItems.length; menuItems[nextIndex]?.focus(); event.preventDefault(); }
function openMenuWithKeyboard(event: React.KeyboardEvent<HTMLButtonElement>, menuRef: React.RefObject<HTMLDivElement | null>, setIsOpen: React.Dispatch<React.SetStateAction<boolean>>) { if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return; setIsOpen(true); window.requestAnimationFrame(() => { const menuItems = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]'); const target = event.key === "ArrowDown" ? menuItems?.[0] : menuItems?.[menuItems.length - 1]; target?.focus(); }); event.preventDefault(); }
function trapDialogFocus(event: React.KeyboardEvent<HTMLDivElement>) { if (event.key !== "Tab") return; const focusableElements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')); const currentIndex = focusableElements.findIndex((element) => element === document.activeElement); const nextIndex = event.shiftKey ? (currentIndex - 1 + focusableElements.length) % focusableElements.length : (currentIndex + 1) % focusableElements.length; focusableElements[nextIndex]?.focus(); event.preventDefault(); }
function MoreVerticalIcon() { return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M12 5v.01M12 12v.01M12 19v.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>; }
