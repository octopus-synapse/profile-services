import { CompanySearchPort, type CompanySuggestion } from '../domain/ports/company-search.port';

/** Fake `CompanySearchPort`: serves seeded suggestions filtered by substring,
 *  records calls, and can be armed to throw (provider-outage paths). */
export class InMemoryCompanySearch extends CompanySearchPort {
  readonly suggestions: CompanySuggestion[] = [];
  readonly calls: Array<{ query: string; limit: number }> = [];
  failWith: Error | null = null;

  seed(...suggestions: CompanySuggestion[]): void {
    this.suggestions.push(...suggestions);
  }

  async search(query: string, limit: number): Promise<CompanySuggestion[]> {
    this.calls.push({ query, limit });
    if (this.failWith) throw this.failWith;
    return this.suggestions
      .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
  }
}
