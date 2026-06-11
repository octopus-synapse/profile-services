/**
 * `CompanySearchPort` impl over the logo.dev Brand Search API
 * (https://docs.logo.dev/brand-search/introduction). Uses the global
 * `fetch` like the OAuth adapter — the URL is a fixed trusted host, so
 * `SafeFetchPort` (user-supplied URLs) doesn't apply.
 *
 * Throws on missing key / non-OK / timeout; `SearchCompaniesUseCase`
 * owns the degrade-to-empty policy.
 */

import { z } from 'zod';
import type { LoggerPort } from '@/shared-kernel';
import { CompanySearchPort, type CompanySuggestion } from '../../domain/ports/company-search.port';

const CTX = 'LogoDevCompanySearchAdapter';
const SEARCH_URL = 'https://api.logo.dev/search';
// Autocomplete keystroke budget: past this the user already moved on, and
// the use-case turns the timeout into an empty result anyway.
const FETCH_TIMEOUT_MS = 5_000;

// Tolerate unknown upstream shapes: parse loosely, then keep only entries
// with usable name + domain strings.
const ResultsSchema = z.array(z.object({ name: z.unknown(), domain: z.unknown() }).passthrough());

export class LogoDevCompanySearchAdapter extends CompanySearchPort {
  constructor(
    private readonly secretKey: string | undefined,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async search(query: string, limit: number): Promise<CompanySuggestion[]> {
    if (!this.secretKey) throw new Error('LOGO_DEV_SECRET_KEY is not configured');
    const response = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${this.secretKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      this.logger.warn(`logo.dev search responded ${response.status}`, CTX);
      throw new Error(`logo.dev search responded ${response.status}`);
    }

    const parsed = ResultsSchema.safeParse(await response.json());
    if (!parsed.success) return [];
    const companies: CompanySuggestion[] = [];
    for (const entry of parsed.data) {
      if (typeof entry.name !== 'string' || typeof entry.domain !== 'string') continue;
      const name = entry.name.trim();
      const domain = entry.domain.trim();
      if (!name || !domain) continue;
      companies.push({ name, domain });
      if (companies.length >= limit) break;
    }
    return companies;
  }
}
