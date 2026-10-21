export type ObservationReview = {
  reviewId: string;
  listingId: string;
  reviewedAt: string;
  note?: string;
  listingTitle?: string;
  platform?: string;
  askingPrice?: number;
  currency?: string;
};

export function normalizeObservationReview(review: Partial<ObservationReview> & Pick<ObservationReview, "listingId" | "reviewedAt">): ObservationReview {
  return {
    ...review,
    reviewId: review.reviewId ?? `${review.listingId}:${review.reviewedAt}`,
  };
}

export function mergeObservationReviews(local: ObservationReview[], remote: ObservationReview[], limit = 20): ObservationReview[] {
  const byId = new Map<string, ObservationReview>();
  for (const review of [...local, ...remote]) {
    const existing = byId.get(review.reviewId);
    if (!existing || review.reviewedAt > existing.reviewedAt || (review.reviewedAt === existing.reviewedAt && JSON.stringify(review) > JSON.stringify(existing))) {
      byId.set(review.reviewId, review);
    }
  }
  return [...byId.values()].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt)).slice(0, limit);
}
