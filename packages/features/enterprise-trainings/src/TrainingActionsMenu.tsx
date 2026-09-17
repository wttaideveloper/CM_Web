"use client";

import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { deleteTraining, duplicateTraining, resubmitTraining, restoreTraining, TrainingsApiError, updateTrainingStatus, type Training, type TrainingListItem } from "./trainings.service";
import { canDeleteTraining, canEditTraining, getTrainingStatusActions, type TrainingStatusAction } from "./training-status";

/** Props for the shared Training card/detail contextual action menu. */
export interface TrainingActionsMenuProps {
  training: TrainingListItem;
  includeNavigation?: boolean;
  onStatusSuccess?: (training: Training, action: TrainingStatusAction) => void;
  onDuplicateSuccess?: (training: Training) => void;
  onDeleteSuccess?: () => void;
}

interface SecondaryTrainingAction { label: string; confirmationTitle: string; confirmationDescription: string; confirmLabel: string; cancelLabel: string; pendingLabel: string; }
type ConfirmationAction = { kind: "status"; action: TrainingStatusAction } | { kind: "duplicate" | "delete"; action: SecondaryTrainingAction };
type MenuPosition = { top: number; left: number };

const duplicateTrainingAction: SecondaryTrainingAction = { label: "Duplicate training", confirmationTitle: "Duplicate training?", confirmationDescription: "A new training will be created using the details from this training.", confirmLabel: "Duplicate training", cancelLabel: "Cancel", pendingLabel: "Duplicating..." };
const deleteTrainingAction: SecondaryTrainingAction = { label: "Delete training", confirmationTitle: "Delete training?", confirmationDescription: "This training will be removed from your Trainings list. This action may not be reversible.", confirmLabel: "Delete training", cancelLabel: "Keep training", pendingLabel: "Deleting..." };

