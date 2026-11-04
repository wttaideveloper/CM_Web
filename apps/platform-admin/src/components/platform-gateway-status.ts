import type { GatewayProviderStatus, GatewayStatus } from "@ihp/commerce";

/** Backend-normalized provider fields that are safe to render. */
export type GatewayProviderView = {
  id: string;
  name: string;
  active: string;
  configured: string;
  mode: string;
  webhookUrl: string;
  webhookSecret: string;
  webhookEvents: readonly string[];
};

/** Backend-normalized gateway status fields that are safe to render. */
export type GatewayStatusView = {
  activeGateway: string;
  activeMode: string;
  editability: string;
  editNote: string;
  baseCurrency: string;
  providers: readonly GatewayProviderView[];
  warnings: readonly string[];
};

function displayText(value: string | null | undefined): string {
  return value?.trim() || "Not supplied";
}

function booleanText(value: boolean | null | undefined, trueLabel: string, falseLabel: string): string {
  if (value === true) return trueLabel;
  if (value === false) return falseLabel;
  return "Not supplied";
}

function mapProvider(provider: GatewayProviderStatus): GatewayProviderView {
  return {
    id: displayText(provider.provider),
    name: displayText(provider.label) === "Not supplied" ? displayText(provider.provider) : displayText(provider.label),
    active: booleanText(provider.active, "Active", "Inactive"),
    configured: booleanText(provider.configured, "Configured", "Not configured"),
    mode: displayText(provider.mode),
    webhookUrl: displayText(provider.webhook_url),
    webhookSecret: booleanText(provider.webhook_secret_set, "Configured (secret hidden)", "Not configured"),
    webhookEvents: provider.webhook_events?.filter((event) => Boolean(event.trim())) ?? [],
  };
}

/** Converts the optional backend gateway response into a secret-safe display model. */
export function mapGatewayStatus(status: GatewayStatus): GatewayStatusView {
  return {
    activeGateway: displayText(status.active_gateway),
    activeMode: displayText(status.active_mode),
    editability: status.editable === false ? "Read-only" : status.editable === true ? "Backend reports editable" : "Not supplied",
    editNote: displayText(status.edit_note),
    baseCurrency: displayText(status.base_currency),
    providers: status.providers?.map(mapProvider) ?? [],
    warnings: status.warnings?.filter((warning) => Boolean(warning.trim())) ?? [],
  };
}
