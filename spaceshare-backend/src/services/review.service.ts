import prisma from '../utils/prisma';
import { broadcastToAdmins } from './admin/notification.service';
import { createNotification } from './notification.service';
import { recomputeListingAggregates } from './admin/reported-reviews.service';

export interface CreateReviewInput {
  bookingId: string;
  listingId: string;
  rating: number;
  comment: string;
  authorId: string;
  hostId: string;
}

/**
 * Mobile endpoint: Guest leaves a review after a COMPLETED booking.
 *
 * Business rules (defense-in-depth):
 *   - Author MUST be the booking.guest (prevents host from reviewing their own listing
 *     or another guest reviewing a booking they didn't participate in).
 *   - Booking status MUST be COMPLETED (can't review a booking you didn't actually stay).
 *   - One review per bookingId (unique DB index guarantee at schema level — double-checks
 *     the Prisma schema @@unique(bookingId) already provides this defense).
 *   - Rating clamped to 1..5 inclusive.
 */
export async function createReview(input: CreateReviewInput) {
  if (!input.bookingId || !input.listingId || !input.hostId) throw new Error('bookingId, listingId, authorId, hostId are all required');
  if (!Number.isFinite(input.rating)) throw new Error('Rating is required');
  if (input.rating < 1 || input.rating > 5) throw new Error('Rating must be between 1 and 5');
  if (!input.comment?.trim()) throw new Error('Review comment is required');

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      guestId: true,
      status: true,
      spaceName: true,
      listing: { select: { hostId: true, spaceName: true } },
    },
  });
  if (!booking) throw new Error('Booking not found');
  if (booking.guestId !== input.authorId) throw new Error('Only the booking guest can leave a review for this booking');
  if (booking.status !== 'COMPLETED') throw new Error('You can only leave a review for completed bookings');
  if (booking.listing.hostId !== input.hostId) throw new Error('hostId does not match listing host for this booking');

  const review = await prisma.review.create({
    data: {
      bookingId: input.bookingId,
      listingId: input.listingId,
      authorId: input.authorId,
      hostId: input.hostId,
      rating: input.rating,
      comment: input.comment.trim(),
    },
  });

  // Mobile notification: tell the listing.host their listing received a new review
  await createNotification(
    input.hostId,
    'REVIEW_RECEIVED',
    'New review received',
    `Your listing \"${booking.spaceName}\" received a ${input.rating}-star review`,
    input.bookingId,
  );

  // Refresh listing aggregates (averageRating + reviewCount) after new review added
  void recomputeListingAggregates(input.listingId).catch(() => {});

  return review;
}



/**
 * Mobile endpoint: Any authenticated user (host or guest) can report a review they
 * believe violates platform guidelines. This writes reportReason + reportedById on
 * the Review row, sets reportStatus = PENDING (queues for admin moderation), and
 * BROADCASTS REVIEW_REPORTED to every ADMIN/SUPER_ADMIN inbox notification.
 *
 * @param reporterUserId
 * @param reviewId      
 * @param reason
 */
export async function reportReview(
  reporterUserId: string,
  reviewId: string,
  reason: string,
) {
  if (!reviewId) throw new Error('Review id is required');
  const reportReason = reason?.trim();
  if (!reportReason) throw new Error('Please provide a reason for reporting this review');

  const existing = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      authorId: true,
      listingId: true,
      comment: true,
      reportStatus: true,
      booking: { select: { spaceName: true } },
    },
  });
  if (!existing) throw new Error('Review not found');

  if (existing.authorId === reporterUserId) throw new Error('You cannot report your own review');

  // Upsert-style: if another report already exists on this review and admin hasn't
  // moderated it yet, the new reporter simply updates the reason + reportedBy fields
  // (no multi-report model currently we only track 1 report inline).
  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      reportReason,
      reportedById: reporterUserId,
      reportStatus: 'PENDING',
    },
  });

  // ——— ADMIN BROADCAST REVIEW_REPORTED ———
  broadcastToAdmins({
    type: 'REVIEW_REPORTED',
    title: 'Review flagged for moderation',
    body: `A review on listing \"${existing.booking?.spaceName ?? ''}\" was reported: ${reportReason.slice(0, 120)}${reportReason.length > 120 ? '…' : ''}`,
    referenceId: reviewId,
  });

  return { reviewId: updated.id, reportStatus: updated.reportStatus };
}


export async function getReviewById(reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error('Review not found');
  return review;
}