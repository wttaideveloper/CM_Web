"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { calculateGroupChatPopupPlacement, shouldDismissGroupChatPopupOnKey, shouldDismissGroupChatPopupOnPointer, type GroupChatPopupAlignment, type GroupChatPopupPlacement } from "./group-chat-popup-position";

type Props = {
  anchorRef: RefObject<HTMLElement | null>;
  boundaryRef: RefObject<HTMLElement | null>;
  alignment?: GroupChatPopupAlignment;
  className: string;
  id: string;
  role: "menu";
  ariaLabel: string;
  onDismiss: () => void;
  children: ReactNode;
};

/** Renders a Group Chat menu outside the clipped history tree and keeps it inside that viewport. */
export function GroupChatAnchoredPopup({ anchorRef, boundaryRef, alignment = "start", className, id, role, ariaLabel, onDismiss, children }: Props) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const skipRestoreFocusRef = useRef(false);
  const [placement, setPlacement] = useState<GroupChatPopupPlacement | null>(null);

  useEffect(() => {
    const updatePlacement = () => {
      frameRef.current = null;
      const anchor = anchorRef.current;
      const boundary = boundaryRef.current;
      const popup = popupRef.current;
      if (!anchor || !boundary || !popup) return;

      const anchorRect = anchor.getBoundingClientRect();
      const boundaryRect = boundary.getBoundingClientRect();
      const anchorIsOutside = anchorRect.bottom <= boundaryRect.top || anchorRect.top >= boundaryRect.bottom || anchorRect.right <= boundaryRect.left || anchorRect.left >= boundaryRect.right;
      if (anchorIsOutside) {
        skipRestoreFocusRef.current = true;
        onDismiss();
        return;
      }

      const next = calculateGroupChatPopupPlacement({
        anchor: toPopupRect(anchorRect),
        popup: { width: popup.offsetWidth, height: popup.offsetHeight },
        boundary: {
          top: Math.max(0, boundaryRect.top),
          right: Math.min(window.innerWidth, boundaryRect.right),
          bottom: Math.min(window.innerHeight, boundaryRect.bottom),
          left: Math.max(0, boundaryRect.left),
          width: Math.max(0, Math.min(window.innerWidth, boundaryRect.right) - Math.max(0, boundaryRect.left)),
          height: Math.max(0, Math.min(window.innerHeight, boundaryRect.bottom) - Math.max(0, boundaryRect.top)),
        },
        alignment,
      });
      setPlacement((current) => current && current.top === next.top && current.left === next.left && current.maxHeight === next.maxHeight && current.maxWidth === next.maxWidth
        ? current
        : next);
    };

    const schedulePlacement = () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = window.requestAnimationFrame(updatePlacement);
    };
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (shouldDismissGroupChatPopupOnPointer(anchorRef.current?.contains(target) ?? false, popupRef.current?.contains(target) ?? false)) {
        skipRestoreFocusRef.current = true;
        onDismiss();
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (!shouldDismissGroupChatPopupOnKey(event.key)) return;
      event.preventDefault();
      skipRestoreFocusRef.current = false;
      onDismiss();
    };

    schedulePlacement();
    window.addEventListener("resize", schedulePlacement);
    window.addEventListener("scroll", schedulePlacement, true);
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedulePlacement);
    if (anchorRef.current) resizeObserver?.observe(anchorRef.current);
    if (boundaryRef.current) resizeObserver?.observe(boundaryRef.current);
    if (popupRef.current) resizeObserver?.observe(popupRef.current);

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", schedulePlacement);
      window.removeEventListener("scroll", schedulePlacement, true);
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
      resizeObserver?.disconnect();
    };
  }, [alignment, anchorRef, boundaryRef, onDismiss]);

  useEffect(() => () => {
    const activeElement = document.activeElement;
    if (skipRestoreFocusRef.current || !activeElement || !popupRef.current?.contains(activeElement)) return;
    window.requestAnimationFrame(() => anchorRef.current?.focus());
  }, [anchorRef]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={popupRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      className={`${className} fixed z-[200] overflow-y-auto overscroll-contain`}
      style={placement
        ? { top: placement.top, left: placement.left, maxHeight: placement.maxHeight, maxWidth: placement.maxWidth }
        : { top: 0, left: 0, visibility: "hidden", maxHeight: "calc(100vh - 16px)" }}
    >
      {children}
    </div>,
    document.body,
  );
}

function toPopupRect(rect: DOMRect): { top: number; right: number; bottom: number; left: number; width: number; height: number } {
  return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height };
}
