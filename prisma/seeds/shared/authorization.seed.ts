/**
 * Roles / permissions seeder — lives in the bounded context, re-exported here so
 * the shared composition root has one consistent import surface alongside the
 * other shared catalogs.
 */
export { seedAuthorization } from '../../../src/bounded-contexts/identity/authorization/seeds/seed.runner';
