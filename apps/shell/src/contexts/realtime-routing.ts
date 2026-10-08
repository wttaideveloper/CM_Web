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
