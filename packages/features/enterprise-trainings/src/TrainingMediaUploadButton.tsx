"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { uploadTrainingMedia, type TrainingUploadResponse } from "./trainings.service";

type TrainingMediaUploadPurpose = "image" | "lesson_document" | "lesson_video";
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
  onUploaded: (file: TrainingUploadResponse) => void;
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadTrainingMedia(file, purpose, fieldKey),
    onSuccess: (uploaded) => {
      onUploaded(uploaded);
      setFeedback(`${uploaded.name} uploaded.`);
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : "Unable to upload this file. Please try again."),
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (purpose === "image" && !file.type.startsWith("image/")) {
      setFeedback(null);
      setFeedback("Choose an image file to upload.");
      return;
    }
    if (purpose === "lesson_video" && !file.type.startsWith("video/")) {
      setFeedback(null);
      setFeedback("Choose a video file to upload.");
      return;
    }
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const formatAllowed = allowedMimeTypes === undefined
      || allowedMimeTypes.some((mimeType) =>
        file.type === mimeType || (!file.type && mimeExtensions[mimeType]?.includes(extension)),
      );
    if (!formatAllowed) {
      setFeedback(`Choose a file in an allowed format: ${allowedMimeTypes.join(", ")}.`);
      return;
    }
    if (maxFileSizeMb != null && file.size > maxFileSizeMb * 1024 * 1024) {
      setFeedback(`Choose a file smaller than ${maxFileSizeMb} MB.`);
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
        className="inline-flex h-9 w-32 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#1f6a58] px-2 text-xs font-bold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploadMutation.isPending ? "Uploading..." : label}
      </button>
      {feedback ? <span role={uploadMutation.isError || feedback.startsWith("Choose ") ? "alert" : "status"} className={`text-xs ${uploadMutation.isError || feedback.startsWith("Choose ") ? "font-semibold text-[#b42318]" : "text-[#1f6a58]"}`}>{feedback}</span> : null}
    </div>
  );
}
