import { beforeEach, describe, expect, it } from 'bun:test';
import type { AdminCollaborationView } from '../../../domain/ports/admin-collaborations.repository.port';
import { InMemoryAdminCollaborationsRepository } from '../../../testing';
import { ListCollaborationsUseCase } from './list-collaborations.use-case';

const collab = (id: string): AdminCollaborationView => ({
  id,
  resumeId: `r-${id}`,
  userId: `u-${id}`,
  role: 'EDITOR',
  invitedBy: 'admin-1',
  invitedAt: new Date('2026-04-25T10:00:00.000Z'),
  joinedAt: null,
  user: { id: `u-${id}`, name: null, email: 'x@y.com' },
  resume: { id: `r-${id}`, title: 'Resume' },
});

describe('ListCollaborationsUseCase', () => {
  let repo: InMemoryAdminCollaborationsRepository;
  let useCase: ListCollaborationsUseCase;

  beforeEach(() => {
    repo = new InMemoryAdminCollaborationsRepository();
    useCase = new ListCollaborationsUseCase(repo);
  });

  it('paginates seeded collaboration rows', async () => {
    repo.seedRows([collab('1'), collab('2'), collab('3'), collab('4')]);

    const result = await useCase.execute({ page: 2, pageSize: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.id).toBe('3');
    expect(result.total).toBe(4);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
  });
});
