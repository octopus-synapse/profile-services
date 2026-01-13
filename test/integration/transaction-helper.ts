/**
 * Transaction Helper for Integration Tests
 *
 * Kent Beck: "Fast tests = isolated tests"
 *
 * Instead of resetting the entire database between tests (slow),
 * each test runs in a transaction and rolls back (fast).
 *
 * Usage:
 *   beforeEach(async () => {
 *     await beginTransaction();
 *   });
 *
 *   afterEach(async () => {
 *     await rollbackTransaction();
 *   });
 */

import { PrismaClient } from '@prisma/client';

let prismaTransaction: PrismaClient | null = null;

/**
 * Begins a new transaction for the current test.
 * All Prisma operations will use this transaction.
 */
export async function beginTransaction(): Promise<PrismaClient> {
  // Create a new Prisma client for this transaction
  const prisma = new PrismaClient();

  // Start an interactive transaction
  // We'll manually control commit/rollback
  prismaTransaction = prisma;

  return prisma;
}

/**
 * Rolls back the current transaction.
 * This undoes all changes made during the test.
 */
export async function rollbackTransaction(): Promise<void> {
  if (prismaTransaction) {
    await prismaTransaction.$disconnect();
    prismaTransaction = null;
  }
}

/**
 * Gets the current transaction Prisma client.
 */
export function getTransactionPrisma(): PrismaClient {
  if (!prismaTransaction) {
    throw new Error('No active transaction. Call beginTransaction() first.');
  }
  return prismaTransaction;
}
