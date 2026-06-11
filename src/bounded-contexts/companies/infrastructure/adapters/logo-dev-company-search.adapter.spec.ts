import { afterEach, describe, expect, it } from 'bun:test';
import { LogoDevCompanySearchAdapter } from './logo-dev-company-search.adapter';

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
  debug: () => {},
  warn: () => {},
  error: () => {},
  // biome-ignore lint/suspicious/noExplicitAny: minimal LoggerPort stub
} as any;

describe('LogoDevCompanySearchAdapter', () => {
  it('queries logo.dev with the secret key and maps name/domain', async () => {
    const seen: { url?: string; auth?: string | null } = {};
    stubFetch((url, init) => {
      seen.url = url;
      seen.auth = new Headers(init?.headers).get('Authorization');
      return Response.json([
        { name: 'Nubank', domain: 'nubank.com.br', logo_url: 'ignored' },
        { name: 'Nu Pagamentos', domain: 'nu.com.br' },
      ]);
    });
    const adapter = new LogoDevCompanySearchAdapter('sk_test', noopLogger);

    const result = await adapter.search('nubank', 20);

    expect(seen.url).toBe('https://api.logo.dev/search?q=nubank');
    expect(seen.auth).toBe('Bearer sk_test');
    expect(result).toEqual([
      { name: 'Nubank', domain: 'nubank.com.br' },
      { name: 'Nu Pagamentos', domain: 'nu.com.br' },
    ]);
  });

  it('filters malformed entries and clamps to the limit', async () => {
    stubFetch(() =>
      Response.json([
        { name: '', domain: 'empty-name.com' },
        { name: 'No Domain' },
        { name: 42, domain: 'numeric.com' },
        { name: 'A', domain: 'a.com' },
        { name: 'B', domain: 'b.com' },
      ]),
    );
    const adapter = new LogoDevCompanySearchAdapter('sk_test', noopLogger);

    expect(await adapter.search('x', 1)).toEqual([{ name: 'A', domain: 'a.com' }]);
  });

  it('returns empty when the response is not an array', async () => {
    stubFetch(() => Response.json({ error: 'unexpected shape' }));
    const adapter = new LogoDevCompanySearchAdapter('sk_test', noopLogger);

    expect(await adapter.search('x', 20)).toEqual([]);
  });

  it('throws on a non-OK upstream response', async () => {
    stubFetch(() => new Response('rate limited', { status: 429 }));
    const adapter = new LogoDevCompanySearchAdapter('sk_test', noopLogger);

    await expect(adapter.search('x', 20)).rejects.toThrow('logo.dev search responded 429');
  });

  it('throws when the secret key is missing', async () => {
    const adapter = new LogoDevCompanySearchAdapter(undefined, noopLogger);

    await expect(adapter.search('x', 20)).rejects.toThrow('LOGO_DEV_SECRET_KEY');
  });
});
