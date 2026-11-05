"use client";

import React, { useEffect, useRef } from "react";

export interface BlogConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Accessible confirmation modal conforming to WCAG 2.1 AA alertdialog guidelines.
 * Replaces blocking browser-native window.confirm() dialogs.
 */
export function BlogConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  isPending = false,
  onConfirm,
  onCancel,
}: BlogConfirmationModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
    const timer = window.requestAnimationFrame(() => {
      cancelBtnRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(timer);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElementRef.current?.focus();
    };
  }, [isOpen, isPending, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!isPending) onCancel();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="blog-modal-title"
        aria-describedby="blog-modal-message"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h3 id="blog-modal-title" className="text-base font-bold text-[#06201c]">
          {title}
        </h3>
        <p id="blog-modal-message" className="mt-2 text-xs leading-relaxed text-[#52736a]">
          {message}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="rounded-xl border border-[#d7e5df] px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => void onConfirm()}
            className={`rounded-xl px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${
              destructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-[#1f6a58] hover:bg-[#175245]"
            }`}
          >
            {isPending ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
export default BlogConfirmationModal;
