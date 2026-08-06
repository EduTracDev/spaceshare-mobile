import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      isFirstLogin: true,
    },
  });

  if (!user) throw new Error('User not found');
  return user;
};

export const updateUserProfile = async (
  userId: string,
  data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      isFirstLogin: true,
    },
  });

  return user;
};

export const changeUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  if (!user.password) {
    throw new Error('This account uses social sign-in and has no password to change');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new Error('Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });
};

export const markFirstLoginDone = async (userId: string) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isFirstLogin: false },
    select: { id: true, isFirstLogin: true },
  });
  return user;
};

export const setUserRole = async (userId: string, role: 'GUEST' | 'HOST') => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  // Only allow this on a user's first login — prevents role-switching after onboarding
  if (!user.isFirstLogin) {
    throw new Error('Role can only be set during initial onboarding');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      isFirstLogin: true,
    },
  });

  return updated;
};