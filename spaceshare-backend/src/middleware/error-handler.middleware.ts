// c:\Users\user\Projects\Curr Proj\SPACE_SHARE-ADM\spaceshare-mobile\spaceshare-backend\src\middleware\error-handler.middleware.ts
import { Request, Response, NextFunction } from "express";
import { CustomError } from "../errors";
import { Prisma } from "@prisma/client";

/**
 * Global Express error handler.
 *
 * RULES (no exceptions):
 *  - If the error was intentionally thrown by us (extends CustomError) →
 *    expose the message. We wrote the message, it's safe for client eyes.
 *  - Otherwise (Prisma DB errors, network errors, runtime errors, ...) →
 *    NEVER send the raw error.message to the frontend. Log it server-side,
 *    return a generic human-friendly message. No internal stacktraces, no
 *    hostnames, no file paths, no SQL/driver details leak.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction   // 4-parameter signature required for Express to treat as error handler
) => {
  // --- Case A: Intentional, safe, app-level error ------------------------
  if (err instanceof CustomError) {
    const statusCode = (err as any).statusCode || 400;
    return res.status(statusCode).json({ message: err.message });
  }

  // --- Case B: Prisma-specific known errors we can still show safely ------
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (e.g. duplicate email on create)
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[])?.join(", ") ?? "record";
      return res
        .status(400)
        .json({ message: `A record with this ${target} already exists.` });
    }
    // Record not found (if someone uses .findUniqueOrThrow)
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Record not found." });
    }
    // Fall-through for other known Prisma codes → generic 500 below (not safe to leak)
  }

  // Prisma DB connection failed, Neon is down, etc. → DO NOT leak hostnames
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientValidationError
  ) {
    // Log full details for backend engineers (Server-visible only):
    console.error("[PRISMA ERROR]:", err.name, err.message);
    return res
      .status(503)
      .json({ message: "We're experiencing server issues. Please try again shortly." });
  }

  // --- Case C: Totally unexpected. Log, return generic. -------------------
  // Never send raw err.message. It could contain anything from environment
  // variables to filesystem paths depending on what threw.
  console.error("[UNHANDLED ERROR]:", {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: (req as any).userId,
  });

  return res.status(500).json({ message: "Something went wrong on our end." });
};