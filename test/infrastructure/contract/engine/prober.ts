import type { HttpMethod } from '@/shared-kernel/http/route';

export interface ProbeOptions {
  readonly method: HttpMethod;
  readonly url: string;
  readonly token?: string;
  readonly body?: unknown;
}

export interface ProbeOutcome {
  readonly status: number;
  readonly body: unknown;
  readonly error?: string;
}

export async function probe(options: ProbeOptions): Promise<ProbeOutcome> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.token) headers.Cookie = `access_token=${options.token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    const res = await fetch(options.url, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();
    if (!text) return { status: res.status, body: null };

    try {
      return { status: res.status, body: JSON.parse(text) };
    } catch {
      return {
        status: res.status,
        body: null,
        error: `non-JSON body (${text.slice(0, 80)})`,
      };
    }
  } catch (err) {
    return {
      status: 0,
      body: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
