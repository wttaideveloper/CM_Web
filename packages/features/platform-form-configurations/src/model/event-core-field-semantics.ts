/**
 * Defines frontend-only presentation rules for core Event fields whose runtime
 * control is governed by a separate backend taxonomy rather than form options.
 */
export type EventCoreFieldSemantic = {
  displayRenderer: "taxonomy_select";
  optionsSource: "event_categories";
};

const TAXONOMY_SELECT_SEMANTICS: Readonly<Record<string, EventCoreFieldSemantic>> = {
  category: { displayRenderer: "taxonomy_select", optionsSource: "event_categories" },
  subcategory: { displayRenderer: "taxonomy_select", optionsSource: "event_categories" },
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
