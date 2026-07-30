import { getShellAppOrigin } from "@ihp/auth";

export function getShellRoute(pathname: string) {
  const shellOrigin = getShellAppOrigin();
  return shellOrigin ? new URL(pathname, shellOrigin).toString() : pathname;
}
