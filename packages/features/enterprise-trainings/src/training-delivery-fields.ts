import type { TrainingFormField } from "./training-form-config.service";

export type TrainingDeliveryCompositeKey = "venue" | "meeting_link";

export type TrainingDeliverySubfield = {
  key: string;
  valueKey: string;
  label: string;
  type: "text" | "url" | "textarea" | "select";
  requiredByDomain?: boolean;
};

const TRAINING_DELIVERY_COMPOSITES: Readonly<Record<TrainingDeliveryCompositeKey, readonly TrainingDeliverySubfield[]>> = {
  venue: [
    { key: "name", valueKey: "venue", label: "Venue name", type: "text", requiredByDomain: true },
    { key: "address", valueKey: "address", label: "Address", type: "textarea", requiredByDomain: true },
  ],
  meeting_link: [
    { key: "meeting_link", valueKey: "meeting_link", label: "Meeting link", type: "url", requiredByDomain: true },
    { key: "meeting_provider", valueKey: "meeting_provider", label: "Meeting provider", type: "select" },
    { key: "access_information", valueKey: "access_information", label: "Access information", type: "textarea" },
    { key: "delivery_instructions", valueKey: "delivery_instructions", label: "Delivery instructions", type: "textarea" },
  ],
};

/** Resolves a Training venue or live-meeting composite field from configured identifiers. */
export function getTrainingDeliveryCompositeKey(field: TrainingFormField): TrainingDeliveryCompositeKey | undefined {
  const identifiers = [field.key, field.apiKey ?? "", field.stable_key ?? "", field.label]
    .map((value) => value.trim().toLowerCase().replace(/^(core_|custom_)/, "").replace(/[\s-]+/g, "_"));
  if (identifiers.some((value) => value === "venue" || value.endsWith("_venue"))) return "venue";
  if (identifiers.some((value) => value === "meeting_link" || value.endsWith("_meeting_link") || value === "live_meeting_details")) return "meeting_link";
  return undefined;
}

/** Returns the supported delivery subfields enabled by a form configuration. */
export function getEnabledTrainingDeliverySubfields(field: TrainingFormField, compositeKey = getTrainingDeliveryCompositeKey(field)): readonly TrainingDeliverySubfield[] {
  if (!compositeKey) return [];
  const available = TRAINING_DELIVERY_COMPOSITES[compositeKey];
  const configured = field.frontendSettings?.enabledFields;
  return available.filter((subfield) => subfield.requiredByDomain || !configured || configured.includes(subfield.key));
}

/** Returns API form-value keys configured as required by a delivery composite. */
export function getRequiredTrainingDeliveryValueKeys(field: TrainingFormField): string[] {
  return getRequiredTrainingDeliverySubfields(field).map((subfield) => subfield.valueKey);
}

/** Returns enabled delivery subfields marked required by domain rules or configuration. */
export function getRequiredTrainingDeliverySubfields(field: TrainingFormField): TrainingDeliverySubfield[] {
  const compositeKey = getTrainingDeliveryCompositeKey(field);
  if (!compositeKey) return [];
  const required = new Set(field.frontendSettings?.requiredFields ?? []);
  return getEnabledTrainingDeliverySubfields(field, compositeKey)
    .filter((subfield) => subfield.requiredByDomain || required.has(subfield.key));
}

/** Checks whether a configured field is already rendered inside a delivery composite. */
export function isTrainingDeliveryCompositeChild(field: TrainingFormField, allFields: readonly TrainingFormField[]): boolean {
  const valueKey = field.key;
  return allFields.some((candidate) => {
    const compositeKey = getTrainingDeliveryCompositeKey(candidate);
    return compositeKey !== undefined
      && candidate.id !== field.id
      && getEnabledTrainingDeliverySubfields(candidate, compositeKey).some((subfield) => subfield.valueKey === valueKey);
  });
}

/** Lists value keys that are represented by an enabled composite field. */
export function getTrainingDeliveryCompositeValueKeys(field: TrainingFormField): string[] {
  return getEnabledTrainingDeliverySubfields(field).map((subfield) => subfield.valueKey);
}
