import { describe, expect, it } from 'bun:test';
import { ListUserRolesUseCase } from './list-user-roles.use-case';

describe('ListUserRolesUseCase', () => {
  it('returns the supported user roles', async () => {
    const result = await new ListUserRolesUseCase().execute();
    expect(result).toEqual(['USER', 'ADMIN']);
  });
});
