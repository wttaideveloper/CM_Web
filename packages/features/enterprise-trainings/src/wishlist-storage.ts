"use client";

import { addTrainingToWishlist, listTrainingWishlist, removeTrainingFromWishlist } from "./trainings.service";

export interface WishlistItem {
  trainingId: string;
  title: string;
  addedAt: string;
}

/** Normalizes a raw wishlist entry (backend may return full training objects or id-only rows). */
function normalizeWishlistEntry(raw: unknown): WishlistItem | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const nested = record.training && typeof record.training === "object" ? (record.training as Record<string, unknown>) : record;
  const trainingId =
    (typeof record.training_id === "string" && record.training_id ? record.training_id : null) ??
    (typeof record.trainingId === "string" && record.trainingId ? record.trainingId : null) ??
    (typeof nested.id === "string" && nested.id ? nested.id : null);
  if (!trainingId) return null;
  const title = typeof nested.title === "string" && nested.title.trim() ? nested.title.trim() : typeof record.title === "string" && record.title.trim() ? record.title.trim() : "Training";
  const addedAt =
    (typeof record.added_at === "string" && record.added_at ? record.added_at : null) ??
    (typeof record.wishlisted_at === "string" && record.wishlisted_at ? record.wishlisted_at : null) ??
    (typeof record.created_at === "string" && record.created_at ? record.created_at : null) ??
    new Date().toISOString();
  return { trainingId, title, addedAt };
}

/** Loads the wishlist from the API. */
export async function getWishlist(): Promise<WishlistItem[]> {
  const data = await listTrainingWishlist();
  const items = data.map(normalizeWishlistEntry).filter((entry): entry is WishlistItem => entry !== null);
  const seen = new Set<string>();
  return items.filter((entry) => (seen.has(entry.trainingId) ? false : (seen.add(entry.trainingId), true)));
}

/** Adds a training to the wishlist via the API. */
export async function addToWishlist(trainingId: string): Promise<void> {
  await addTrainingToWishlist(trainingId);
}

/** Removes a training from the wishlist via the API. */
export async function removeFromWishlist(trainingId: string): Promise<void> {
  await removeTrainingFromWishlist(trainingId);
}

/** Whether a training is currently saved to the wishlist. */
export async function isInWishlist(trainingId: string): Promise<boolean> {
  const items = await getWishlist();
  return items.some((entry) => entry.trainingId === trainingId);
}