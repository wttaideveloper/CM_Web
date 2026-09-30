import type { ConfiguredField, FormConfigurationType, FormFieldOption, FormSection } from "./form-configuration.types";
import { EVENT_DELIVERY_BUNDLE, isEventDeliveryBundleKey } from "./event-delivery-bundle";

/** Derives persisted section positions from the current local builder order. */
export function normalizeSectionPositions(sections: readonly FormSection[]): FormSection[] { return sections.map((section, index) => ({ ...section, position: index + 1 })); }
/** Derives positions independently inside each section after any field operation. */
export function normalizeFieldPositions(sections: readonly FormSection[], fields: readonly ConfiguredField[]): ConfiguredField[] { return sections.flatMap((section) => fields.filter((field) => field.sectionLocalId === section.localId).map((field, index) => ({ ...field, sectionLocalId: section.localId, position: index + 1 }))); }
/** Derives option positions from option order without altering their values. */
export function normalizeOptionPositions(options: readonly FormFieldOption[]): FormFieldOption[] { return options.map((option, index) => ({ ...option, position: index + 1 })); }
/** Normalizes all builder ordering after every canvas drag operation. */
export function normalizeConfigurationOrder(sections: readonly FormSection[], fields: readonly ConfiguredField[]) { const normalizedSections = normalizeSectionPositions(sections); return { sections: normalizedSections, fields: normalizeFieldPositions(normalizedSections, fields) }; }

/** Moves a field into a target section and derives each section's positions from its resulting order. */
export function moveConfiguredField(fields: readonly ConfiguredField[], fieldLocalId: string, targetSectionLocalId: string, targetIndex: number, configurationType: FormConfigurationType = "event") {
  const movingField = fields.find((field) => field.localId === fieldLocalId);
  if (!movingField) return [...fields];
  if (configurationType === "event" && isEventDeliveryBundleKey(movingField.coreKey)) {
    const movingIds = new Set(fields.filter((field) => isEventDeliveryBundleKey(field.coreKey)).map((field) => field.localId));
    const movingFields = EVENT_DELIVERY_BUNDLE.flatMap((key) => fields.filter((field) => field.coreKey === key));
    const remaining = fields.filter((field) => !movingIds.has(field.localId));
    const targetFields = remaining.filter((field) => field.sectionLocalId === targetSectionLocalId).sort((left, right) => left.position - right.position);
    const insertionIndex = Math.max(0, Math.min(targetIndex, targetFields.length));
    targetFields.splice(insertionIndex, 0, ...movingFields.map((field) => ({ ...field, sectionLocalId: targetSectionLocalId })));
    return remaining.filter((field) => field.sectionLocalId !== targetSectionLocalId).concat(targetFields);
  }
  const remaining = fields.filter((field) => field.localId !== fieldLocalId);
  const targetFields = remaining.filter((field) => field.sectionLocalId === targetSectionLocalId).sort((left, right) => left.position - right.position);
  const insertionIndex = Math.max(0, Math.min(targetIndex, targetFields.length));
  targetFields.splice(insertionIndex, 0, { ...movingField, sectionLocalId: targetSectionLocalId });
  return remaining.filter((field) => field.sectionLocalId !== targetSectionLocalId).concat(targetFields);
}
