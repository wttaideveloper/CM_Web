export type ExistingGroupPreviewItem = {
  id: string;
  name: string;
  member_count: number | null;
  status: string | null;
};

export type ExistingGroupsPreviewState = "loading" | "error" | "empty" | "details-unavailable" | "ready";

/** Resolves the safe display state for an associated-Group preview. */
export function getExistingGroupsPreviewState(input: { isPending: boolean; isError: boolean; count: number | null; itemCount: number }): ExistingGroupsPreviewState {
  if (input.isPending) return "loading";
  if (input.isError) return "error";
  if (input.itemCount > 0) return "ready";
  return input.count === 0 ? "empty" : "details-unavailable";
}

/** Keeps larger associated-Group lists collapsed until the user opens them. */
export function shouldCollapseExistingGroups(count: number | null): boolean {
  return count !== null && count > 3;
}
