import { afterEach, describe, expect, it } from 'bun:test';
import { JSearchUpstreamException } from '../../../domain/exceptions/external-jobs.exceptions';
import type { ExternalJobSearchParams } from '../../../domain/ports/external-job-search.port';
import fixture from '../../../testing/fixtures/jsearch-search-response.fixture.json';
import { JSearchJobSearchAdapter } from './jsearch-job-search.adapter';

const realFetch = globalThis.fetch;

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(String(url), init))) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

const noopLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  verbose: () => {},
  // biome-ignore lint/suspicious/noExplicitAny: minimal LoggerPort stub
} as any;

const PARAMS: ExternalJobSearchParams = {
  query: 'desenvolvedor',
  country: 'br',
  datePosted: 'today',
  employmentTypes: ['FULLTIME', 'CONTRACTOR', 'INTERN'],
  numPages: 2,
};

function makeAdapter() {
  return new JSearchJobSearchAdapter('test-key', 'jsearch.p.rapidapi.com', noopLogger);
}

describe('JSearchJobSearchAdapter', () => {
  it('builds the search URL with all params and RapidAPI headers', async () => {
    const seen: { url?: string; key?: string | null; host?: string | null } = {};
    stubFetch((url, init) => {
      seen.url = url;
      const headers = new Headers(init?.headers);
      seen.key = headers.get('x-rapidapi-key');
      seen.host = headers.get('x-rapidapi-host');
      return Response.json({ data: [] });
    });

    await makeAdapter().search(PARAMS);

    const url = new URL(seen.url ?? '');
    expect(url.origin).toBe('https://jsearch.p.rapidapi.com');
    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('query')).toBe('desenvolvedor');
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('num_pages')).toBe('2');
    expect(url.searchParams.get('country')).toBe('br');
    expect(url.searchParams.get('date_posted')).toBe('today');
    expect(url.searchParams.get('employment_types')).toBe('FULLTIME,CONTRACTOR,INTERN');
    expect(seen.key).toBe('test-key');
    expect(seen.host).toBe('jsearch.p.rapidapi.com');
  });

  it('maps the recorded fixture, skipping rows without usable id/title', async () => {
    stubFetch(() => Response.json(fixture));

    const result = await makeAdapter().search(PARAMS);

    // Fixture has 6 entries; the last one has a numeric job_id + null
    // title and must be skipped.
    expect(result.postings.length).toBe(5);
    for (const posting of result.postings) {
      expect(typeof posting.externalId).toBe('string');
      expect(posting.title.length).toBeGreaterThan(0);
      expect(posting.company.length).toBeGreaterThan(0);
      expect(posting.applyUrl.startsWith('http')).toBe(true);
      // raw must not duplicate the description column
      expect('job_description' in posting.raw).toBe(false);
    }
  });

  it('maps employment type from the canonical array, not the localized field', async () => {
    stubFetch(() =>
      Response.json({
        data: [
          {
            job_id: 'a',
            job_title: 'Dev',
            employer_name: 'X',
            job_apply_link: 'https://x.com',
            job_employment_type: 'Tempo integral',
            job_employment_types: ['INTERN'],
          },
        ],
      }),
    );

    const { postings } = await makeAdapter().search(PARAMS);
    expect(postings[0]?.employmentType).toBe('INTERNSHIP');
  });

  it('parses postedAt when the UTC datetime exists and nulls it otherwise', async () => {
    stubFetch(() => Response.json(fixture));

    const { postings } = await makeAdapter().search(PARAMS);
    const withDate = postings.filter((p) => p.postedAt !== null);
    expect(withDate.length).toBe(1);
    expect(withDate[0]?.postedAt?.toISOString()).toBe('2026-06-10T14:30:00.000Z');
  });

  it('derives creditsConsumed from result count (1 per page of 10, min 1)', async () => {
    const entry = {
      job_id: 'a',
      job_title: 'Dev',
      employer_name: 'X',
      job_apply_link: 'https://x.com',
    };
    stubFetch(() =>
      Response.json({
        data: Array.from({ length: 14 }, (_, i) => ({ ...entry, job_id: `a${i}` })),
      }),
    );
    expect((await makeAdapter().search(PARAMS)).creditsConsumed).toBe(2);

    stubFetch(() => Response.json({ data: [] }));
    expect((await makeAdapter().search(PARAMS)).creditsConsumed).toBe(1);
  });

  it('throws JSearchUpstreamException on non-OK status', async () => {
    stubFetch(() => new Response('rate limited', { status: 429 }));
    expect(makeAdapter().search(PARAMS)).rejects.toThrow(JSearchUpstreamException);
  });

  it('throws JSearchUpstreamException(timeout) when fetch rejects', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('aborted'))) as unknown as typeof fetch;
    expect(makeAdapter().search(PARAMS)).rejects.toThrow(JSearchUpstreamException);
  });

  it('returns empty postings (1 credit) on a malformed body', async () => {
    stubFetch(() => Response.json({ totally: 'unexpected' }));
    const result = await makeAdapter().search(PARAMS);
    expect(result.postings).toEqual([]);
    expect(result.creditsConsumed).toBe(1);
  });
});
