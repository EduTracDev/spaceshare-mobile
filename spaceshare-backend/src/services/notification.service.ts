import prisma from '../utils/prisma';
import { sendNotificationEmail } from './email.service';
import { sendPushNotification } from './push.service';

type NotificationType =
  | 'BOOKING_REQUEST_SENT'
  | 'BOOKING_APPROVED'
  | 'BOOKING_DECLINED'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_SUCCESSFUL'
  | 'PAYMENT_FAILED'
  | 'REVIEW_REMINDER'
  | 'DISPUTE_SUBMITTED'
  | 'REFUND_PROCESSED'
  | 'NEW_BOOKING_REQUEST'
  | 'LISTING_APPROVED'
  | 'LISTING_REJECTED'
  | 'REVIEW_RECEIVED'
  | 'PAYOUT_SENT';

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  bookingId?: string
) => {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, bookingId },
  });

  // Fire email/push based on the user's saved preferences — never blocks or throws,
  // since a delivery failure shouldn't affect the in-app notification that already saved fine
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, pushToken: true, emailNotifications: true, pushNotifications: true },
  });

  if (user) {
    if (user.emailNotifications) {
      sendNotificationEmail(user.email, title, body).catch(() => {});
    }
    if (user.pushNotifications && user.pushToken) {
      sendPushNotification(user.pushToken, title, body).catch(() => {});
    }
    // SMS intentionally not wired yet — smsNotifications preference is stored but inert
    // until a provider (pending CAC registration) is set up
  }

  return notification;
};

export const getMyNotifications = async (userId: string) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const markAsRead = async (notificationId: string, userId: string) => {
  const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notif) throw new Error('Notification not found');
  if (notif.userId !== userId) throw new Error('You do not have permission to update this notification');

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
};

export const markAllAsRead = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return { message: 'All notifications marked as read' };
};