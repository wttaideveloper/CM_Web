import type { EventCompositeFieldDefinition } from "./event-composite-field-definitions";

/** Training-specific delivery details that map to supported Training API fields. */
export const trainingCompositeFieldDefinitions: Readonly<Record<string, EventCompositeFieldDefinition>> = {
  venue: {
    title: "Training Venue",
    description: "Choose which physical venue details appear for Venue and Hybrid trainings.",
    fieldNoun: "venue",
    subfields: [
      { key: "name", label: "Venue name", requiredByDomain: true },
      { key: "address", label: "Address", requiredByDomain: true },
    ],
  },
  meeting_link: {
    title: "Live Meeting Details",
    description: "Choose which live session details appear for Live and Hybrid trainings.",
    fieldNoun: "meeting detail",
    subfields: [
      { key: "meeting_link", label: "Meeting link", requiredByDomain: true },
      { key: "meeting_provider", label: "Meeting provider" },
      { key: "access_information", label: "Access information" },
      { key: "delivery_instructions", label: "Delivery instructions" },
    ],
  },
};

/** Resolves a Training composite definition from its core key, stable key, or label. */
export function getTrainingCompositeFieldDefinition(fieldKey: string | null, label?: string): EventCompositeFieldDefinition | undefined {
  const key = fieldKey?.replace(/^(core_|custom_)/, "").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  if (key && trainingCompositeFieldDefinitions[key]) return trainingCompositeFieldDefinitions[key];
  if (key?.endsWith("_venue")) return trainingCompositeFieldDefinitions.venue;
  if (key?.endsWith("_meeting_link")) return trainingCompositeFieldDefinitions.meeting_link;
  const normalizedLabel = label?.trim().toLowerCase();
  if (normalizedLabel === "venue") return trainingCompositeFieldDefinitions.venue;
  if (normalizedLabel === "meeting link" || normalizedLabel === "live meeting details") return trainingCompositeFieldDefinitions.meeting_link;
  return undefined;
}
