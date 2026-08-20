import crypto from 'crypto';
import prisma from '../../utils/prisma';
import { sendAdminInvitationEmail } from '../email.service';
import bcrypt from 'bcrypt';


export async function inviteAdminUser(
  email: string,
  firstName: string,
  lastName: string,
  invitedById: string
) {
  const normalizedEmail = email.trim().toLowerCase();

  // Make sure the inviter actually exists and is a SUPER_ADMIN.
  const inviter = await prisma.user.findUnique({
    where: { id: invitedById },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!inviter) throw new Error('Inviting user not found');
  if (inviter.role !== 'SUPER_ADMIN') throw new Error('Only a super admin can invite an admin');
  if (inviter.status !== 'ACTIVE') throw new Error('Your account is not active');

  // Check whether this email already belongs to a user.
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      role: true,
    },
  });

  if (existingUser && existingUser.role === 'ADMIN') throw new Error('This user is already an admin');

  // Don't allow multiple pending invitations for the same email.
  const existingInvitation = await prisma.adminInvitation.findFirst({
    where: {
      email: normalizedEmail,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (existingInvitation) throw new Error('An active invitation already exists for this email');

  // Generate a token that will be sent to the admin.
  const token = crypto.randomBytes(32).toString('hex');

  // Only store the hash in the database.
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.adminInvitation.create({
    data: {
      email: normalizedEmail,
      tokenHash,
      invitedById,
      firstName,
      lastName,
      expiresAt,
    },
  });

  const invitationLink = `${process.env.ADMIN_FRONTEND_URL}/admin/accept-invitation` + `?token=${encodeURIComponent(token)}` + `&email=${encodeURIComponent(normalizedEmail)}`;

  await sendAdminInvitationEmail(
    normalizedEmail,
    invitationLink
  );

  return {
    message: 'Admin invitation sent successfully',
  };
}

export async function acceptAdminInvitation(
  email: string,
  token: string,
  password: string,
  confirmPassword: string
) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!password || !confirmPassword) {
    throw new Error('Password and confirmation are required');
  }

  if (password !== confirmPassword) {
    throw new Error('Passwords do not match');
  }

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const invitation = await prisma.adminInvitation.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!invitation) throw new Error('Invalid invitation');
  if (invitation.email !== normalizedEmail) throw new Error('Invalid invitation');
  if (invitation.acceptedAt) throw new Error('This invitation has already been accepted');
  if (invitation.revokedAt) throw new Error('This invitation has been revoked');
  if (new Date() > invitation.expiresAt) throw new Error('This invitation has expired');

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      if (existingUser.role === 'ADMIN') throw new Error('This user is already an admin');

      await tx.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          role: 'ADMIN',
          password: hashedPassword,
          status: 'ACTIVE',
          isVerified: true,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          invitedAt: invitation.createdAt,
          invitedBy: invitation.invitedById,
          authProvider: 'LOCAL',
        },
      });
    } else {
      await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          role: 'ADMIN',
          status: 'ACTIVE',
          isVerified: true,
          isFirstLogin: true,
          authProvider: 'LOCAL',
          invitedAt: invitation.createdAt,
          invitedBy: invitation.invitedById,
        },
      });
    }

    await tx.adminInvitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        acceptedAt: new Date(),
      },
    });
  });

  return {
    message: 'Admin invitation accepted successfully',
  };
}