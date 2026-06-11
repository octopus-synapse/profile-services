/**
 * Bundle type for the roles BC, in its own module so the routes file
 * can import it without creating a routes ↔ composition cycle.
 */

import type { SearchRolesUseCase } from './application/use-cases/search-roles.use-case';

/** The route bundle: the use cases a roles route handler can call. */
export interface RolesBundle {
  readonly searchRoles: SearchRolesUseCase;
}
