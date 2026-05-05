import { describe, expect, it } from 'bun:test';
import { SafeFetchAdapter } from '../safe-fetch.adapter';
import { SafeFetchBlockedError } from '../safe-fetch.port';

describe('SafeFetchAdapter (P0-013)', () => {
  const fetcher = new SafeFetchAdapter();

  it('rejects non-http(s) protocols', async () => {
    await expect(fetcher.fetch('file:///etc/passwd')).rejects.toBeInstanceOf(SafeFetchBlockedError);
    await expect(fetcher.fetch('ftp://example.com')).rejects.toBeInstanceOf(SafeFetchBlockedError);
    await expect(fetcher.fetch('data:text/plain,hello')).rejects.toBeInstanceOf(
      SafeFetchBlockedError,
    );
  });

  it('rejects literal private IPs', async () => {
    await expect(fetcher.fetch('http://127.0.0.1/')).rejects.toBeInstanceOf(SafeFetchBlockedError);
    await expect(fetcher.fetch('http://10.0.0.1/')).rejects.toBeInstanceOf(SafeFetchBlockedError);
    await expect(fetcher.fetch('http://169.254.169.254/latest/meta-data')).rejects.toBeInstanceOf(
      SafeFetchBlockedError,
    );
  });

  it('rejects malformed URLs', async () => {
    await expect(fetcher.fetch('not-a-url')).rejects.toBeInstanceOf(SafeFetchBlockedError);
  });
});
