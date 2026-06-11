/**
 * Wiring for the companies BC. The brand search is backed by the logo.dev
 * Brand Search API (`LOGO_DEV_SECRET_KEY`); when the key is absent the
 * adapter throws and the use case degrades every search to an empty list,
 * so the feature is safely inert in environments without the key.
 * The bootstrap mounts `{ bundle, routes }` like any other BC.
 */

import type { CachePort } from '@/shared-kernel/cache';
import type { ConfigPort } from '@/shared-kernel/config/config.port';
import type { LoggerPort } from '@/shared-kernel/logger';
import { SearchCompaniesUseCase } from './application/use-cases/search-companies.use-case';
import type { CompaniesBundle } from './companies.bundle';
import { companiesRoutes } from './companies.routes';

export type { CompaniesBundle } from './companies.bundle';

import { LogoDevCompanySearchAdapter } from './infrastructure/adapters/logo-dev-company-search.adapter';

export function buildCompaniesComposition(
  cache: CachePort,
  config: ConfigPort,
  logger: LoggerPort,
): { useCases: CompaniesBundle; routes: typeof companiesRoutes } {
  const secretKey = config.env.LOGO_DEV_SECRET_KEY;
  if (!secretKey) {
    logger.warn(
      'LOGO_DEV_SECRET_KEY not set — company search will return empty results',
      'CompaniesComposition',
    );
  }
  const search = new LogoDevCompanySearchAdapter(secretKey, logger);

  const useCases: CompaniesBundle = {
    searchCompanies: new SearchCompaniesUseCase(search, cache, logger),
  };
  return { useCases, routes: companiesRoutes };
}
