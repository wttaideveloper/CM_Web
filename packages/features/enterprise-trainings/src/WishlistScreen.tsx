"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { formatTrainingDate } from "./detail-formatters";
import { TrainingsApiError } from "./trainings.service";
import { getWishlist, removeFromWishlist, type WishlistItem } from "./wishlist-storage";

/** Participant wishlist backed by `GET/POST/DELETE /api/v1/trainings/wishlist`. */
export default function WishlistScreen() {
  const queryClient = useQueryClient();

  const wishlistQuery = useQuery({
    queryKey: ["trainings", "wishlist"],
    queryFn: getWishlist,
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: (trainingId: string) => removeFromWishlist(trainingId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["trainings", "wishlist"] }),
  });

  const items: WishlistItem[] = Array.isArray(wishlistQuery.data) ? wishlistQuery.data : [];
  const errorMessage = wishlistQuery.isError ? (wishlistQuery.error as Error) : removeMutation.isError ? (removeMutation.error as Error) : null;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#06201c]">Wishlist</h1>
        <p className="mt-1 text-sm text-[#52736a]">Trainings you saved for later.</p>
      </div>

      {errorMessage ? (
        <div role="alert" className="mb-4 rounded-xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm font-semibold text-[#b42318]">
          {errorMessage instanceof TrainingsApiError ? errorMessage.message : errorMessage.message}
        </div>
      ) : null}

      {wishlistQuery.isLoading ? <p className="mt-4 text-sm text-[#52736a]">Loading wishlist...</p> : null}
      {!wishlistQuery.isLoading && !wishlistQuery.isError && items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Your wishlist is empty</p>
          <p className="mt-2 text-sm text-[#52736a]">Save trainings you are interested in and come back to them here.</p>
          <Link href="/admin/trainings" className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#195646]">Browse trainings</Link>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.trainingId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#06201c]">{item.title}</p>
                <p className="mt-0.5 text-xs text-[#7f9d94]">Saved {formatTrainingDate(item.addedAt)}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => removeMutation.mutate(item.trainingId)} disabled={removeMutation.isPending} className="h-8 rounded-full border border-[#f3d5d1] px-4 text-xs font-bold text-[#b42318] hover:bg-[#fff6f5] disabled:opacity-60">
                  {removeMutation.isPending ? "Removing..." : "Remove"}
                </button>
                <Link href={`/admin/trainings/${item.trainingId}/book`} className="inline-flex h-8 items-center rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white hover:bg-[#175448]">Book now</Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}