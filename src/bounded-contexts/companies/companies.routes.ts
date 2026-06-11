/**
 * Route descriptors for the companies BC — a read-only brand search
 * (logo.dev proxy) that powers the Add Experience company autocomplete.
 * The chosen suggestion's `name` is what the client stores in the
 * free-form `company` field; `domain` goes to the hidden `companyDomain`.
 */

import type { Route } from '@/shared-kernel/http/route.types';
import type { CompaniesBundle } from './companies.bundle';
import {
  CompaniesSearchQuerySchema,
  CompaniesSearchResponseSchema,
} from './companies.routes.schemas';

export const companiesRoutes: ReadonlyArray<Route<CompaniesBundle>> = [
  {
    method: 'GET',
    path: '/v1/companies/search',
    auth: { kind: 'jwt' },
    query: CompaniesSearchQuerySchema,
    response: CompaniesSearchResponseSchema,
    openapi: {
      summary: 'Search company name/domain suggestions for the experience autocomplete',
      tags: ['companies'],
      description: 'Company brand search',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const query = CompaniesSearchQuerySchema.parse(ctx.query);
      const companies = await bundle.searchCompanies.execute(query);
      return { companies };
    },
  },
];
