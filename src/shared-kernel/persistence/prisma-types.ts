import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Either the long-lived `PrismaClient` or a transaction client returned
 * by `prisma.$transaction(async (tx) => …)`. Repository methods that
 * may run inside or outside a transaction should accept this type
 * instead of forcing callers to pass the top-level client.
 *
 * Lifted out of bounded-contexts/resumes/core/services/generic-resume-sections/
 * where it was previously duplicated — see Q29 in the duplication audit.
 */
export type PrismaLikeClient = PrismaClient | Prisma.TransactionClient;
