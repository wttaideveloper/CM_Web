import { useQuery } from "@tanstack/react-query";

import { getPlatformUsers } from "./platform-users.service";

/** Stable global-user query key isolated from tenant-membership users. */
export const platformUsersQueryKey = ["platform-super-admin", "users"] as const;

/** Queries dedicated Super Admin global users. */
export function usePlatformUsers() {
  return useQuery({ queryKey: platformUsersQueryKey, queryFn: getPlatformUsers, retry: 1, staleTime: 30_000 });
}
