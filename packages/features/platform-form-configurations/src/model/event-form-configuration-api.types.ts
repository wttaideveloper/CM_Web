/** Server-defined scope used when resolving an Event form configuration. */
export type EventFormConfigurationScope = "global" | "selective";

/** Lifecycle state returned for an Event form configuration or version. */
export type EventFormConfigurationStatus = "draft" | "published" | "retired";

/** Backend-defined renderer identifier. */
export type EventFormRenderer = string;

/** Backend-defined Event field value type. */
export type EventFormValueType = string;

/** A selectable option configured for one Event form field. */
export interface EventFormFieldOption { value: string; label: string; position: number; }

/** Validation metadata accepted by the Event Form Configuration API. */
export interface EventFormFieldValidation { min_length?: number | null; max_length?: number | null; min?: number | null; max?: number | null; pattern?: string | null; }

/** Persisted settings for a backend-defined composite Event core field. */
export interface EventFormCompositeConfig {
  enabled_fields?: string[];
  required_fields?: string[];
  [key: string]: unknown;
}

/** A field in an ordered Event form section. */
export interface EventFormField { id: string; source: "core" | "custom"; core_key: string | null; stable_key: string | null; label: string; renderer: EventFormRenderer; value_type: EventFormValueType; required: boolean; is_enabled: boolean; position: number; placeholder: string | null; help_text: string | null; options: EventFormFieldOption[]; validation: EventFormFieldValidation; composite_config?: EventFormCompositeConfig | null; }

/** A section and its ordered fields in a persisted configuration version. */
export interface EventFormSection { id: string; stable_key: string; label: string; description: string | null; position: number; is_enabled: boolean; fields: EventFormField[]; }

/** An immutable version of an Event form configuration. */
export interface EventFormConfigurationVersion { id: string; configuration_id: string; version: number; status: EventFormConfigurationStatus; sections: EventFormSection[]; created_by: string | null; created_at: string | null; published_at: string | null; }

/** Summary returned by the Event form configuration list endpoint. */
export interface EventFormConfigurationSummary { id: string; name: string; description: string | null; scope: EventFormConfigurationScope; status: EventFormConfigurationStatus; is_active: boolean; current_version: number; created_by: string | null; created_at: string | null; updated_at: string | null; published_at: string | null; }

/** Full Event form configuration returned by detail and mutation endpoints. */
export interface EventFormConfiguration extends EventFormConfigurationSummary { draft_version: EventFormConfigurationVersion | null; published_version?: EventFormConfigurationVersion | null; }

/** Response returned after creating a draft configuration. */
export interface EventFormConfigurationCreateResponse extends EventFormConfiguration { draft_version: EventFormConfigurationVersion; }

/** Authoritative metadata for one core Event field. */
export interface EventCoreFieldRegistryEntry { key: string; display_name: string; value_type: EventFormValueType; allowed_renderers: EventFormRenderer[]; default_renderer: EventFormRenderer; required_by_domain: boolean; removable: boolean; hideable: boolean; configurable: { label: boolean; section: boolean; position: boolean; required: boolean; renderer: boolean; placeholder: boolean; help_text: boolean; validation: boolean; }; }

/** One tenant assignment returned by the configuration assignment endpoint. */
export interface EventFormAssignment { id: string; configuration_id: string; tenant_id: string; created_at: string | null; updated_at: string | null; }

/** One immutable audit entry for a configuration change. */
export interface EventFormAuditEntry { id: string; configuration_id: string; action: string; actor_id: string | null; created_at: string; metadata: Record<string, unknown> | null; }

/** Writable section shape shared by create and update requests. */
export interface EventFormSectionInput { id?: string | null; stable_key: string; label: string; description: string | null; position: number; is_enabled: boolean; fields: EventFormFieldInput[]; }

/** Writable field shape shared by create and update requests. */
export interface EventFormFieldInput { id?: string | null; source: "core" | "custom"; core_key: string | null; stable_key: string | null; label: string; renderer: EventFormRenderer; value_type: EventFormValueType; required: boolean; is_enabled: boolean; position: number; placeholder: string | null; help_text: string | null; options: EventFormFieldOption[]; validation: EventFormFieldValidation; composite_config?: EventFormCompositeConfig | null; }

/** Request body for creating an Event form configuration. */
export interface CreateEventFormConfigurationRequest { name: string; description: string | null; scope: EventFormConfigurationScope; sections: EventFormSectionInput[]; }

/** Request body for updating an Event form configuration. */
export interface UpdateEventFormConfigurationRequest { name: string; description: string | null; scope: EventFormConfigurationScope; sections: EventFormSectionInput[]; }

/** Request body for replacing a configuration's tenant assignments. */
export interface UpdateEventFormConfigurationAssignmentsRequest { tenant_ids: string[]; }

/** Response returned after publishing a configuration. */
export interface EventFormPublishResponse { configuration: EventFormConfiguration; version: EventFormConfigurationVersion; }
