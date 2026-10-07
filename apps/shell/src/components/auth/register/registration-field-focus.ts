/** Scrolls the first signup field with a rendered validation message into view and focuses it. */
export function focusFirstRegistrationFieldError(form: HTMLFormElement | null): void {
  const errorMessage = form?.querySelector<HTMLElement>("[data-registration-field-error]");
  const field = errorMessage?.closest("label")?.querySelector<HTMLElement>("input, select, textarea");
  focusRegistrationField(field ?? errorMessage ?? null);
}

/** Scrolls a signup control into view and focuses it without changing its value. */
export function focusRegistrationField(target: HTMLElement | null): void {
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.focus({ preventScroll: true });
}
