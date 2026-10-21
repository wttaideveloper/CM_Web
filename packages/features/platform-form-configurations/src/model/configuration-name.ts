import type { FormConfigurationListItem } from "./form-configuration.types";

/** Checks whether a configuration name is already used, ignoring case and extra spaces. */
export function hasDuplicateConfigurationName(
  name: string,
  configurations: readonly Pick<FormConfigurationListItem, "id" | "name">[],
  currentConfigurationId?: string,
): boolean {
  const normalizedName = name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (!normalizedName) return false;
  return configurations.some((configuration) =>
    configuration.id !== currentConfigurationId
    && configuration.name.trim().replace(/\s+/g, " ").toLocaleLowerCase() === normalizedName,
  );
}
