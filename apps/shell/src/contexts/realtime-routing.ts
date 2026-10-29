/**
 * Returns whether the current compatibility route should use the normal Enterprise chat session.
 *
 * The marketplace adapter remains the fallback so demo routes retain their existing
 * session behavior while the Enterprise messages route uses Web Auth-backed chat access.
 */
export function shouldUseNormalEnterpriseRealtimeAuth(
  pathname: string,
  authReady: boolean,
  authenticated: boolean,
  canUseProviderChat: boolean,
  chatAuthReady: boolean,
): boolean {
  return (
    pathname === "/admin/messages" &&
    authReady &&
    authenticated &&
    canUseProviderChat &&
    chatAuthReady
  );
}

/**
 * Selects the existing Enterprise realtime connection for Group Chat without
 * changing Direct Chat eligibility. Group room access remains backend-authorized.
 */
export function shouldUseGroupRealtimeAuth(
  pathname: string,
  authReady: boolean,
  authenticated: boolean,
  chatAuthReady: boolean,
  groupRealtimeEnabled: boolean,
): boolean {
  return (
    pathname === "/admin/messages" &&
    authReady &&
    authenticated &&
    chatAuthReady &&
    groupRealtimeEnabled
  );
}
