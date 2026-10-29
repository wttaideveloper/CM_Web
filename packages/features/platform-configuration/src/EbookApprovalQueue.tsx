"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getEbookApprovalReview, getPendingEbooks, reviewEbook, type EbookReviewDecision, type PendingEbookItem } from "./ebook-approval.service";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function formatDateTime(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function displayValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function routeEbookImagesThroughMediaProxy(content: string): string {
  if (typeof DOMParser === "undefined") return content;
  const pageDocument = new DOMParser().parseFromString(content, "text/html");
  pageDocument.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    const source = image.getAttribute("src") ?? "";
    const sourceAssetId = source.match(/\/api\/v1\/media\/([^/?#]+)\/file(?:[?#]|$)/)?.[1];
    const assetId = image.dataset.assetId ?? image.getAttribute("data-asset-id") ?? image.getAttribute("asset_id") ?? sourceAssetId;
    if (!assetId || !/^[A-Za-z0-9_-]{1,128}$/.test(assetId)) return;
    image.setAttribute("src", `/api/platform-super-admin/media-asset/${encodeURIComponent(assetId)}/file`);
    image.removeAttribute("srcset");
  });
  return pageDocument.body.innerHTML;
}

function getEbookPagePreviewHtml(page: Record<string, unknown>): string {
  const content = typeof page.content_html === "string" ? page.content_html : typeof page.content === "string" ? page.content : "";
  const blocks = Array.isArray(page.blocks) ? page.blocks : [];
  const imageBlocks = blocks.map(asRecord).filter((block) => displayValue(block.type).toLowerCase() === "image");
  const textBlocks = blocks.map(asRecord).filter((block) => displayValue(block.type).toLowerCase() !== "image");
  const renderImage = (block: Record<string, unknown>): string => {
    const assetId = displayValue(block.asset_id ?? block.assetId);
    if (!assetId) return "";
    const imagePath = `/api/platform-super-admin/media-asset/${encodeURIComponent(assetId)}/file`;
    const altText = escapeHtml(displayValue(block.alt_text ?? block.altText));
    const caption = displayValue(block.caption);
    const width = block.width === "small" ? "45%" : block.width === "medium" ? "70%" : "100%";
    const fit = block.fit === "cover" ? "cover" : "contain";
    const allowedPositions = new Set(["center", "top", "bottom", "left", "right", "top left", "top right", "bottom left", "bottom right"]);
    const requestedPosition = displayValue(block.position).trim().toLowerCase();
    const position = allowedPositions.has(requestedPosition) ? requestedPosition : "center";
    const height = fit === "cover" ? "260px" : "auto";
    return `<figure><img src="${imagePath}" alt="${altText}" style="display:block;max-width:100%;width:${width};height:${height};object-fit:${fit};object-position:${position};margin:16px 0">${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`;
  };
  const hasOrderedTextBlocks = textBlocks.some((block) => typeof block.content_html === "string" || typeof block.content === "string");
  if (hasOrderedTextBlocks) {
    return blocks.map((value) => {
      const block = asRecord(value);
      return displayValue(block.type).toLowerCase() === "image"
        ? renderImage(block)
        : typeof block.content_html === "string" ? routeEbookImagesThroughMediaProxy(block.content_html) : typeof block.content === "string" ? escapeHtml(block.content) : "";
    }).join("");
  }
  const images = Array.isArray(page.images) ? page.images.map(asRecord) : [];
  if (images.length > 0 && typeof DOMParser !== "undefined") {
    const pageDocument = new DOMParser().parseFromString(content, "text/html");
    const imagesById = new Map(images.flatMap((image) => {
      const id = displayValue(image.id);
      return id ? [[id, image] as const] : [];
    }));
    const renderedImageIds = new Set<string>();
    pageDocument.querySelectorAll<HTMLElement>("[data-image-id]").forEach((placeholder) => {
      const imageId = placeholder.dataset.imageId ?? "";
      const image = imagesById.get(imageId);
      const assetId = image ? displayValue(image.asset_id ?? image.assetId) : "";
      if (!image || !assetId) return;
      const figure = pageDocument.createElement("figure");
      const imageElement = pageDocument.createElement("img");
      imageElement.src = `/api/platform-super-admin/media-asset/${encodeURIComponent(assetId)}/file`;
      imageElement.alt = displayValue(image.alt_text ?? image.altText);
      imageElement.style.maxWidth = "100%";
      imageElement.style.width = image.width === "small" ? "45%" : image.width === "medium" ? "70%" : "100%";
      imageElement.style.objectFit = displayValue(image.fit) === "cover" ? "cover" : "contain";
      imageElement.style.height = image.fit === "cover" ? "260px" : "auto";
      const allowedPositions = new Set(["center", "top", "bottom", "left", "right", "top left", "top right", "bottom left", "bottom right"]);
      const requestedPosition = displayValue(image.position).trim().toLowerCase();
      imageElement.style.objectPosition = allowedPositions.has(requestedPosition) ? requestedPosition : "center";
      imageElement.style.display = "block";
      imageElement.style.margin = "16px 0";
      figure.appendChild(imageElement);
      const caption = displayValue(image.caption);
      if (caption) {
        const captionElement = pageDocument.createElement("figcaption");
        captionElement.textContent = caption;
        figure.appendChild(captionElement);
      }
      placeholder.replaceWith(figure);
      renderedImageIds.add(imageId);
    });
    if (renderedImageIds.size > 0) {
      const remainingImages = images.filter((image) => !renderedImageIds.has(displayValue(image.id)));
      return routeEbookImagesThroughMediaProxy(pageDocument.body.innerHTML) + remainingImages.map(renderImage).join("");
    }
  }
  const separateImages = imageBlocks.length > 0 ? imageBlocks : images;
  return routeEbookImagesThroughMediaProxy(content) + separateImages.map(renderImage).join("");
}

