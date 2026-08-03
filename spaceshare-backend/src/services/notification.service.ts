import prisma from '../utils/prisma';

type NotificationType =
  | 'BOOKING_REQUEST_SENT'
  | 'BOOKING_APPROVED'
  | 'BOOKING_DECLINED'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_SUCCESSFUL'
  | 'PAYMENT_FAILED'
  | 'REVIEW_REMINDER'
  | 'DISPUTE_SUBMITTED'
  | 'REFUND_PROCESSED';

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  bookingId?: string
) => {
  return prisma.notification.create({
    data: { userId, type, title, body, bookingId },
  });
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