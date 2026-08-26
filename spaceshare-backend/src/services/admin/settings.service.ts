import prisma from "../../utils/prisma";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthenticatedError } from "../../errors";
import { LogActivity, Role } from "@prisma/client";
import { createAuditLog } from "./audit-log.service";


async function validateActor(actorId: string) {
  if (!actorId) throw new UnauthenticatedError("Authentication required");
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, role: true, status: true },
  });
  if (!actor) throw new NotFoundError("Authenticated user not found");
  if (actor.status !== "ACTIVE") throw new ForbiddenError("Account is not active");
  if (actor.role !== Role.ADMIN && actor.role !== Role.SUPER_ADMIN) {
    throw new ForbiddenError("Admin authorization required");
  }
  return actor;
}

const fullName = (u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string => {
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return n.length > 0 ? n : u.email;
};

/** Split a single fullName string into firstName / lastName. */
function splitFullName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  if (trimmed.length === 0) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
  return { firstName, lastName };
}


export async function getAdminProfile(actorId: string) {
  const actor = await validateActor(actorId);
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });
  if (!user) throw new NotFoundError("User not found");
  return {
    fullName: fullName({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    }),
    email: user.email,
  };
}

export async function updateAdminProfile(
  actorId: string,
  input: { fullName: string }
) {
  const actor = await validateActor(actorId);
  if (!input?.fullName || input.fullName.trim().length < 3) {
    throw new BadRequestError("Full name must be at least 3 characters");
  }
  if (input.fullName.trim().length > 120) {
    throw new BadRequestError("Full name must be at most 120 characters");
  }
  const { firstName, lastName } = splitFullName(input.fullName.trim());

  await prisma.user.update({
    where: { id: actor.id },
    data: { firstName, lastName: lastName || null },
  });
  return { message: "Profile updated successfully" };
}


async function ensurePlatformSettings() {
  const first = await prisma.platformSettings.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (first) return first;
  return prisma.platformSettings.create({
    data: { hostCommission: 15, guestProcessingFee: 5 },
  });
}

export async function getPlatformCommission() {
  const row = await ensurePlatformSettings();
  return {
    hostCommissionPercent: row.hostCommission,
    guestProcessingFeePercent: row.guestProcessingFee,
  };
}


export async function getSettingsBundle(actorId: string) {
  const actor = await validateActor(actorId);

  const [userRow, settingsRow] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    }),
    prisma.platformSettings.findFirst({
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!userRow) throw new NotFoundError("User not found");

  // Seed PlatformSettings on demand if the DB has never been seeded.
  const settings =
    settingsRow ??
    (await prisma.platformSettings.create({
      data: { hostCommission: 15, guestProcessingFee: 5 },
    }));

  return {
    profile: {
      fullName: fullName({
        firstName: userRow.firstName,
        lastName: userRow.lastName,
        email: userRow.email,
      }),
      email: userRow.email,
    },
    commission: {
      hostCommissionPercent: settings.hostCommission,
      guestProcessingFeePercent: settings.guestProcessingFee,
    },
  };
}

export async function updatePlatformCommission(
  actorId: string,
  input: {
    hostCommissionPercent: number;
    guestProcessingFeePercent: number;
  }
) {
  const actor = await validateActor(actorId);
  if (actor.role !== Role.SUPER_ADMIN) throw new BadRequestError("Only a super admin can perform this action")
  const host = Number(input?.hostCommissionPercent);
  const guest = Number(input?.guestProcessingFeePercent);
  
  if (Number.isNaN(host) || host < 0 || host > 100) {
    throw new BadRequestError("Host commission must be between 0 and 100 percent");
  }
  if (Number.isNaN(guest) || guest < 0 || guest > 100) {
    throw new BadRequestError(
      "Guest processing fee must be between 0 and 100 percent"
    );
  }

  const singleton = await ensurePlatformSettings();

  await prisma.platformSettings.update({
    where: { id: singleton.id },
    data: {
      hostCommission: host,
      guestProcessingFee: guest,
    },
  });
  // audit log
  createAuditLog({
    actorId,
    action: LogActivity.UPDATED_COMMISSION,
    description: "Updated platform commission rate",
  })

  return { message: "Commission settings updated successfully" };
}