"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Props for a review item's compact, fully discoverable name. */
export interface ReviewItemNameProps {
  /** The complete item name used for the hover tooltip and accessible text. */
  fullName: string;
  /** Visible name content, which may include the original full text. */
  children: ReactNode;
}

/** Shows a compact two-line item name while keeping the full name available on hover. */
export function ReviewItemName({ fullName, children }: ReviewItemNameProps) {
  return <span title={fullName} className="block line-clamp-2 break-words">{children}</span>;
}

export function ReviewerIdentity({ name, email, verified, verifiedLabel = "Verified" }: { name: string; email?: string | null; verified?: boolean; verifiedLabel?: string }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toLocaleUpperCase()).join("");
  return <div className="flex min-w-0 items-center gap-3">
    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e5f3ec] text-sm font-bold text-[#1f6a58]">{initials || "?"}</span>
    <div className="min-w-0">
      <p className="truncate font-bold text-[#06201c]">{name}{verified ? <span className="ml-2 inline-flex rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[11px] font-semibold text-[#1f6a58]">{verifiedLabel}</span> : null}</p>
      {email ? <p className="mt-0.5 break-all text-xs text-[#52736a]">{email}</p> : null}
    </div>
  </div>;
}

export function ReviewComment({ comment, label = "Review comment", emptyLabel = "No written comment provided." }: { comment?: string | null; label?: string; emptyLabel?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const measureOverflow = () => setHasMore(element.scrollHeight > element.clientHeight + 1);
    measureOverflow();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measureOverflow);
    observer?.observe(element);
    window.addEventListener("resize", measureOverflow);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measureOverflow);
    };
  }, [comment, expanded]);

  if (!comment?.trim()) return <p className="text-sm italic text-[#829a92]">{emptyLabel}</p>;
  return <div className="min-w-0 rounded-xl bg-[#f5faf7] px-4 py-3">
    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#809a90]">{label}</p>
    <p ref={contentRef} className={`whitespace-pre-wrap break-words text-sm leading-6 text-[#31594d] ${expanded ? "" : "line-clamp-2"}`}>{comment}</p>
    {hasMore ? <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="mt-1 text-sm font-semibold text-[#1f6a58] underline underline-offset-2">{expanded ? "Show less" : "Show more"}</button> : null}
  </div>;
}

export function ReviewCardLayout({ item, reviewer, rating, status, date, latestAction, children, footer, focused = false }: { item?: ReactNode; reviewer: ReactNode; rating: ReactNode; status: ReactNode; date: ReactNode; latestAction?: ReactNode; children?: ReactNode; footer?: ReactNode; focused?: boolean }) {
  return <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${focused ? "border-[#1f6a58] ring-2 ring-[#1f6a58]/30" : "border-[#dfeae5]"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf2ef] bg-[#fbfdfc] px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1">{item}</div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{rating}{status}</div>
    </div>
    <div className="grid gap-4 p-4 sm:grid-cols-[minmax(190px,0.85fr)_minmax(240px,1.5fr)_minmax(155px,0.8fr)] sm:items-start sm:px-5">
      <div className="min-w-0">{reviewer}</div>
      <div className="min-w-0">{children}</div>
      <div className="flex items-start gap-2 text-sm text-[#52736a] sm:justify-end">{date}</div>
    </div>
    {latestAction ? <div className="border-t border-[#edf2ef] px-4 py-2.5 text-xs font-medium text-[#52736a] sm:px-5">{latestAction}</div> : null}
    {footer ? <div className="border-t border-[#edf2ef] px-4 py-3 sm:px-5">{footer}</div> : null}
  </article>;
}
