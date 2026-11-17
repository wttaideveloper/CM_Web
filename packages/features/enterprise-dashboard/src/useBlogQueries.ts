import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMyBlogPost,
  deleteMyBlogPost,
  listBlogCategories,
  listMyBlogPosts,
  unpublishMyBlogPost,
  updateMyBlogPost,
  type BlogKind,
  type BlogManageDetail,
  type BlogPostPayload,
  type BlogStatus,
} from "@ihp/shared";

export function useMyBlogPostsQuery(
  filters: {
    page?: number;
    page_size?: number;
    status?: BlogStatus;
    kind?: BlogKind;
    search?: string;
  } = {},
  enterpriseId?: string,
) {
  return useQuery({
    queryKey: ["blogs", "my-posts", enterpriseId ?? null, filters],
    queryFn: () => listMyBlogPosts({ ...filters, enterpriseId }),
    staleTime: 30_000,
  });
}

export function useBlogCategoriesQuery() {
  return useQuery({
    queryKey: ["blogs", "categories"],
    queryFn: () => listBlogCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBlogPostMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BlogPostPayload) => createMyBlogPost(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blogs", "my-posts"] });
    },
  });
}

export function useUpdateBlogPostMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<BlogPostPayload> }) =>
      updateMyBlogPost(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["blogs", "my-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["blogs", "post", variables.id] });
    },
  });
}

export function useDeleteBlogPostMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMyBlogPost(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blogs", "my-posts"] });
    },
  });
}

export function useUnpublishBlogPostMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => unpublishMyBlogPost(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blogs", "my-posts"] });
    },
  });
}

export type { BlogManageDetail };