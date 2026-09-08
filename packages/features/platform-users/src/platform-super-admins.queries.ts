import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activatePlatformSuperAdmin,
  deactivatePlatformSuperAdmin,
  deletePlatformSuperAdmin,
  getPlatformSuperAdmins,
  invitePlatformSuperAdmin,
  type InvitePlatformSuperAdminPayload,
} from "./platform-super-admins.service";

/** Stable Platform-only query key for the dedicated Super Admin collection. */
export const platformSuperAdminsQueryKey = ["platform-super-admin", "super-admins"] as const;

/** Queries dedicated Super Admin accounts through the Platform BFF. */
export function usePlatformSuperAdmins() {
  return useQuery({ queryKey: platformSuperAdminsQueryKey, queryFn: getPlatformSuperAdmins, retry: 1, staleTime: 30_000 });
}

function usePlatformSuperAdminMutation<TVariables>(action: (variables: TVariables) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: platformSuperAdminsQueryKey });
    },
  });
}

/** Mutates one account to active, then refreshes the dedicated Super Admin collection. */
export function useActivatePlatformSuperAdmin() {
  return usePlatformSuperAdminMutation(activatePlatformSuperAdmin);
}

/** Mutates one account to inactive, then refreshes the dedicated Super Admin collection. */
export function useDeactivatePlatformSuperAdmin() {
  return usePlatformSuperAdminMutation(deactivatePlatformSuperAdmin);
}

/** Deletes one account, then refreshes the dedicated Super Admin collection. */
export function useDeletePlatformSuperAdmin() {
  return usePlatformSuperAdminMutation(deletePlatformSuperAdmin);
}

/** Invites one Super Admin and refreshes the dedicated Super Admin collection. */
export function useInvitePlatformSuperAdmin() {
  return usePlatformSuperAdminMutation((payload: InvitePlatformSuperAdminPayload) => invitePlatformSuperAdmin(payload));
}
