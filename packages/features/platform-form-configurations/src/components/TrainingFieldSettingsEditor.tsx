"use client";

import type { ConfiguredField } from "../model/form-configuration.types";
import type {
  TrainingFormFrontendSettings,
  TrainingFormVisibilityCondition,
  TrainingFormUploadSettings,
} from "../model/training-form-configuration-api.types";
import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";

const mediaMimeTypes = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  document: [
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
} as const;

function readSettings(value: unknown): TrainingFormFrontendSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const result: TrainingFormFrontendSettings = {};
  const visibility = raw.visibility;
  if (visibility && typeof visibility === "object" && !Array.isArray(visibility)) {
    const candidate = visibility as Record<string, unknown>;
    if (
      typeof candidate.field_key === "string"
      && ["equals", "not_equals", "has_value", "is_empty"].includes(String(candidate.operator))
    ) {
      result.visibility = {
        field_key: candidate.field_key,
        operator: candidate.operator as TrainingFormVisibilityCondition["operator"],
        ...(typeof candidate.value === "string" ? { value: candidate.value } : {}),
      };
    }
  }
  const upload = raw.upload;
  if (upload && typeof upload === "object" && !Array.isArray(upload)) {
    const candidate = upload as Record<string, unknown>;
    result.upload = {
      ...(Array.isArray(candidate.allowed_mime_types)
        ? { allowed_mime_types: candidate.allowed_mime_types.filter((item): item is string => typeof item === "string") }
        : {}),
      ...(typeof candidate.max_file_size_mb === "number" || candidate.max_file_size_mb === null
        ? { max_file_size_mb: candidate.max_file_size_mb }
        : {}),
    };
  }
  return result;
}

function getMediaKind(field: ConfiguredField): keyof typeof mediaMimeTypes | null {
  const key = (field.coreKey ?? field.stableKey ?? "").replace(/^(core_|custom_)/, "");
  if (key === "primary_image" || key === "gallery_images") return "image";
  if (key === "promotional_video" || key === "videos") return "video";
  if (key === "documents" || key === "notes_documents" || key === "instructor_notes" || key === "notes_pdf_url") return "document";
  return null;
}

/** Edits upload restrictions for configured Training media fields. */
export function TrainingFieldSettingsEditor({
  field,
  onChange,
}: {
  field: ConfiguredField;
  onChange: (settings: TrainingFormFrontendSettings | null) => void;
}) {
  const settings = readSettings(field.compositeConfig?.frontend_settings);
  const mediaKind = getMediaKind(field);
  if (!mediaKind) return null;
  const allowedTypes: readonly string[] = settings.upload?.allowed_mime_types ?? mediaMimeTypes[mediaKind];
  const optionsClass = "mt-1.5 w-full rounded-lg border border-[#cfe0d8] bg-white px-3 py-2";
  const update = (patch: Partial<TrainingFormFrontendSettings>) => {
    const next = { ...settings, ...patch };
    onChange(Object.keys(next).length ? next : null);
  };
  const updateUpload = (patch: Partial<TrainingFormUploadSettings>) => {
    update({ upload: { allowed_mime_types: settings.upload?.allowed_mime_types ?? (mediaKind ? [...mediaMimeTypes[mediaKind]] : []), ...settings.upload, ...patch } });
  };

  return (
    <section className="mt-4 space-y-4 rounded-xl border border-[#cfe0d8] bg-[#f7fbf8] p-3">
      <p className="text-sm font-bold text-[#06201c]">{copy.trainingSettings.title}</p>
      <p className="text-xs text-[#52736a]">{copy.trainingSettings.warning}</p>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[#355a51]">{copy.trainingSettings.uploadLimits}</legend>
        <p className="text-xs text-[#52736a]">{copy.trainingSettings.uploadDescription}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {mediaMimeTypes[mediaKind].map((mimeType) => (
            <label key={mimeType} className="flex items-center gap-2 text-xs text-[#355a51]">
              <input
                type="checkbox"
                checked={allowedTypes.includes(mimeType)}
                onChange={(event) => {
                  const nextTypes = event.target.checked
                    ? [...allowedTypes, mimeType]
                    : allowedTypes.filter((item) => item !== mimeType);
                  updateUpload({ allowed_mime_types: nextTypes });
                }}
              />
              {mimeType}
            </label>
          ))}
        </div>
        {!allowedTypes.length ? <p role="alert" className="text-xs font-semibold text-[#b42318]">{copy.trainingSettings.minimumUploadType}</p> : null}
        <label className="block text-xs font-semibold text-[#355a51]">{copy.trainingSettings.maxFileSize}
          <input
            type="number"
            min={1}
            max={500}
            step={1}
            value={settings.upload?.max_file_size_mb ?? ""}
            onChange={(event) => updateUpload({ max_file_size_mb: event.target.value ? Number(event.target.value) : null })}
            className={optionsClass}
          />
        </label>
        {settings.upload?.max_file_size_mb != null && (!Number.isInteger(settings.upload.max_file_size_mb) || settings.upload.max_file_size_mb < 1 || settings.upload.max_file_size_mb > 500)
          ? <p role="alert" className="text-xs font-semibold text-[#b42318]">{copy.trainingSettings.maxFileSizeError}</p>
          : null}
      </fieldset>
    </section>
  );
}