/** Renders accessible Training navigation and backend-authoritative lifecycle actions. */
export default function TrainingActionsMenu({ training, includeNavigation = true, onStatusSuccess, onDuplicateSuccess, onDeleteSuccess }: TrainingActionsMenuProps) {
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
  const statusActions = getTrainingStatusActions(training.status);
  const canEdit = canEditTraining(training.status);
  const canDelete = canDeleteTraining(training.status);

  const closeConfirmation = () => {
    setConfirmationAction(null);
    setCancellationReason("");
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const statusMutation = useMutation({
    mutationFn: (action: TrainingStatusAction) => {
      const isResubmit = action.targetStatus === "pending_approval" && (training.status === "rejected" || training.status === "needs_revision");
      if (isResubmit) return resubmitTraining(training.id) as Promise<Training>;
      if (action.targetStatus === "draft" && training.status === "archived") return restoreTraining(training.id) as Promise<Training>;
      return updateTrainingStatus(training.id, { status: action.targetStatus, ...(action.targetStatus === "cancelled" && cancellationReason.trim() ? { reason: cancellationReason.trim() } : {}) });
    },
    onSuccess: async (updatedTraining, action) => { await invalidateTrainingQueries(queryClient, training.id); closeConfirmation(); onStatusSuccess?.(updatedTraining, action); },
    onError: (error) => { closeConfirmation(); setActionError(getStatusErrorMessage(error)); },
  });
  const duplicateMutation = useMutation({
    mutationFn: () => duplicateTraining(training.id),
    onSuccess: async (duplicatedTraining) => { await queryClient.invalidateQueries({ queryKey: ["trainings", "list"] }); closeConfirmation(); onDuplicateSuccess?.(duplicatedTraining); },
    onError: (error) => { closeConfirmation(); setActionError(getDuplicateErrorMessage(error)); },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteTraining(training.id),
    onSuccess: async () => { await invalidateTrainingQueries(queryClient, training.id); closeConfirmation(); onDeleteSuccess?.(); },
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

  return <div ref={menuRootRef} className="relative inline-flex flex-col items-end"><button ref={triggerRef} type="button" aria-label="Training actions" aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)} onKeyDown={(keyboardEvent) => openMenuWithKeyboard(keyboardEvent, menuRef, setIsOpen)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e5df] text-[#52736a] outline-none transition hover:bg-[#f4faf7] focus-visible:ring-2 focus-visible:ring-[#1f6a58] disabled:opacity-60" disabled={isMutationPending}><MoreVerticalIcon /></button>
    {isOpen && typeof document !== "undefined" ? createPortal(<div ref={menuRef} role="menu" aria-label="Training actions" onKeyDown={handleMenuArrowKeys} className="fixed z-[100] min-w-48 rounded-xl border border-[#e1ebe6] bg-white p-1.5 shadow-xl" style={menuPosition ? { top: menuPosition.top, left: menuPosition.left } : { top: 0, left: 0, visibility: "hidden" }}>{includeNavigation ? <><MenuLink href={`/admin/trainings/${training.id}`}>View details</MenuLink>{canEdit ? <MenuLink href={`/admin/trainings/${training.id}/edit`}>Edit training</MenuLink> : null}</> : null}<button role="menuitem" type="button" onClick={() => selectAction({ kind: "duplicate", action: duplicateTrainingAction })} className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#52736a] outline-none hover:bg-[#f4faf7] focus-visible:bg-[#f4faf7]">Duplicate training</button>{statusActions.length > 0 ? <div role="separator" className="my-1 border-t border-[#edf3f0]" /> : null}{statusActions.map((action) => <button key={action.targetStatus} role="menuitem" type="button" onClick={() => selectAction({ kind: "status", action })} className={`flex w-full rounded-lg px-3 py-2 text-left text-sm font-semibold outline-none hover:bg-[#f4faf7] focus-visible:bg-[#f4faf7] ${action.targetStatus === "cancelled" ? "text-[#b42318]" : "text-[#1f6a58]"}`}>{action.label}</button>)}{canDelete ? <><div role="separator" className="my-1 border-t border-[#f3d5d1]" /><button role="menuitem" type="button" onClick={() => selectAction({ kind: "delete", action: deleteTrainingAction })} className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#b42318] outline-none hover:bg-[#fff7f6] focus-visible:bg-[#fff7f6]">Delete training</button></> : null}</div>, document.body) : null}
    {actionError ? <p role="alert" className="mt-2 max-w-56 text-right text-xs font-medium text-[#b42318]">{actionError}</p> : null}
    {confirmationAction && typeof document !== "undefined" ? createPortal(<TrainingActionConfirmationDialog action={confirmationAction.action} cancellationReason={cancellationReason} isPending={isMutationPending} cancelButtonRef={cancelButtonRef} onCancellationReasonChange={setCancellationReason} onCancel={closeConfirmation} onConfirm={confirmAction} destructive={confirmationAction.kind === "delete" || (confirmationAction.kind === "status" && confirmationAction.action.targetStatus === "cancelled")} />, document.body) : null}
  </div>;
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link role="menuitem" href={href} className="block rounded-lg px-3 py-2 text-sm font-semibold text-[#52736a] outline-none hover:bg-[#f4faf7] focus-visible:bg-[#f4faf7]">{children}</Link>; }
function TrainingActionConfirmationDialog({ action, cancellationReason, isPending, cancelButtonRef, onCancellationReasonChange, onCancel, onConfirm, destructive }: { action: TrainingStatusAction | SecondaryTrainingAction; cancellationReason: string; isPending: boolean; cancelButtonRef: React.RefObject<HTMLButtonElement | null>; onCancellationReasonChange: (reason: string) => void; onCancel: () => void; onConfirm: () => void; destructive: boolean }) {
  const isCancellation = "targetStatus" in action && action.targetStatus === "cancelled";
  return <div className="fixed inset-0 z-[110] flex items-end bg-[#06201c]/35 p-0 sm:items-center sm:justify-center sm:p-5" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="training-status-confirmation-title" aria-describedby="training-status-confirmation-description" onKeyDown={trapDialogFocus} className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"><h2 id="training-status-confirmation-title" className="text-lg font-bold text-[#06201c]">{action.confirmationTitle}</h2><p id="training-status-confirmation-description" className="mt-2 text-sm leading-6 text-[#52736a]">{action.confirmationDescription}</p>{isCancellation ? <label className="mt-4 block text-sm font-semibold text-[#06201c]">Reason <span className="font-normal text-[#52736a]">(optional)</span><textarea value={cancellationReason} onChange={(event) => onCancellationReasonChange(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-[#d7e5df] p-3 font-normal outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20" /></label> : null}<div className="mt-6 flex justify-end gap-3"><button ref={cancelButtonRef} type="button" onClick={onCancel} disabled={isPending} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:opacity-60">{action.cancelLabel}</button><button type="button" onClick={onConfirm} disabled={isPending} className={`h-10 rounded-full px-4 text-sm font-bold text-white disabled:opacity-60 ${destructive ? "bg-[#b42318]" : "bg-[#1f6a58]"}`}>{isPending ? action.pendingLabel : action.confirmLabel}</button></div></div></div>;
}

async function invalidateTrainingQueries(queryClient: QueryClient, trainingId: string) { await Promise.all([queryClient.invalidateQueries({ queryKey: ["trainings", "list"] }), queryClient.invalidateQueries({ queryKey: ["trainings", "detail", trainingId] })]); }
function getStatusErrorMessage(error: unknown): string { if (!(error instanceof TrainingsApiError)) return "Unable to update the training status. Please try again."; if (error.status === 401 || error.status === 403) return "You do not have permission to change this training status."; if (error.status === 404) return "This training no longer exists."; if (error.status === 409) return "This status change is not allowed for the training's current lifecycle state."; if (error.status === 422) return error.fieldErrors.status?.[0] ?? "This status change was not accepted."; return "Unable to update the training status. Please try again."; }
function getDuplicateErrorMessage(error: unknown): string { if (!(error instanceof TrainingsApiError)) return "Unable to duplicate this training. Please try again."; if (error.status === 401 || error.status === 403) return "You do not have permission to duplicate this training."; if (error.status === 404) return "This training no longer exists."; return "Unable to duplicate this training. Please try again."; }
function getDeleteErrorMessage(error: unknown): string { if (!(error instanceof TrainingsApiError)) return "Unable to delete this training. Please try again."; if (error.status === 401 || error.status === 403) return "You do not have permission to delete this training."; if (error.status === 404) return "This training no longer exists."; if (error.status === 409) return "This training cannot be deleted because it has related records or lifecycle restrictions."; return "Unable to delete this training. Please try again."; }
function handleMenuArrowKeys(event: React.KeyboardEvent<HTMLDivElement>) { if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return; const menuItems = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')); const currentIndex = menuItems.findIndex((item) => item === document.activeElement); const nextIndex = event.key === "ArrowDown" ? (currentIndex + 1 + menuItems.length) % menuItems.length : (currentIndex - 1 + menuItems.length) % menuItems.length; menuItems[nextIndex]?.focus(); event.preventDefault(); }
function openMenuWithKeyboard(event: React.KeyboardEvent<HTMLButtonElement>, menuRef: React.RefObject<HTMLDivElement | null>, setIsOpen: React.Dispatch<React.SetStateAction<boolean>>) { if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return; setIsOpen(true); window.requestAnimationFrame(() => { const menuItems = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]'); const target = event.key === "ArrowDown" ? menuItems?.[0] : menuItems?.[menuItems.length - 1]; target?.focus(); }); event.preventDefault(); }
function trapDialogFocus(event: React.KeyboardEvent<HTMLDivElement>) { if (event.key !== "Tab") return; const focusableElements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')); const currentIndex = focusableElements.findIndex((element) => element === document.activeElement); const nextIndex = event.shiftKey ? (currentIndex - 1 + focusableElements.length) % focusableElements.length : (currentIndex + 1) % focusableElements.length; focusableElements[nextIndex]?.focus(); event.preventDefault(); }
function MoreVerticalIcon() { return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M12 5v.01M12 12v.01M12 19v.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>; }