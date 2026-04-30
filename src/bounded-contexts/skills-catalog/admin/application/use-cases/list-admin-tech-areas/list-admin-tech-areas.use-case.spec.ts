import { describe, expect, it } from 'bun:test';
import { InMemoryAdminTechAreasRepository } from '../../../testing/in-memory-admin-tech-areas.repository';
import { ListAdminTechAreasUseCase } from './list-admin-tech-areas.use-case';

describe('ListAdminTechAreasUseCase', () => {
  it('returns the paginated list from the repository', async () => {
    const repo = new InMemoryAdminTechAreasRepository();
    const result = await new ListAdminTechAreasUseCase(repo).execute({ page: 1, pageSize: 20 });
    expect(result.items).toEqual([]);
    expect(result.page).toBe(1);
  });
});
