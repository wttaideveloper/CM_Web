"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { uploadTrainingMedia, type TrainingUploadResponse } from "./trainings.service";

type TrainingMediaUploadPurpose = "image" | "lesson_document" | "lesson_video";
const defaultMimeTypes: Record<TrainingMediaUploadPurpose, readonly string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  lesson_video: ["video/mp4", "video/webm", "video/quicktime"],
  lesson_document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/rtf",
  ],
};
const mimeExtensions: Record<string, readonly string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "text/plain": [".txt"],
  "application/rtf": [".rtf"],
};

interface TrainingMediaUploadButtonProps {
  accept: string;
  fieldKey: string;
  label: string;
  purpose: TrainingMediaUploadPurpose;
  allowedMimeTypes?: readonly string[];
  maxFileSizeMb?: number | null;
  onUploaded: (file: TrainingUploadResponse, imageQualityWarning?: string) => void;
}

function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : "";
}

function isAllowedFileType(file: File, allowedTypes: readonly string[]): boolean {
  const fileType = file.type.split(";")[0].trim().toLowerCase();
  const normalizedAllowedTypes = allowedTypes.map((type) => type.trim().toLowerCase());
  if (normalizedAllowedTypes.some((type) => (
    type.endsWith("/*")
      ? fileType.startsWith(`${type.slice(0, -1)}`)
      : fileType === type
  ))) return true;
  if (fileType && fileType !== "application/octet-stream") return false;

  const extension = getExtension(file.name);
  return normalizedAllowedTypes.some((mimeType) => {
    const matchingMimeTypes = mimeType.endsWith("/*")
      ? Object.keys(mimeExtensions).filter((candidate) => candidate.startsWith(mimeType.slice(0, -1)))
      : [mimeType];
    return matchingMimeTypes.some((candidate) => mimeExtensions[candidate]?.includes(extension));
  });
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap !== "function") return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  const { width, height } = bitmap;
  bitmap.close();
  return { width, height };
}

/** Uploads Training media through the authenticated Training media endpoint. */
export default function TrainingMediaUploadButton({
  accept,
  fieldKey,
  label,
  purpose,
  allowedMimeTypes,
  maxFileSizeMb,
  onUploaded,
}: TrainingMediaUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const { t } = useTranslation("enterpriseTrainings");
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const imageDimensions = purpose === "image" && fieldKey === "primary_image"
        ? await getImageDimensions(file)
        : undefined;
      const uploaded = await uploadTrainingMedia(file, purpose, fieldKey);
      return { uploaded, imageDimensions };
    },
    onSuccess: ({ uploaded, imageDimensions }) => {
      let imageQualityWarning: string | undefined;
      if (imageDimensions === null) {
        imageQualityWarning = t("media.dimensionsUnavailable");
      } else if (imageDimensions) {
        const recommendations: string[] = [];
        if (imageDimensions.width < 1280) recommendations.push(t("media.minimumImageWidth"));
        if (Math.abs(imageDimensions.width / imageDimensions.height - 16 / 9) > 0.02) {
          recommendations.push(t("media.imageAspectRatio"));
        }
        if (recommendations.length) {
          imageQualityWarning = t("media.imageQualityWarning", {
            recommendations: recommendations.join(" and "),
            width: imageDimensions.width,
            height: imageDimensions.height,
          });
        }
      }
      onUploaded(uploaded, imageQualityWarning);
      setFeedback({ message: t("media.uploadComplete"), isError: false });
    },
    onError: (error) => setFeedback({
      message: error instanceof Error ? error.message : t("media.uploadFailed"),
      isError: true,
    }),
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const acceptedTypes = allowedMimeTypes ?? defaultMimeTypes[purpose];
    if (!acceptedTypes.length) {
      setFeedback({ message: t("media.noAllowedFormats"), isError: true });
      return;
    }
    if (!isAllowedFileType(file, acceptedTypes)) {
      setFeedback({ message: t("media.allowedFormatError", { formats: acceptedTypes.join(", ") }), isError: true });
      return;
    }
    if (maxFileSizeMb != null && file.size > maxFileSizeMb * 1024 * 1024) {
      setFeedback({ message: t("media.maxFileSizeError", { maxFileSizeMb }), isError: true });
      return;
    }

    setFeedback(null);
    uploadMutation.mutate(file);
  };

  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={uploadMutation.isPending}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploadMutation.isPending}
        className="inline-flex h-9 w-32 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#1f6a58] px-2 text-xs font-bold text-[#1f6a58] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#1f6a58] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-transparent disabled:hover:text-[#1f6a58] disabled:hover:shadow-none"
      >
        {uploadMutation.isPending ? "Uploading..." : label}
      </button>
      {feedback ? <span role={feedback.isError ? "alert" : "status"} className={`text-xs ${feedback.isError ? "font-semibold text-[#b42318]" : "text-[#1f6a58]"}`}>{feedback.message}</span> : null}
    </div>
  );
}
