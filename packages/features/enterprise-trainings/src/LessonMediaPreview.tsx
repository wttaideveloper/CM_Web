"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { getTrainingMediaPreviewUrl } from "./training-media-url";

type LessonMediaPreviewProps = {
  url: string;
  name: string;
  kind: "video" | "document";
  showPreview?: boolean;
};

function isPdf(url: string, name: string): boolean {
  return /\.pdf(?:$|[?#])/i.test(name) || /\.pdf(?:$|[?#])/i.test(url);
}

function isTextDocument(url: string, name: string): boolean {
  return /\.(?:txt|md|rtf)(?:$|[?#])/i.test(name) || /\.(?:txt|md|rtf)(?:$|[?#])/i.test(url);
}

function isDocx(url: string, name: string): boolean {
  return /\.docx(?:$|[?#])/i.test(name) || /\.docx(?:$|[?#])/i.test(url);
}

/** Renders uploaded lesson video and browser-readable documents inline, with a direct link fallback. */
export function LessonMediaPreview({ url, name, kind, showPreview = true }: LessonMediaPreviewProps) {
  const { t } = useTranslation("enterpriseTrainings");
  const previewUrl = getTrainingMediaPreviewUrl(url);
  const docxPreview = kind === "document" && isDocx(url, name);
  const documentQuery = useQuery({
    queryKey: ["trainings", "lesson-media-preview", previewUrl],
    queryFn: async () => {
      if (!previewUrl) throw new Error("Document URL is unavailable.");
      const response = await fetch(previewUrl, { credentials: "include" });
      if (!response.ok) throw new Error(`Unable to load document preview (HTTP ${response.status}).`);
      return response.arrayBuffer();
    },
    enabled: Boolean(previewUrl && docxPreview && showPreview),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  const previewContainer = useRef<HTMLDivElement>(null);
  const [docxRenderError, setDocxRenderError] = useState(false);

  useEffect(() => {
    const container = previewContainer.current;
    if (!container || !documentQuery.data) return;
    let isCurrent = true;
    container.replaceChildren();
    setDocxRenderError(false);
    void import("docx-preview")
      .then(({ renderAsync }) => isCurrent ? renderAsync(documentQuery.data, container, undefined, { inWrapper: true }) : undefined)
      .catch(() => {
        if (isCurrent) setDocxRenderError(true);
      });
    return () => {
      isCurrent = false;
      container.replaceChildren();
    };
  }, [documentQuery.data]);

  if (!previewUrl) return null;

  return (
    <section className="mt-2 overflow-hidden rounded-lg border border-[#d7e5df] bg-[#f9fcfa]" aria-label={`${name} ${t("media.preview")}`}>
      {showPreview && kind === "video" ? (
        <video src={previewUrl} controls preload="metadata" className="max-h-72 w-full" aria-label={`${name} ${t("media.preview")}`} />
      ) : showPreview && docxPreview ? (
        <div className="max-h-96 overflow-auto bg-white p-3">
          {documentQuery.isLoading ? <p className="text-xs text-[#52736a]">{t("media.loadingPreview")}</p> : null}
          {documentQuery.isError || docxRenderError ? <p role="status" className="text-xs text-[#52736a]">{t("media.previewUnavailable")}</p> : null}
          <div ref={previewContainer} className="docx-lesson-preview text-sm text-[#06201c]" />
        </div>
      ) : showPreview && (isPdf(url, name) || isTextDocument(url, name)) ? (
        <iframe
          src={previewUrl}
          title={`${name} ${t("media.preview")}`}
          sandbox=""
          className="h-72 w-full bg-white"
        />
      ) : showPreview ? (
        <p className="px-3 py-2 text-xs text-[#52736a]">
          {t("media.inlinePreviewUnsupported")}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2 border-t border-[#d7e5df] px-3 py-2">
        <span className="min-w-0 truncate text-xs font-medium text-[#355a51]">{name}</span>
        <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-[#1f6a58] underline">
          {t("media.openFile")}
        </a>
      </div>
    </section>
  );
}
