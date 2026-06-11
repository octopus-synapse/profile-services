/**
 * Bundle type for the companies BC, in its own module so the routes
 * file can import it without creating a routes ↔ composition cycle.
 */

import type { SearchCompaniesUseCase } from './application/use-cases/search-companies.use-case';

/** The route bundle: the use cases a companies route handler can call. */
export interface CompaniesBundle {
  readonly searchCompanies: SearchCompaniesUseCase;
}
