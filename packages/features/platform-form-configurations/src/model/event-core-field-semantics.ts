/**
 * Defines frontend-only presentation rules for core Event fields whose runtime
 * control is governed by a separate backend taxonomy rather than form options.
 */
export type EventCoreFieldSemantic = {
  displayRenderer: "taxonomy_select";
  optionsSource: "event_categories" | "domain_owned" | "enterprise_locations" | "standard_reference";
  description: string;
};

const TAXONOMY_SELECT_SEMANTICS: Readonly<Record<string, EventCoreFieldSemantic>> = {
  category: { displayRenderer: "taxonomy_select", optionsSource: "event_categories", description: "Choices are loaded automatically from the Event category list." },
  subcategory: { displayRenderer: "taxonomy_select", optionsSource: "event_categories", description: "Choices come from the Event category list." },
  location: { displayRenderer: "taxonomy_select", optionsSource: "enterprise_locations", description: "Choices are loaded from your enterprise's locations." },
  location_id: { displayRenderer: "taxonomy_select", optionsSource: "enterprise_locations", description: "Choices are loaded from your enterprise's locations." },
  currency: { displayRenderer: "taxonomy_select", optionsSource: "standard_reference", description: "Choices come from the supported currencies list." },
  time_zone: { displayRenderer: "taxonomy_select", optionsSource: "standard_reference", description: "Choices come from the supported time zones list." },
  duration_type: { displayRenderer: "taxonomy_select", optionsSource: "domain_owned", description: "Choices are set by the system for Event duration." },
  delivery_mode: { displayRenderer: "taxonomy_select", optionsSource: "domain_owned", description: "Choices are set by the system for Event delivery." },
  pricing_type: { displayRenderer: "taxonomy_select", optionsSource: "domain_owned", description: "Choices are set by the system for free or paid Events." },
  event_type: { displayRenderer: "taxonomy_select", optionsSource: "domain_owned", description: "Options come from the backend Event Type definitions." },
};

/**
 * Returns fixed runtime semantics for known Event core fields.
 *
 * The backend renderer is retained for API compatibility; this only stops the
 * builder from representing taxonomy-owned fields as freely configurable text.
 */
export function getEventCoreFieldSemantic(coreKey: string | null): EventCoreFieldSemantic | undefined {
  return coreKey ? TAXONOMY_SELECT_SEMANTICS[coreKey] : undefined;
}

/** Returns whether a core field obtains values dynamically from an authenticated runtime source. */
export function isEventCoreFieldRuntimeSourced(coreKey: string | null): boolean {
  const semantic = getEventCoreFieldSemantic(coreKey);
  return semantic?.optionsSource === "event_categories" || semantic?.optionsSource === "enterprise_locations";
}
