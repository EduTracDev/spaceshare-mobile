import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { sendVerificationEmail } from './email.service';

// Generates a random 6-digit numeric code (100000–999999)
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const registerUser = async (
  email: string,
  password: string,
  role: 'GUEST' | 'HOST'
) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Salt rounds of 12 for a strong cost factor
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, role },
  });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // Upsert so re-registering with the same email refreshes the code rather than erroring
  await prisma.verificationCode.upsert({
    where: { userId: user.id },
    update: { code, expiresAt },
    create: { code, expiresAt, userId: user.id },
  });

  await sendVerificationEmail(email, code);

  // Return only safe fields — never expose the hashed password
  return { id: user.id, email: user.email, role: user.role };
};

export const verifyEmail = async (email: string, code: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');

  const verificationCode = await prisma.verificationCode.findUnique({
    where: { userId: user.id },
  });

  if (!verificationCode) throw new Error('No verification code found');
  if (verificationCode.code !== code) throw new Error('Invalid code');
  if (new Date() > verificationCode.expiresAt) throw new Error('Code expired');

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true },
  });

  // Clean up the code immediately after use so it can't be replayed
  await prisma.verificationCode.delete({ where: { userId: user.id } });

  // JWT carries userId and role so downstream middleware can authorize without a DB call
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
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // Upsert replaces any existing code, invalidating the previous one
  await prisma.verificationCode.upsert({
    where: { userId: user.id },
    update: { code, expiresAt },
    create: { code, expiresAt, userId: user.id },
  });

  await sendVerificationEmail(email, code);

  return { message: 'Verification code resent' };
};
export const loginUser = async (email: string, password: string) => {
  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid email or password');

  // Check if email is verified before allowing login
  if (!user.isVerified) throw new Error('Please verify your email first');

  // Compare submitted password against hashed password in DB
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid email or password');

  // Generate JWT — valid for 7 days
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  return { token, user: { id: user.id, email: user.email, role: user.role } };
};
export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  // Don't reveal if email exists or not — security best practice
  if (!user) return { message: 'If this email exists, a reset code has been sent' };

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Reuse the same verification code table for reset codes
  await prisma.verificationCode.upsert({
    where: { userId: user.id },
    update: { code, expiresAt },
    create: { code, expiresAt, userId: user.id },
  });

  await sendVerificationEmail(email, code);

  return { message: 'If this email exists, a reset code has been sent' };
};

export const verifyResetCode = async (email: string, code: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid request');

  const verificationCode = await prisma.verificationCode.findUnique({
    where: { userId: user.id },
  });

  if (!verificationCode) throw new Error('No reset code found');
  if (verificationCode.code !== code) throw new Error('Invalid code');
  if (new Date() > verificationCode.expiresAt) throw new Error('Code expired');

  return { message: 'Code verified', userId: user.id };
};

export const resetPassword = async (email: string, code: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid request');

  const verificationCode = await prisma.verificationCode.findUnique({
    where: { userId: user.id },
  });

  if (!verificationCode) throw new Error('No reset code found');
  if (verificationCode.code !== code) throw new Error('Invalid or expired code');
  if (new Date() > verificationCode.expiresAt) throw new Error('Code expired');

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  // Clean up reset code
  await prisma.verificationCode.delete({ where: { userId: user.id } });

  return { message: 'Password reset successful' };
};