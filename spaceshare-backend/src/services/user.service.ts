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

  console.log('currentPassword entered:', currentPassword);
  console.log('hashed password in DB:', user.password);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  console.log('isMatch:', isMatch);

  if (!isMatch) throw new Error('Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });
};