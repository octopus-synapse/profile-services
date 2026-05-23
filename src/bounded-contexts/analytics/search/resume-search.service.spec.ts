import { describe, expect, it } from 'bun:test';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeSearchService } from './resume-search.service';

function buildPrismaStub(opts: { rows: unknown[]; total: number }): PrismaService {
  let call = 0;
  return {
    $queryRaw: async () => {
      call += 1;
      return call === 1 ? opts.rows : [{ count: opts.total }];
    },
  } as unknown as PrismaService;
}

describe('ResumeSearchService.search (P1 #39)', () => {
  it('clamps oversized limit so totalPages buckets by MAX_PAGE_SIZE not the raw input', async () => {
    const prisma = buildPrismaStub({ rows: [], total: 500 });
    const svc = new ResumeSearchService(prisma);

    const result = await svc.search({ query: 'react', limit: 10000 } as unknown as Parameters<
      ResumeSearchService['search']
    >[0]);

    expect(result.limit).toBe(100);
    expect(result.totalPages).toBe(5);
  });

  it('returns at least one page even on zero hits', async () => {
    const prisma = buildPrismaStub({ rows: [], total: 0 });
    const svc = new ResumeSearchService(prisma);

    const result = await svc.search({ query: 'react', limit: 20 } as unknown as Parameters<
      ResumeSearchService['search']
    >[0]);

    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
  });
});
