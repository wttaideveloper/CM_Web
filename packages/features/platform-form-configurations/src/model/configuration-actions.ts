import type { FormConfigurationListItem } from "../model/form-configuration.types";

export type ConfigurationAction = "view" | "edit" | "publish" | "activate" | "deactivate" | "retire" | "delete";

/** Derives conservative lifecycle actions until the API provides explicit available actions. */
export function getConfigurationActions(configuration: FormConfigurationListItem): readonly ConfigurationAction[] {
  if (configuration.status === "retired") return ["view", "edit"];
  if (configuration.status === "draft") return configuration.publishedAt === null ? ["view", "edit", "publish", "delete"] : ["view", "edit", "publish", "retire"];
  return configuration.active ? ["view", "edit", "deactivate", "retire"] : ["view", "edit", "activate", "retire"];
}
