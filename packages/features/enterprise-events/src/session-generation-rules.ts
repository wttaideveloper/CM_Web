/** A user-configured duration/count group for session generation. */
export interface SessionGenerationRule {
  id: number;
  duration: number;
  count: number;
  custom: boolean;
}

/** Returns the initial duration group shown by the session generator. */
export function createDefaultSessionGenerationRules(): SessionGenerationRule[] {
  return [{ id: 1, duration: 60, count: 1, custom: false }];
}

/** Applies a preset or switches a duration group into custom-duration mode. */
export function updateSessionGenerationRule(rules: readonly SessionGenerationRule[], id: number, value: string): SessionGenerationRule[] {
  const custom = value === "custom";
  const duration = custom ? rules.find((rule) => rule.id === id)?.duration ?? 60 : Number(value);
  return rules.map((rule) => rule.id === id ? { ...rule, custom, duration: Number.isFinite(duration) && duration > 0 ? duration : 1 } : rule);
}

/** Applies a user-entered custom duration without changing the generation result. */
export function updateSessionGenerationRuleDuration(rules: readonly SessionGenerationRule[], id: number, value: string): SessionGenerationRule[] {
  const duration = Number(value);
  return rules.map((rule) => rule.id === id ? { ...rule, duration: Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 1 } : rule);
}

/** Applies the bounded count control for one duration group. */
export function updateSessionGenerationRuleCount(rules: readonly SessionGenerationRule[], id: number, count: number): SessionGenerationRule[] {
  return rules.map((rule) => rule.id === id ? { ...rule, count: Math.max(1, Math.min(99, count)) } : rule);
}

/** Returns the next stable identifier for a newly added duration group. */
export function nextSessionGenerationRuleId(rules: readonly SessionGenerationRule[]): number {
  return Math.max(0, ...rules.map((rule) => rule.id)) + 1;
}
