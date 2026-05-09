import type { PrismaClient } from '@prisma/client';
import type { PrismaLikeClient } from './prisma-types';

/**
 * Canonical transaction wrapper for the project.
 *
 * Replaces the mix of inline `prisma.$transaction(async (tx) => {…})`,
 * array-form `$transaction([…])`, and the bespoke `runInTransaction`
 * method in generic-resume-sections.repository.ts (see Q28 in the
 * duplication audit).
 *
 * If the caller already holds a transaction client, the operation runs
 * directly without nesting (Prisma forbids nested $transaction calls).
 *
 * Retry/timeout logic is intentionally not added yet — see Q30. The
 * shape is the natural place to grow when needed.
 */
export async function runInTransaction<T>(
  client: PrismaLikeClient,
  operation: (tx: PrismaLikeClient) => Promise<T>,
): Promise<T> {
  if (isTransactionClient(client)) {
    return operation(client);
  }
  return (client as PrismaClient).$transaction((tx) => operation(tx));
}

function isTransactionClient(client: PrismaLikeClient): boolean {
  return typeof (client as PrismaClient).$transaction !== 'function';
}
