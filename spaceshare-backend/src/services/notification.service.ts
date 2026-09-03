import prisma from '../utils/prisma';
import { sendNotificationEmail } from './email.service';
import { sendPushNotification } from './push.service';
import { $Enums } from '@prisma/client';

export type NotificationType = $Enums.NotificationType;

// Service is used by the admin 
export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  bookingId?: string,
  referenceId?: string
) => {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, bookingId: bookingId ?? undefined, referenceId: referenceId ?? undefined },
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

// Admin notification service uses this to mark notifications as read for admin users.
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