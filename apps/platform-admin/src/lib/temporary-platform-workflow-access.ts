const temporaryWorkflowAccessEnabled =
  process.env.NEXT_PUBLIC_ENABLE_TEMP_PLATFORM_WORKFLOW_ACCESS === "true";
const temporaryWorkflowAdministratorUserId =
  process.env.NEXT_PUBLIC_TEMP_PLATFORM_WORKFLOW_ADMIN_USER_ID?.trim() || null;

/**
 * Returns whether the temporary Platform workflow access configuration is complete.
 */
export function isTemporaryPlatformWorkflowAccessConfigured() {
  return temporaryWorkflowAccessEnabled && temporaryWorkflowAdministratorUserId !== null;
}

/**
 * Allows only the configured authenticated user to access the temporary Platform workflow routes.
 */
export function hasTemporaryPlatformWorkflowAccess(userId: string | null | undefined) {
  return (
    isTemporaryPlatformWorkflowAccessConfigured() &&
    userId !== null &&
    userId !== undefined &&
    userId === temporaryWorkflowAdministratorUserId
  );
}
