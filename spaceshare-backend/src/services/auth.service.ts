import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import prisma from '../utils/prisma';
import { sendVerificationEmail, sendVerificationEmailLink } from './email.service';
import crypto from 'crypto';
import { broadcastToAdmins } from './admin/notification.service';
import { BadRequestError } from '../errors';


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

  // Broadcast admin inbox: new user signed up
  broadcastToAdmins({
    type: 'NEW_USER_REGISTERED',
    title: `New ${role.toLowerCase()} user registered`,
    body: `${email} just created a ${role.toLowerCase()} account (email pending verification)`,
    referenceId: user.id,
  });  

  // Switched to using crypto.randomInt for a more secure random number generator
  const code = crypto.randomInt(100000, 1000000).toString();
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
  if (!user) throw new BadRequestError('User not found');

  const verificationCode = await prisma.verificationCode.findUnique({
    where: { userId: user.id },
  });

  if (!verificationCode) throw new BadRequestError('No verification code found');
  if (verificationCode.code !== code) throw new BadRequestError('Invalid code');
  if (new Date() > verificationCode.expiresAt) throw new BadRequestError('Code expired');

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
  if (!user) throw new BadRequestError('User not found');
  if (user.isVerified) throw new BadRequestError('Email already verified');

  // Switched to using crypto.randomInt for a more secure random number generator
  const code = crypto.randomInt(100000, 1000000).toString();
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

export const forgotPassword = async (email: string, 
  options?: {transport?: 'mobile_otp' | 'web_link'}) => {
  // default transport to mobile_otp
  const { transport = 'mobile_otp' } = options ?? {};
  
  const user = await prisma.user.findUnique({ where: { email } });
  // Don't reveal if email exists or not — security best practice
  if (!user) return { message: 'If this email exists, a reset code has been sent.' };

  // Switched to using crypto.randomInt for a more secure random number generator
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  if (transport === 'web_link'){
    const token = crypto.randomBytes(32).toString('hex');
    // Reuse the same verification code table for reset codes
    await prisma.verificationCode.upsert({
      where: { userId: user.id },
      update: { code: token, expiresAt },
      create: { code: token, expiresAt, userId: user.id },
    });
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    await sendVerificationEmailLink(email, link);
    return {
      success: true,
      message: `If this email exists, a reset code has been sent.`
    };
  }

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
  if (!user) throw new BadRequestError('Invalid request');
  
  const verificationCode = await prisma.verificationCode.findUnique({
    where: { userId: user.id },
  });
  
  if (!verificationCode) throw new BadRequestError('No reset code found');
  if (verificationCode.code !== code) throw new BadRequestError('Invalid verification code');
  if (new Date() > verificationCode.expiresAt) throw new BadRequestError('Verification Code expired');

  return { message: 'Code verified', userId: user.id };
};

export const resetPassword = async (email: string, code: string, newPassword: string,  
  options?: {transport?: 'mobile_otp' | 'web_link'}) => {
  // default transport to mobile_otp
  const { transport = 'mobile_otp' } = options ?? {};

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new BadRequestError('Invalid request');

  const verificationCode = await prisma.verificationCode.findUnique({
    where: { userId: user.id },
  });

  if (!verificationCode) throw new BadRequestError('No reset code found');
  if (verificationCode.code !== code) throw new BadRequestError('Invalid or expired verification code');
  if (new Date() > verificationCode.expiresAt) throw new BadRequestError('Verification Code expired');

  if (transport === 'web_link'){
    const isReused = await isPasswordReused(user.id, newPassword);
    if (isReused) throw new BadRequestError('You cannot reuse your previously used password.');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  if (transport === 'web_link'){
    await prisma.$transaction([
      prisma.passwordHistory.create({
        data: {
          userId: user.id,
          hash: user.password!,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
        },
      }),
      prisma.verificationCode.delete({
        where: { userId: user.id },
      }),
    ]);
  } else {
    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    // Clean up reset code
    await prisma.verificationCode.delete({ where: { userId: user.id } });    
  }

  return { message: 'Password reset successful' };
};

export const googleLogin = async (idToken: string, role?: 'GUEST' | 'HOST') => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_IDS,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) throw new BadRequestError('Invalid Google token');

  const googleId = payload.sub;
  const { email, given_name, family_name, picture } = payload;

  // Only match on googleId — never fall back to matching by email (no silent linking)
  let user = await prisma.user.findUnique({ where: { googleId } });

  let isNewUser = false;

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      throw new BadRequestError(
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
        role: role ?? 'GUEST',
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
  fullName?: { firstName?: string | null; lastName?: string | null } | null,
  role?: 'GUEST' | 'HOST'
) => {
  const appleData = await appleSignin.verifyIdToken(identityToken, {
    audience: process.env.APPLE_CLIENT_ID,
    ignoreExpiration: false,
  });

  const appleId = appleData.sub;
  const email = appleData.email;
  if (!appleId) throw new BadRequestError('Invalid Apple token');

  // Only match on appleId — never fall back to matching by email (no silent linking)
  let user = await prisma.user.findUnique({ where: { appleId } });

  let isNewUser = false;

  if (!user) {
    if (!email) throw new BadRequestError('Apple did not provide an email for this account');

    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      throw new BadRequestError(
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
        role: role ?? 'GUEST',
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


export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  userId: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password: true,
    },
  });

  if (!user) throw new BadRequestError('Account not found');
  // Google/Apple accounts may not have a local password
  if (!user.password) throw new BadRequestError('This account does not have a password. Please contact an admin to assist you in creating a password');

  // Verify the current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) throw new BadRequestError('Current password is incorrect');

  // Prevent changing to the same password
  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) throw new BadRequestError('New password must be different from your current password');

  // Prevent reuse of previously used passwords
  const isReused = await isPasswordReused(user.id, newPassword);
  if (isReused) throw new BadRequestError('You cannot reuse one of your previously used passwords');

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Save the current password to history before replacing it
  await prisma.$transaction([
    prisma.passwordHistory.create({
      data: {
        userId: user.id,
        hash: user.password,
      },
    }),

    prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    }),
  ]);

  return {
    message: 'Password changed successfully',
  };
};



async function isPasswordReused(userId: string, newPassword: string): Promise<boolean> {
  const oldHashes = await prisma.passwordHistory.findMany({
    where: { userId },
    select: { hash: true },
    // Optional: limit to last 10 passwords / 12 months
    take: 10,
    orderBy: { usedAt: 'desc' },
  });

  // Compare the NEW plaintext against EVERY historical bcrypt hash
  // bcrypt.compare takes ~80ms per hash — fine for 10 records (~800ms total)
  for (const { hash } of oldHashes) {
    const matches = await bcrypt.compare(newPassword, hash);
    if (matches) return true;  // ← was used before, reject it
  }
  return false;
}