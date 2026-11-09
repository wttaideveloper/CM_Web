export const platformCommerceSections = [
  "overview",
  "payment-settings",
  "currencies",
  "tax",
  "transactions",
  "refunds",
  "settlements",
  "invoices",
  "reports",
] as const;

export type PlatformCommerceSection = (typeof platformCommerceSections)[number];

export function isPlatformCommerceSection(value: string): value is PlatformCommerceSection {
  return platformCommerceSections.includes(value as PlatformCommerceSection);
}

export function resolvePlatformCommerceSection(section: readonly string[] | undefined): PlatformCommerceSection | null {
  const routeSection = section?.join("/") ?? "overview";
  return isPlatformCommerceSection(routeSection) ? routeSection : null;
}
