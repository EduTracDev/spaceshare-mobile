import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { sendVerificationEmail } from './email.service';

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const registerUser = async (
  email: string,
  password: string,
  role: 'GUEST' | 'HOST'
) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role,
    },
  });

  // Generate verification code
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Save code to database
  await prisma.verificationCode.upsert({
    where: { userId: user.id },
    update: { code, expiresAt },
    create: { code, expiresAt, userId: user.id },
  });

  // Send verification email
  await sendVerificationEmail(email, code);

  return { id: user.id, email: user.email, role: user.role };
};

export const verifyEmail = async (email: string, code: string) => {
  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');

  // Find verification code
  const verificationCode = await prisma.verificationCode.findUnique({
    where: { userId: user.id },
  });

  if (!verificationCode) throw new Error('No verification code found');
  if (verificationCode.code !== code) throw new Error('Invalid code');
  if (new Date() > verificationCode.expiresAt) throw new Error('Code expired');

  // Mark user as verified
  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true },
  });

  // Delete verification code
  await prisma.verificationCode.delete({ where: { userId: user.id } });

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  return { token, user: { id: user.id, email: user.email, role: user.role } };
};

export const resendVerificationCode = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');
  if (user.isVerified) throw new Error('Email already verified');

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.verificationCode.upsert({
    where: { userId: user.id },
    update: { code, expiresAt },
    create: { code, expiresAt, userId: user.id },
  });

  await sendVerificationEmail(email, code);

  return { message: 'Verification code resent' };
};