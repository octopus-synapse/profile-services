import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMeDashboardRepository } from '../../../testing';
import { GetUserMenuUseCase } from './get-user-menu.use-case';

describe('GetUserMenuUseCase', () => {
  let repo: InMemoryMeDashboardRepository;
  let useCase: GetUserMenuUseCase;

  beforeEach(() => {
    repo = new InMemoryMeDashboardRepository();
    useCase = new GetUserMenuUseCase(repo, stubLogger);
  });

  it('returns the public navigation tree for an unprivileged user', async () => {
    repo.setGrants('u-1', []);

    const menu = await useCase.execute('u-1');
    const ids = menu.map((n) => n.id);

    expect(ids).toContain('dashboard');
    expect(ids).toContain('jobs');
    expect(ids).not.toContain('admin');
  });

  it('exposes the admin entry when the viewer holds admin:full_access', async () => {
    repo.setGrants('admin-1', ['admin:full_access']);

    const menu = await useCase.execute('admin-1');

    expect(menu.map((n) => n.id)).toContain('admin');
  });
});
