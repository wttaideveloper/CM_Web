export type EventPurchaseWindow = {
  start: string;
  end: string;
};

export type PurchaseWindowOption = {
  purchase_start_at?: string | null;
  purchase_end_at?: string | null;
};

/** Defaults assigned to a newly added Meal or Accommodation option. */
export type NewEventServiceOptionDefaults = PurchaseWindowOption & {
  currency: string | null;
};

/**
 * Derives the service purchasing window from the Event registration window.
 * Values are intentionally compared and returned as the existing local
 * wall-clock strings; no timezone conversion belongs in this helper.
 */
export function deriveEventPurchaseWindow(
  registrationOpenAt: string,
  registrationCloseAt: string,
  registrationCutoff: string,
): EventPurchaseWindow {
  const closingValues = [registrationCutoff, registrationCloseAt]
    .filter((value) => Boolean(value))
    .sort();

  return {
    start: registrationOpenAt || "",
    end: closingValues[0] ?? "",
  };
}

/** Applies an already-derived purchase window to a newly added service option. */
export function deriveNewEventServiceOptionDefaults(
  currency: string | null | undefined,
  window: EventPurchaseWindow,
): NewEventServiceOptionDefaults {
  return {
    currency: currency?.trim() || null,
    purchase_start_at: window.start || null,
    purchase_end_at: window.end || null,
  };
}

export function syncPurchaseWindow<T extends PurchaseWindowOption>(option: T, window: EventPurchaseWindow): T {
  return {
    ...option,
    purchase_start_at: window.start || null,
    purchase_end_at: window.end || null,
  };
}

export function syncPurchaseWindows<T extends PurchaseWindowOption>(options: readonly T[], window: EventPurchaseWindow): T[] {
  return options.map((option) => syncPurchaseWindow(option, window));
}
