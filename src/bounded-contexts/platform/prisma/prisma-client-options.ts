import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

type PrismaClientOptions = NonNullable<ConstructorParameters<typeof PrismaClient>[0]>;

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to initialize PrismaClient.');
  }

  return databaseUrl;
}

export function createPrismaClientOptions(
  overrides: PrismaClientOptions = {},
): PrismaClientOptions {
  return {
    adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
    ...overrides,
  };
}
