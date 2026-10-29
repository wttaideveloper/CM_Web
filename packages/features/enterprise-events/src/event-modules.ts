import type { EventModules, EventTypeDefinition } from "./events.service";

export const eventModuleKeys: ReadonlyArray<keyof EventModules> = ["registration", "tickets", "sessions", "check_in", "online_meeting", "custom_questions", "meals", "accommodation"];

/** Applies one Event Type policy without allowing a previous type's modules to leak through. */
export function reconcileEventModules(eventType: Pick<EventTypeDefinition, "default_modules" | "allowed_modules" | "required_modules">, current: EventModules | null, preserveChoices: boolean): EventModules {
  const source = preserveChoices && current ? current : eventType.default_modules;
  return Object.fromEntries(eventModuleKeys.map((key) => [key, eventType.required_modules[key] ? true : eventType.allowed_modules[key] === false ? false : source[key]])) as unknown as EventModules;
}

/** Returns no capability state when the Event Type selection is empty or unresolved. */
export function reconcileSelectedEventModules(eventType: Pick<EventTypeDefinition, "default_modules" | "allowed_modules" | "required_modules"> | undefined, current: EventModules | null): EventModules | null {
  return eventType ? reconcileEventModules(eventType, current, false) : null;
}
