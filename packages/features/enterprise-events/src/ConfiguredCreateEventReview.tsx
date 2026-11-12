"use client";

import type { CreateEventFormValues } from "./create-event-form";
import type { ActiveEventFormConfiguration, ActiveEventFormField } from "./events.service";
import type { CustomMediaPreview } from "./ConfiguredCreateEventSection";
import EventMediaPreview, { type EventMediaPreviewKind } from "./EventMediaPreview";
import type { EventMediaItem } from "./event-media";
import { formatEventDeliveryMode, formatEventDurationType, formatTimeZoneLabel } from "./event-detail-formatters";
import { isProtectedMeetingLink } from "./event-meeting-link";
import { getEventFormFieldType, isEventMediaRenderer, getEventMediaKind } from "./event-form-field-type";

type Props = { configuration: ActiveEventFormConfiguration; values: CreateEventFormValues; customValues: Record<string, string | string[] | boolean | number | null>; customMediaPreviews?: Readonly<Record<string, readonly CustomMediaPreview[]>>; locationName?: string };
const coreValues: Record<string, keyof CreateEventFormValues> = { title: "title", description: "description", category: "category", subcategory: "subcategory", tags: "tags", organiser_name: "organiser_name", organiser_contact: "organiser_contact", start_date: "start_date", start_datetime: "start_date", end_date: "end_date", end_datetime: "end_date", duration_type: "duration_type", registration_cutoff: "registration_cutoff", registration_open_at: "registration_open_at", registration_close_at: "registration_close_at", timezone: "time_zone", time_zone: "time_zone", event_type: "event_type", delivery_mode: "delivery_mode", pricing_type: "pricing_type", meeting_provider: "meeting_provider", meeting_link: "meeting_link", price: "price", currency: "currency", capacity: "capacity", min_participants: "min_participants", max_participants: "max_participants", primary_image: "primary_image", gallery_images: "gallery_images", videos: "videos", documents: "documents" };
function keyFor(field: ActiveEventFormField): string { return field.source === "core" ? field.core_key ?? field.stable_key ?? field.id : field.stable_key ?? field.id; }
function enabled(field: ActiveEventFormField, key: string): boolean { const keys = field.composite_config?.enabled_fields ?? []; return keys.length === 0 || keys.includes(key); }
function format(value: unknown, kind?: string): string { if (value === null || value === undefined || value === "" || Array.isArray(value) && value.length === 0) return "Not provided"; if (typeof value === "boolean") return value ? "Yes" : "No"; if (Array.isArray(value)) return value.join(", "); if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) { const date = new Date(value); if (!Number.isNaN(date.valueOf())) return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: kind === "datetime" ? "short" : undefined }).format(date); } return String(value); }
function optionLabels(field: ActiveEventFormField, value: unknown): string { const values = Array.isArray(value) ? value : [value]; const key = keyFor(field); return values.map((item) => { const trimmed = String(item).trim(); const match = field.options.find((option) => option.value === trimmed || option.label === trimmed || String(option.value).toLowerCase() === trimmed.toLowerCase()); if (match?.label) return match.label; if (["time_zone", "timezone"].includes(key)) return formatTimeZoneLabel(trimmed); if (/^[a-z0-9]+(_[a-z0-9]+)+$/i.test(trimmed)) return trimmed.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "); return trimmed; }).join(", ") || "Not provided"; }
const REVIEW_RICH_TEXT_TAGS = new Set(["BR", "EM", "I", "P", "STRONG", "U", "B"]);
function sanitizeReviewRichText(html: string): string {
  if (typeof DOMParser === "undefined") return "";
  const document = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node) => [...node.childNodes].forEach((child) => {
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const element = child as HTMLElement;
    if (!REVIEW_RICH_TEXT_TAGS.has(element.tagName)) { element.replaceWith(document.createTextNode(element.textContent ?? "")); return; }
    [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));
    walk(element);
  });
  walk(document.body);
  return document.body.innerHTML;
}
function isDeliveryFieldApplicable(key: string, deliveryMode: string): boolean { if (!deliveryMode) return true; if (["venue", "location", "location_id"].includes(key)) return deliveryMode !== "online"; if (["meeting_provider", "meeting_link"].includes(key)) return deliveryMode === "online" || deliveryMode === "hybrid"; return true; }

export default function ConfiguredCreateEventReview({ configuration, values, customValues, customMediaPreviews = {}, locationName }: Props) {
  const sections = [...configuration.sections].filter((section) => section.is_enabled).map((section) => ({ ...section, fields: section.fields.filter((field) => { const key = field.source === "core" ? field.core_key ?? field.stable_key ?? field.id : ""; return !["location", "location_id"].includes(key.replace(/^(core_|custom_)/, "").trim().toLowerCase()); }) })).filter((section) => section.fields.some((field) => field.is_enabled !== false)).sort((left, right) => left.position - right.position);
  return <section className="min-w-0 space-y-6"><div><h2 className="text-2xl font-bold text-[#06201c]">Review &amp; Submit</h2><p className="mt-1 text-sm text-[#52736a]">Review the configured Event details before creating the draft.</p></div>{sections.map((section) => <section key={section.id} className="min-w-0 overflow-hidden rounded-2xl border border-[#d7e5df] bg-white p-5"><h3 className="break-words border-b border-[#edf3f0] pb-3 text-lg font-bold text-[#06201c]">{section.label}</h3><dl className="mt-4 grid min-w-0 gap-x-6 gap-y-5 md:grid-cols-2">{[...section.fields].filter((field) => field.is_enabled !== false).sort((a, b) => a.position - b.position).map((field) => <ReviewField key={field.id} field={field} values={values} customValues={customValues} customMediaPreviews={customMediaPreviews} locationName={locationName} />)}</dl></section>)}<section className="min-w-0 overflow-hidden rounded-2xl border border-[#d7e5df] bg-white p-5"><h3 className="text-lg font-bold text-[#06201c]">Event Services</h3><ServiceReview title="Meals" options={values.meals?.options ?? []} enabled={values.modules?.meals === true} /><ServiceReview title="Accommodation" options={values.accommodation?.options ?? []} enabled={values.modules?.accommodation === true} /></section></section>;
}

function ServiceReview({ title, options, enabled }: { title: string; options: readonly { name: string; description?: string | null; date?: string | null; active?: boolean; price?: string | null; currency?: string | null; capacity?: string | null; purchase_start_at?: string | null; purchase_end_at?: string | null; service_start_at?: string | null; service_end_at?: string | null }[]; enabled: boolean }) {
  return <section className="mt-4 min-w-0"><h4 className="font-semibold">{title}: {enabled ? `${options.length} option(s)` : "Disabled"}</h4>{enabled && options.length ? <div className="mt-2 min-w-0 space-y-2">{options.map((option, index) => <div key={`${option.name}-${index}`} className="min-w-0 overflow-hidden rounded-xl bg-[#f9fcfa] p-3 text-sm"><p className="break-words font-semibold [overflow-wrap:anywhere]">{option.name || "Unnamed option"}{option.active === false ? " · Inactive" : ""}</p>{option.description ? <p className="break-words text-[#52736a] [overflow-wrap:anywhere]">{option.description}</p> : null}<p className="mt-1 break-words text-[#52736a] [overflow-wrap:anywhere]">Price: {option.price || "Not provided"} {option.currency || ""} · Capacity: {option.capacity || "Not provided"}</p><p className="break-words text-xs text-[#52736a] [overflow-wrap:anywhere]">Purchase: {formatWindow(option.purchase_start_at, option.purchase_end_at)} · Service: {formatWindow(option.service_start_at, option.service_end_at)}</p></div>)}</div> : null}</section>;
}
function formatWindow(start?: string | null, end?: string | null) { return start || end ? `${format(start, "datetime")} – ${format(end, "datetime")}` : "Not provided"; }

function ReviewField({ field, values, customValues, customMediaPreviews = {}, locationName = "" }: { field: ActiveEventFormField; values: CreateEventFormValues; customValues: Props["customValues"]; customMediaPreviews?: Props["customMediaPreviews"]; locationName?: string }) {
  const key = keyFor(field); const core = coreValues[key];
  const effectiveType = getEventFormFieldType(field);
  const isMedia = isEventMediaRenderer(effectiveType) || ["primary_image", "gallery_images", "videos", "documents"].includes(key);
  const complex = key === "venue" || key === "ticket_types" || key === "sessions" || ["custom_fields", "registration_questions", "registration_fields"].includes(key) || ["ticket_types", "sessions", "registration_fields"].includes(field.renderer) || isMedia;
  if (values.pricing_type === "free" && ["price", "currency", "ticket_types"].includes(key)) return null;
  if (!isDeliveryFieldApplicable(key, values.delivery_mode)) return null;
  if (key === "venue") return <Composite label={field.label} className="md:col-span-2"><div className="grid gap-3 sm:grid-cols-2">{enabled(field, "name") ? <Item label="Name" value={values.venue_name} /> : null}{enabled(field, "address") ? <Item label="Address" value={values.venue_address} /> : null}{enabled(field, "city") ? <Item label="City" value={values.venue_city} /> : null}</div></Composite>;
  if (key === "ticket_types" || field.renderer === "ticket_types") return <Composite label={field.label} className="md:col-span-2"><div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-[#7f9d94]"><tr><th className="pb-2">Name</th><th className="pb-2">Price</th><th className="pb-2">Currency</th><th className="pb-2">Capacity</th></tr></thead><tbody className="divide-y divide-[#edf3f0]">{values.ticket_types.length ? values.ticket_types.map((ticket, index) => <tr key={ticket.id || `ticket-${index}`}><td className="py-2 font-semibold">{format(ticket.name)}</td><td className="py-2">{format(ticket.price)}</td><td className="py-2">{format(ticket.currency)}</td><td className="py-2">{format(ticket.capacity)}</td></tr>) : <tr><td colSpan={4} className="py-2">Not provided</td></tr>}</tbody></table></div></Composite>;
  if (key === "sessions" || field.renderer === "sessions") return <Composite label={field.label} className="md:col-span-2"><div className="space-y-2">{values.sessions.length ? values.sessions.map((session, index) => <div key={session.id || `session-${index}`} className="grid gap-2 rounded-xl bg-[#f9fcfa] p-3 text-sm sm:grid-cols-3"><Item label="Date" value={enabled(field, "session_date") ? format(session.session_date, "date") : "Not provided"} /><Item label="Time" value={enabled(field, "start_time") || enabled(field, "end_time") ? `${format(session.start_time)} – ${format(session.end_time)}` : "Not provided"} /><Item label="Title" value={enabled(field, "title") ? session.title : "Not provided"} />{enabled(field, "description") ? <Item label="Description" value={session.description} /> : null}<Item label="Speaker" value={enabled(field, "speaker") ? session.speaker : "Not provided"} />{enabled(field, "speaker_bio") ? <Item label="Speaker bio" value={session.speaker_bio} /> : null}{values.delivery_mode !== "online" && enabled(field, "location") ? <Item label="Location" value={session.location} /> : null}{values.delivery_mode !== "in_person" && enabled(field, "meeting_link") ? <Item label="Meeting Link" value={isProtectedMeetingLink(session.meeting_link) ? "Protected meeting link" : session.meeting_link ?? ""} /> : null}</div>) : <p className="text-sm">Not provided</p>}</div></Composite>;
  if (key === "custom_fields" || key === "registration_questions" || key === "registration_fields" || field.renderer === "registration_fields") return <Composite label={field.label} className="md:col-span-2"><div className="space-y-2">{values.custom_fields.length ? values.custom_fields.map((question, index) => <div key={`question-${index}`} className="rounded-xl bg-[#f9fcfa] p-3"><div className="grid gap-3 sm:grid-cols-2"><Item label="Question" value={enabled(field, "label") ? question.label : "Not provided"} /><Item label="Options" value={enabled(field, "options") ? format(question.options) : "Not provided"} /></div></div>) : <p>Not provided</p>}</div></Composite>;
  if (["media", "primary_image", "gallery_images", "videos", "documents"].includes(key)) return <Composite label={field.label} className="md:col-span-2"><MediaReview fieldKey={key} values={values} /></Composite>;
  if (complex && !isMedia) return <Composite label={field.label} className="md:col-span-2"><p>Not provided</p></Composite>;
  const raw = core ? values[core] : customValueForField(field, customValues);
  const renderer = field.renderer?.trim().toLowerCase();
  if (isMedia) {
    return (
      <Composite label={field.label} className="md:col-span-2">
        <MediaValueItem field={field} label={field.label} value={raw} previews={customMediaPreviews?.[key] ?? []} />
      </Composite>
    );
  }
  const isRichText = ["rich_text", "rich_text_editor"].includes(renderer ?? "");
  if (isRichText) return <RichTextItem label={field.label} value={typeof raw === "string" ? raw : ""} />;
  const choiceRenderer = ["select", "dropdown", "radio", "radio_group", "multi_select", "multiselect", "checkbox_group"].includes(renderer);
  const value = key === "meeting_link" && isProtectedMeetingLink(raw) ? "Protected meeting link" : key === "duration_type" ? formatEventDurationType(String(raw ?? "")) : key === "delivery_mode" ? formatEventDeliveryMode(String(raw ?? "")) : ["time_zone", "timezone"].includes(key) ? formatTimeZoneLabel(String(raw ?? "")) : choiceRenderer ? optionLabels(field, raw) : format(raw, field.renderer === "datetime" || ["start_date", "end_date", "registration_cutoff", "registration_open_at", "registration_close_at"].includes(key) ? "datetime" : field.renderer === "date" ? "date" : undefined);
  if (choiceRenderer) return <ChoiceItem label={field.label} value={value} />;
  return <Item label={field.label} value={value} />;
}
function ChoiceItem({ label, value }: { label: string; value: string }) { return <div className="min-w-0 max-w-full"><div className="text-xs font-bold uppercase tracking-wide text-[#7f9d94]">{label}</div><div className="mt-1 text-sm leading-6 text-[#06201c]">{value}</div></div>; }
function customValueForField(field: ActiveEventFormField, values: Readonly<Record<string, string | string[] | boolean | number | null>>): string | string[] | boolean | number | null | undefined {
  const keys = [field.stable_key, field.id, field.core_key].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of keys) if (Object.prototype.hasOwnProperty.call(values, candidate)) return values[candidate];
  return undefined;
}
function MediaValueItem({ field, label, value, previews }: { field?: ActiveEventFormField; label: string; value: unknown; previews: readonly CustomMediaPreview[] }) {
  const items = Array.isArray(value) ? value.map(String).filter(Boolean) : typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
  const kind: EventMediaPreviewKind = field ? getEventMediaKind(getEventFormFieldType(field)) : "image";
  return (
    <div className="min-w-0 max-w-full">
      {items.length ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <EventMediaPreview key={`${item}-${index}`} item={item} kind={kind} label={`${label} ${index + 1}`} />
          ))}
        </div>
      ) : previews.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {previews.map((preview) =>
            preview.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={preview.url} src={preview.url} alt={preview.name} className="max-h-40 w-full rounded-lg border border-[#d7e5df] object-contain" />
            ) : preview.kind === "video" ? (
              <video key={preview.url} src={preview.url} controls className="max-h-40 w-full rounded-lg border border-[#d7e5df]" />
            ) : (
              <a key={preview.url} href={preview.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2 text-sm text-[#1f6a58] underline">
                {preview.name}
              </a>
            ),
          )}
        </div>
      ) : (
        <div className="text-sm leading-6 text-[#06201c]">Not provided</div>
      )}
    </div>
  );
}
function isSafeMediaUrl(value: string): boolean { try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; } }
function RichTextItem({ label, value }: { label: string; value: string }) { const safe = sanitizeReviewRichText(value); return <div className="min-w-0 max-w-full"><div className="text-xs font-bold uppercase tracking-wide text-[#7f9d94]">{label}</div>{safe ? <div className="prose prose-sm mt-1 max-w-none break-words text-sm leading-6 text-[#06201c]" dangerouslySetInnerHTML={{ __html: safe }} /> : <div className="mt-1 text-sm leading-6 text-[#06201c]">Not provided</div>}</div>; }
function Item({ label, value }: { label: string; value: string }) { return <div className="min-w-0 max-w-full"><div className="text-xs font-bold uppercase tracking-wide text-[#7f9d94]">{label}</div><div className="mt-1 min-w-0 max-w-full whitespace-normal break-words text-sm leading-6 text-[#06201c] [overflow-wrap:anywhere]">{format(value)}</div></div>; }
function Composite({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) { return <div className={`min-w-0 ${className ?? ""}`}><dt className="text-xs font-bold uppercase tracking-wide text-[#7f9d94]">{label}</dt><dd className="mt-2 min-w-0 overflow-hidden rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-3 text-[#06201c]">{children}</dd></div>; }

function MediaReview({ fieldKey, values }: { fieldKey: string; values: CreateEventFormValues }) {
  const fields: Array<{ key: string; label: string; kind: "image" | "video" | "document"; items: EventMediaItem[] }> = fieldKey === "media"
    ? [
      { key: "primary_image", label: "Primary image", kind: "image", items: values.primary_image ? [values.primary_image] : [] },
      { key: "gallery_images", label: "Gallery images", kind: "image", items: values.gallery_images },
      { key: "videos", label: "Videos", kind: "video", items: values.videos },
      { key: "documents", label: "Documents", kind: "document", items: values.documents },
    ]
    : [{ key: fieldKey, label: fieldKey.replace(/_/g, " "), kind: fieldKey === "videos" ? "video" : fieldKey === "documents" ? "document" : "image", items: fieldKey === "primary_image" ? (values.primary_image ? [values.primary_image] : []) : fieldKey === "gallery_images" ? values.gallery_images : fieldKey === "videos" ? values.videos : values.documents }];

  return <div className="space-y-4">{fields.map((mediaField) => <div key={mediaField.key}><p className="text-sm font-semibold text-[#355a51]">{mediaField.label}</p>{mediaField.items.length ? <div className="mt-2 space-y-2">{mediaField.items.map((item, index) => <EventMediaPreview key={`${mediaField.key}-${index}`} item={item} kind={mediaField.kind} label={`${mediaField.label} ${index + 1}`} />)}</div> : <p className="mt-1 text-sm">Not provided</p>}</div>)}</div>;
}
