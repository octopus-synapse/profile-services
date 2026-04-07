export type PrismaDelegate<T> = {
  findFirst: (args?: unknown) => Promise<T | null>;
  findMany: (args?: unknown) => Promise<T[]>;
  findUnique: (args?: unknown) => Promise<T | null>;
  count: (args?: unknown) => Promise<number>;
  create: (args: unknown) => Promise<T>;
  update: (args: unknown) => Promise<T>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
  deleteMany: (args: unknown) => Promise<{ count: number }>;
  aggregate: (args: unknown) => Promise<unknown>;
};
