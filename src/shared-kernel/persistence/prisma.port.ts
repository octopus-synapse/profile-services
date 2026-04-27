/**
 * Adapter-agnostic Prisma surface. Composition.ts files only see this
 * port; Nest's `PrismaService` (which is `@Injectable()` + `OnModuleInit`)
 * extends `PrismaClient` and therefore satisfies it. A future Bun-only
 * bootstrap can swap in a POJO subclass with explicit `init/dispose`.
 *
 * The port deliberately doesn't redeclare the Prisma model surface —
 * it's a structural alias for `PrismaClient` itself, with optional
 * lifecycle hooks that POJO impls populate.
 */

import type { PrismaClient } from '@prisma/client';

export type PrismaPort = PrismaClient & {
  /** Optional: POJO impls call `$connect`/`$disconnect` from these. */
  init?: () => Promise<void>;
  dispose?: () => Promise<void>;
};
