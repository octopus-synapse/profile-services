/** One company suggestion: display name + the domain that keys its logo
 *  (`https://img.logo.dev/{domain}` on the client). */
export interface CompanySuggestion {
  readonly name: string;
  readonly domain: string;
}

/**
 * Brand-level company search behind the `/v1/companies/search` autocomplete.
 * The concrete adapter owns the upstream provider (logo.dev Brand Search
 * today) and may throw on provider failure — the application layer decides
 * how a failure degrades.
 */
export abstract class CompanySearchPort {
  abstract search(query: string, limit: number): Promise<CompanySuggestion[]>;
}