function htmlPreview(content: string, title: string) {
  const safeDocument = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' https: data:; style-src 'unsafe-inline'"><style>body{font:15px/1.65 system-ui,sans-serif;color:#294940;margin:16px}img{max-width:100%;height:auto}figure{margin:16px 0}figcaption{font-size:12px;color:#52736a}table{border-collapse:collapse}td,th{border:1px solid #d7e5df;padding:6px}</style></head><body>${content || "<p>No page content.</p>"}</body></html>`;
  return <iframe title={title} sandbox="allow-same-origin" srcDoc={safeDocument} className="mt-3 min-h-40 w-full rounded-lg border border-[#e1ebe6] bg-white" />;
}

function EbookReviewPanel({ item, onClose, onDecision, pending }: {
  item: PendingEbookItem;
  onClose: () => void;
  onDecision: (decision: EbookReviewDecision) => void;
  pending: boolean;
}) {
  const reviewQuery = useQuery({
    queryKey: ["platform", "ebook-approval-review", item.training_id, item.section_id, item.lesson_id],
    queryFn: () => getEbookApprovalReview(item.training_id, item.section_id, item.lesson_id),
    staleTime: 0,
  });
  const [note, setNote] = useState("");
  const [showChanges, setShowChanges] = useState(false);
  const review = reviewQuery.data ?? {};
  const draft = asRecord(review.draft);
  const draftDocument = asRecord(draft.ebook ?? draft);
  const published = review.published === null || review.published === undefined ? null : asRecord(review.published);
  const validation = asRecord(review.validation);
  const errors = Array.isArray(validation.errors) ? validation.errors : [];
  const warnings = Array.isArray(validation.warnings) ? validation.warnings : [];
  const history = Array.isArray(review.history) ? review.history : [];
  const hasActionList = Array.isArray(review.actions);
  const allowedActions = hasActionList ? (review.actions as unknown[]).flatMap((value) => {
    if (typeof value === "string") return [value];
    const action = asRecord(value).action ?? asRecord(value).name ?? asRecord(value).id;
    return typeof action === "string" ? [action] : [];
  }) : ["approve", "request_changes"];
  const pages = Array.isArray(draftDocument.pages) ? draftDocument.pages : [];
  const changeText = typeof review.changes === "string" ? review.changes : JSON.stringify(review.changes ?? {}, null, 2);
  const canApprove = errors.length === 0 && validation.valid !== false;
  const canRequestChanges = !hasActionList || allowedActions.includes("request_changes");
  const validationHasError = validation.valid === false || errors.length > 0;
  const validationLabel = validationHasError ? "Needs attention" : validation.valid === true ? "Ready to publish" : "Status not provided";
  const approvalBlockedMessage = validationHasError ? errors.length > 0 ? "Resolve validation issues before approving this eBook." : "The API marked this eBook invalid but did not provide the validation details." : "Approval is temporarily unavailable. Refresh the review and try again.";

  return (
    <section className="mt-6 rounded-2xl border border-[#d7e5df] bg-white p-5 shadow-sm" aria-labelledby="ebook-review-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#7f9d94]">eBOOK REVIEW</p>
          <h3 id="ebook-review-title" className="mt-1 text-xl font-bold text-[#06201c]">{item.lesson_title}</h3>
          <p className="mt-1 text-sm text-[#52736a]">{item.training_title}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-4 py-2 text-xs font-bold text-[#52736a]">Back to queue</button>
      </div>

      {reviewQuery.isLoading ? <p role="status" className="mt-5 text-sm text-[#52736a]">Loading eBook review...</p> : null}
      {reviewQuery.isError ? <div className="mt-5 rounded-xl border border-[#f0c7c2] bg-[#fff6f5] p-4"><p role="alert" className="text-sm font-semibold text-[#b42318]">{(reviewQuery.error as Error).message}</p><button type="button" onClick={() => void reviewQuery.refetch()} className="mt-2 text-sm font-semibold text-[#1f6a58] underline">Retry</button></div> : null}

      {reviewQuery.data ? <>
        <dl className="mt-5 grid gap-3 rounded-xl bg-[#f6faf8] p-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs font-semibold text-[#7f9d94]">Submitted by</dt><dd className="mt-1 font-semibold text-[#06201c]">{item.submitted_by.name}</dd></div>
          <div><dt className="text-xs font-semibold text-[#7f9d94]">Submitted</dt><dd className="mt-1 font-semibold text-[#06201c]">{formatDateTime(item.submitted_at)}</dd></div>
          <div><dt className="text-xs font-semibold text-[#7f9d94]">Draft version</dt><dd className="mt-1 font-semibold text-[#06201c]">v{item.version} · {item.page_count} {item.page_count === 1 ? "page" : "pages"}</dd></div>
          <div><dt className="text-xs font-semibold text-[#7f9d94]">Published version</dt><dd className="mt-1 font-semibold text-[#06201c]">{published ? `v${displayValue(published.version) || "—"}` : "No live version"}</dd></div>
          <div><dt className="text-xs font-semibold text-[#7f9d94]">Validation</dt><dd className={`mt-1 font-semibold ${validationHasError ? "text-[#b42318]" : validation.valid === true ? "text-[#167550]" : "text-[#7f9d94]"}`}>{validationLabel}</dd></div>
        </dl>

        {errors.length > 0 || warnings.length > 0 ? <div className="mt-4 grid gap-3 md:grid-cols-2">
          {errors.length > 0 ? <div className="rounded-xl border border-[#f0c7c2] bg-[#fff6f5] p-4"><h4 className="font-bold text-[#b42318]">Validation issues</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#8f2d25]">{errors.map((raw, index) => <li key={index}>{displayValue(asRecord(raw).message) || displayValue(raw) || "Validation issue"}</li>)}</ul></div> : null}
          {warnings.length > 0 ? <div className="rounded-xl border border-[#f1dfb8] bg-[#fffaf0] p-4"><h4 className="font-bold text-[#8a5a00]">Review notes</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#755618]">{warnings.map((raw, index) => <li key={index}>{displayValue(asRecord(raw).message) || displayValue(raw) || "Review note"}</li>)}</ul></div> : null}
        </div> : null}
        {validation.valid === false && errors.length === 0 ? <p role="alert" className="mt-4 rounded-xl border border-[#f0c7c2] bg-[#fff6f5] p-4 text-sm font-semibold text-[#b42318]">The API marked this eBook invalid but did not include validation details. Refresh the review or ask the backend team to check the validation response.</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowChanges((value) => !value)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-xs font-bold text-[#1f6a58]">{showChanges ? "Hide changes" : "Compare with published version"}</button>
        </div>
        {showChanges ? <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f6faf8] p-4 text-xs text-[#52736a]">{published ? changeText : "This is the first published release; there is no live version to compare."}</pre> : null}

        <div className="mt-5 space-y-4">
          {pages.length > 0 ? pages.map((raw, index) => {
            const page = asRecord(raw);
            const pageTitle = displayValue(page.title) || `Page ${index + 1}`;
            const html = getEbookPagePreviewHtml(page);
            const blocks = Array.isArray(page.blocks) ? page.blocks : [];
            return <article key={displayValue(page.id) || String(index)} className="rounded-xl border border-[#e1ebe6] p-4">
              <h4 className="font-bold text-[#06201c]">{index + 1}. {pageTitle}</h4>
              {html ? htmlPreview(html, `Preview of ${pageTitle}`) : null}
              {blocks.length > 0 ? <ul className="mt-3 space-y-2">{blocks.map((blockValue, blockIndex) => {
                const block = asRecord(blockValue);
                const type = displayValue(block.type) || "Content";
                const alt = displayValue(block.alt_text ?? block.altText);
                const caption = displayValue(block.caption);
                const url = displayValue(block.url);
                return <li key={displayValue(block.id) || String(blockIndex)} className="rounded-lg bg-[#f6faf8] px-3 py-2 text-xs text-[#52736a]"><span className="font-bold text-[#1f6a58]">{type}</span>{alt ? <span className="ml-2">Alt text: {alt}</span> : null}{caption ? <span className="ml-2">Caption: {caption}</span> : null}{url ? <a href={url} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-[#1f6a58] underline">Open media</a> : null}</li>;
              })}</ul> : null}
            </article>;
          }) : <p className="rounded-xl bg-[#f6faf8] p-4 text-sm text-[#52736a]">No pages were returned in the draft.</p>}
        </div>

        {history.length > 0 ? <details className="mt-5 rounded-xl border border-[#e1ebe6] p-4"><summary className="cursor-pointer text-sm font-bold text-[#1f6a58]">Review history ({history.length})</summary><ol className="mt-3 space-y-2">{history.map((raw, index) => { const entry = asRecord(raw); const actor = asRecord(entry.actor ?? entry.performed_by_user); const action = displayValue(entry.action ?? entry.event ?? entry.operation ?? entry.status) || "Review activity"; const actorName = displayValue(entry.performed_by ?? entry.actor_name ?? actor.name); const timestamp = entry.created_at ?? entry.submitted_at ?? entry.reviewed_at ?? entry.timestamp ?? entry.at; const noteText = displayValue(entry.note ?? entry.reviewer_note ?? entry.reason ?? entry.comment); const hasDetails = Object.keys(entry).length > 0; const rawText = typeof raw === "string" ? raw : hasDetails ? JSON.stringify(raw, null, 2) : "History details were not included by the API."; return <li key={index} className="rounded-lg bg-[#f6faf8] p-3 text-xs text-[#52736a]"><span className="font-bold text-[#06201c]">{action}</span>{actorName ? <span> · {actorName}</span> : null}{timestamp ? <span> · {formatDateTime(timestamp)}</span> : null}{noteText ? <p className="mt-1">{noteText}</p> : !hasDetails || !actorName && !timestamp && action === "Review activity" ? <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[#7f9d94]">{rawText}</pre> : null}</li>; })}</ol></details> : null}

        <div className="mt-6 border-t border-[#e1ebe6] pt-5">
          {canRequestChanges ? <label className="block text-xs font-bold text-[#52736a]">Request changes from the author
            <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={3} placeholder="Explain what needs to be changed (at least 3 characters)." className="mt-2 w-full rounded-xl border border-[#d7e5df] px-3 py-2 text-sm outline-none focus:border-[#1f6a58]" />
            <span className="mt-1 block text-right font-normal">{note.length}/1000</span>
          </label> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {canApprove ? <>
              <button type="button" disabled={pending} onClick={() => onDecision({ action: "approve", publish: true, note: "Approved for publication." })} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{pending ? "Processing..." : "Approve and publish"}</button>
              <button type="button" disabled={pending} onClick={() => onDecision({ action: "approve", publish: false, note: "Approved. Author can publish when ready." })} className="h-10 rounded-full border border-[#1f6a58] px-5 text-sm font-bold text-[#1f6a58] disabled:opacity-60">Approve only</button>
            </> : <p className={`self-center text-sm font-semibold ${validationHasError ? "text-[#b42318]" : "text-[#7f6b40]"}`}>{approvalBlockedMessage}</p>}
            {canRequestChanges ? <button type="button" disabled={pending || note.trim().length < 3 || note.trim().length > 1000} onClick={() => onDecision({ action: "request_changes", note: note.trim() })} className="h-10 rounded-full border border-[#b42318] px-5 text-sm font-bold text-[#b42318] disabled:opacity-50">{pending ? "Processing..." : "Request changes"}</button> : null}
          </div>
        </div>
      </> : null}
    </section>
  );
}

export default function EbookApprovalQueue() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PendingEbookItem | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const reviewPanelRef = useRef<HTMLDivElement | null>(null);
  const queueQuery = useQuery({
    queryKey: ["platform", "ebook-approval-queue", page],
    queryFn: () => getPendingEbooks(page, 20),
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (selected) reviewPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);
  const decisionMutation = useMutation({
    mutationFn: (decision: EbookReviewDecision) => selected ? reviewEbook(selected.training_id, selected.section_id, selected.lesson_id, decision) : Promise.reject(new Error("Select an eBook to review.")),
    onSuccess: async (_result, decision) => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "ebook-approval-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["platform", "ebook-approval-review", selected?.training_id, selected?.section_id, selected?.lesson_id] });
      setSelected(null);
      setSuccess(decision.action === "request_changes" ? "Changes requested. The author can now update and resubmit the eBook." : decision.publish ? "eBook approved and published for learners." : "eBook approved. The Enterprise Admin can publish it when ready.");
    },
  });
  const queue = queueQuery.data;
  const totalPages = queue ? Math.max(1, Math.ceil(queue.total / queue.page_size)) : 1;

  return <section id="approval-type-ebooks-panel" role="tabpanel" aria-labelledby="approval-type-ebooks-tab">
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#7f9d94]">EBOOK APPROVALS</p><h2 className="mt-1 text-xl font-bold text-[#06201c]">eBook approvals</h2><p className="mt-1 text-sm text-[#52736a]">Review submitted eBooks, compare revisions, and approve content for learners.</p></div>
      {queue ? <p className="font-bold text-[#1f6a58]">{queue.total} awaiting review</p> : null}
    </div>
    {success ? <p role="status" className="mt-5 rounded-xl bg-[#e9f4ee] p-4 font-semibold text-[#1f6a58]">{success}</p> : null}
    {decisionMutation.isError ? <p role="alert" className="mt-4 rounded-xl border border-[#f0c7c2] bg-[#fff6f5] p-4 text-sm font-semibold text-[#b42318]">{(decisionMutation.error as Error).message}</p> : null}
    {queueQuery.isLoading ? <div role="status" className="mt-6 space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-[#edf3f0]" />)}</div> : null}
    {queueQuery.isError ? <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm"><p role="alert" className="font-semibold text-[#b42318]">{(queueQuery.error as Error).message}</p><button type="button" onClick={() => void queueQuery.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div> : null}
    {!queueQuery.isLoading && !queueQuery.isError && queue?.items.length === 0 ? <div className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-10 text-center"><p className="font-bold text-[#06201c]">No eBooks awaiting approval</p><p className="mt-2 text-sm text-[#52736a]">Submitted eBooks will appear here for review.</p></div> : null}
    {queue?.items.length ? <>
      <ul className="mt-6 space-y-3">{queue.items.map((item) => <li key={`${item.training_id}:${item.section_id}:${item.lesson_id}`} className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm ${selected?.lesson_id === item.lesson_id && selected.training_id === item.training_id ? "border-[#1f6a58] ring-1 ring-[#1f6a58]" : "border-[#e1ebe6]"}`}>
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.1em] text-[#7f9d94]">{item.training_title}</p><h3 className="mt-1 text-base font-bold text-[#06201c]">{item.lesson_title}</h3><p className="mt-1 text-xs text-[#52736a]">Submitted by {item.submitted_by.name} · {formatDateTime(item.submitted_at)}</p><p className="mt-1 text-xs text-[#7f9d94]">Version {item.version} · {item.page_count} {item.page_count === 1 ? "page" : "pages"}</p></div>
        <button type="button" onClick={() => { setSuccess(null); setSelected(item); }} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white">Review eBook</button>
      </li>)}</ul>
      {totalPages > 1 ? <nav aria-label="eBook approval pages" className="mt-6 flex items-center justify-between"><button type="button" disabled={page <= 1} onClick={() => { setSelected(null); setPage((value) => value - 1); }} className="h-10 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] disabled:opacity-50">Previous</button><span className="text-sm text-[#52736a]">Page {queue.page} of {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => { setSelected(null); setPage((value) => value + 1); }} className="h-10 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] disabled:opacity-50">Next</button></nav> : null}
    </> : null}
    {selected ? <div ref={reviewPanelRef}><EbookReviewPanel item={selected} onClose={() => setSelected(null)} pending={decisionMutation.isPending} onDecision={(decision) => decisionMutation.mutate(decision)} /></div> : null}
  </section>;
}
