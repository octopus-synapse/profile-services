/**
 * Outbound port for resolving the role names a given user holds.
 * Decouples the app layer from Prisma so `FeatureFlagService` stays
 * framework-free. The Prisma adapter lives at
 * `infrastructure/repositories/prisma-role-lookup.adapter.ts` and is
 * instantiated by the BC composition.
 */

export interface RoleLookupPort {
  /** Active role names for `userId` (excludes expired role assignments). */
  rolesFor(userId: string): Promise<string[]>;
}
