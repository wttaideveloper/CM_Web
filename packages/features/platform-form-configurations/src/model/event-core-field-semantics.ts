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
  category: { displayRenderer: "taxonomy_select", optionsSource: "event_categories", description: "Values load automatically from the Event Categories taxonomy." },
  subcategory: { displayRenderer: "taxonomy_select", optionsSource: "event_categories", description: "Values load from the Event Categories taxonomy." },
  location: { displayRenderer: "taxonomy_select", optionsSource: "enterprise_locations", description: "Values load from the Enterprise locations resource." },
  location_id: { displayRenderer: "taxonomy_select", optionsSource: "enterprise_locations", description: "Values load from the Enterprise locations resource." },
  currency: { displayRenderer: "taxonomy_select", optionsSource: "standard_reference", description: "Options come from the backend registry's supported currency list." },
  time_zone: { displayRenderer: "taxonomy_select", optionsSource: "standard_reference", description: "Options come from the backend registry's supported timezone list." },
  duration_type: { displayRenderer: "taxonomy_select", optionsSource: "domain_owned", description: "Options come from the backend registry's static Event values." },
  delivery_mode: { displayRenderer: "taxonomy_select", optionsSource: "domain_owned", description: "Options come from the backend registry's static Event values." },
  pricing_type: { displayRenderer: "taxonomy_select", optionsSource: "domain_owned", description: "Options come from the backend registry's static Free or Paid Event values." },
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
