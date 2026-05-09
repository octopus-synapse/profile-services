import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  ExternalHandleInvalidException,
  IntegrationAuthFailedException,
  IntegrationRateLimitedException,
} from '../../../../domain/exceptions';
import { OctokitGitHubApiAdapter } from './octokit-github-api.adapter';

const stubConfig = {
  get: <T = string>(_key: string): T | undefined => undefined,
};

function buildAdapterWithFetch(impl: () => Promise<Response>) {
  const original = globalThis.fetch;
  globalThis.fetch = impl as unknown as typeof fetch;
  const adapter = new OctokitGitHubApiAdapter(stubConfig, stubLogger);
  return {
    adapter,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

describe('OctokitGitHubApiAdapter', () => {
  it('rejects malformed usernames before issuing the HTTP call', async () => {
    const { adapter, restore } = buildAdapterWithFetch(async () => new Response('{}'));
    try {
      await expect(adapter.getUserProfile('a__b')).rejects.toBeInstanceOf(
        ExternalHandleInvalidException,
      );
      await expect(adapter.getUserProfile('-leading-hyphen')).rejects.toBeInstanceOf(
        ExternalHandleInvalidException,
      );
    } finally {
      restore();
    }
  });

  it('maps HTTP 401 to IntegrationAuthFailedException', async () => {
    const { adapter, restore } = buildAdapterWithFetch(
      async () => new Response('{}', { status: 401 }),
    );
    try {
      await expect(adapter.getUserProfile('octocat')).rejects.toBeInstanceOf(
        IntegrationAuthFailedException,
      );
    } finally {
      restore();
    }
  });

  it('maps HTTP 429 to IntegrationRateLimitedException with retry-after seconds', async () => {
    const { adapter, restore } = buildAdapterWithFetch(
      async () =>
        new Response('{}', {
          status: 429,
          headers: { 'retry-after': '42' },
        }),
    );
    try {
      await expect(adapter.getUserProfile('octocat')).rejects.toBeInstanceOf(
        IntegrationRateLimitedException,
      );
    } finally {
      restore();
    }
  });

  it('maps HTTP 403 with x-ratelimit-remaining=0 to IntegrationRateLimitedException', async () => {
    const { adapter, restore } = buildAdapterWithFetch(
      async () =>
        new Response('{}', {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
          },
        }),
    );
    try {
      await expect(adapter.getUserProfile('octocat')).rejects.toBeInstanceOf(
        IntegrationRateLimitedException,
      );
    } finally {
      restore();
    }
  });
});
