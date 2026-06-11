import { CACHE_PRESETS, type CachePort } from '@/shared-kernel/cache';
import type { LoggerPort } from '@/shared-kernel/logger';
import type { CompaniesSearchQuery } from '../../companies.routes.schemas';
import type { CompanySearchPort, CompanySuggestion } from '../../domain/ports/company-search.port';

const DEFAULT_LIMIT = 20;

/**
 * Search company suggestions for the Add Experience autocomplete. Results
 * are cached per normalized query (brand catalogs barely change, and the
 * upstream quota is metered), and any provider failure degrades to an empty
 * list — the picker's "use typed" affordance keeps the user unblocked.
 */
export class SearchCompaniesUseCase {
  constructor(
    private readonly search: CompanySearchPort,
    private readonly cache: CachePort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(query: CompaniesSearchQuery): Promise<CompanySuggestion[]> {
    const normalized = query.q.trim().toLowerCase().replace(/\s+/g, ' ');
    const limit = query.limit ?? DEFAULT_LIMIT;
    const key = `companies:search:${normalized}:${limit}`;
    try {
      // The swallow wraps `getOrSet` (which only writes on success) so a
      // provider outage is never cached for the catalog TTL.
      return await this.cache.getOrSet(
        key,
        () => this.search.search(normalized, limit),
        CACHE_PRESETS.CATALOG,
      );
    } catch (error) {
      this.logger.error('company search provider failed', {
        context: 'SearchCompaniesUseCase',
        stack: error instanceof Error ? error.stack : undefined,
        query: normalized,
      });
      return [];
    }
  }
}
