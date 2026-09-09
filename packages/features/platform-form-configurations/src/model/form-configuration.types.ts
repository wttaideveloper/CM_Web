import type { EventFormCompositeConfig } from "./event-form-configuration-api.types";

export type FormConfigurationType = "event" | "training";
export type FormConfigurationScope = "global" | "selective";
export type FormConfigurationStatus = "draft" | "published" | "retired";
export type FormRenderer = string;

export type BuilderEntityIdentity = { localId: string; serverId: string | null };
export type FormFieldOption = { value: string; label: string; position: number };
export type FormFieldValidation = { minLength?: number | null; maxLength?: number | null; min?: number | null; max?: number | null; pattern?: string | null };
export type FormSection = BuilderEntityIdentity & { stableKey: string; name: string; description: string; enabled: boolean; position: number };

export type ConfiguredField = BuilderEntityIdentity & { stableKey: string | null; source: "core" | "custom"; coreKey: string | null; label: string; sectionLocalId: string; position: number; valueType: string; required: boolean; renderer: FormRenderer; placeholder: string; helpText: string; options: FormFieldOption[]; validation: FormFieldValidation; compositeConfig?: EventFormCompositeConfig | null; enabled: boolean };

export type FormConfiguration = {
  id: string; type: FormConfigurationType; name: string; description: string; scope: FormConfigurationScope; status: FormConfigurationStatus; active: boolean; version: number; tenantIds: string[]; updatedAt: string; sections: FormSection[]; fields: ConfiguredField[];
};

export type CoreFieldRegistryItem = { key: string; displayName: string; valueType: string; allowedRenderers: readonly FormRenderer[]; defaultRenderer: FormRenderer; requiredByDomain: boolean; removable: boolean; hideable: boolean; configurable: { label: boolean; section: boolean; position: boolean; required: boolean; renderer: boolean; placeholder: boolean; helpText: boolean; validation: boolean } };
export type FormConfigurationListItem = { id: string; name: string; description: string | null; scope: string; status: string; active: boolean; currentVersion: number; updatedAt: string | null };
