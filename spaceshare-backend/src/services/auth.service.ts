import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import prisma from '../utils/prisma';
import { sendVerificationEmail } from './email.service';

const googleClient = new OAuth2Client();

// Support multiple client IDs since Expo issues separate ones per platform (iOS/Android/Web)
const GOOGLE_CLIENT_IDS = [
  process.env.GOOGLE_IOS_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
  process.env.GOOGLE_WEB_CLIENT_ID,
].filter(Boolean) as string[];

const shapeUser = (user: {
  id: string; email: string; role: string; isFirstLogin: boolean;
  firstName: string | null; lastName: string | null; phone: string | null; avatarUrl: string | null;
}) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  isFirstLogin: user.isFirstLogin,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
});

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

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isFirstLogin: user.isFirstLogin,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    },
  };
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
  if (!user.password) throw new Error('This account uses social sign-in. Please continue with Google or Apple.');
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid email or password');

  // Generate JWT — valid for 7 days
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isFirstLogin: user.isFirstLogin,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    },
  };
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

export const googleLogin = async (idToken: string) => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_IDS,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) throw new Error('Invalid Google token');

  const googleId = payload.sub;
  const { email, given_name, family_name, picture } = payload;

  // Only match on googleId — never fall back to matching by email (no silent linking)
  let user = await prisma.user.findUnique({ where: { googleId } });

  let isNewUser = false;

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      throw new Error(
        existingByEmail.authProvider === 'LOCAL'
          ? 'This email is already registered. Please log in with your password.'
          : 'This email is already registered with Apple sign-in. Please continue with Apple.'
      );
    }

    isNewUser = true;
    user = await prisma.user.create({
      data: {
        email,
        googleId,
        authProvider: 'GOOGLE',
        role: 'GUEST',
        isVerified: true,
        firstName: given_name ?? null,
        lastName: family_name ?? null,
        avatarUrl: picture ?? null,
      },
    });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  return { token, isNewUser, user: shapeUser(user) };
};

export const appleLogin = async (
  identityToken: string,
  fullName?: { firstName?: string | null; lastName?: string | null } | null
) => {
  const appleData = await appleSignin.verifyIdToken(identityToken, {
    audience: process.env.APPLE_CLIENT_ID,
    ignoreExpiration: false,
  });

  const appleId = appleData.sub;
  const email = appleData.email;
  if (!appleId) throw new Error('Invalid Apple token');

  // Only match on appleId — never fall back to matching by email (no silent linking)
  let user = await prisma.user.findUnique({ where: { appleId } });

  let isNewUser = false;

  if (!user) {
    if (!email) throw new Error('Apple did not provide an email for this account');

    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      throw new Error(
        existingByEmail.authProvider === 'LOCAL'
          ? 'This email is already registered. Please log in with your password.'
          : 'This email is already registered with Google sign-in. Please continue with Google.'
      );
    }

    isNewUser = true;
    user = await prisma.user.create({
      data: {
        email,
        appleId,
        authProvider: 'APPLE',
        role: 'GUEST',
        isVerified: true,
        // Apple only ever sends the name on this very first authorization — must capture it now
        firstName: fullName?.firstName ?? null,
        lastName: fullName?.lastName ?? null,
      },
    });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  return { token, isNewUser, user: shapeUser(user) };
};