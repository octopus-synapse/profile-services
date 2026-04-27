/**
 * Static catalog of legacy `User.role` values exposed for SDK
 * generation. Permission-based authorization is the source of truth
 * for actual access control; this list is a frontend convenience.
 */

export type UserRole = 'USER' | 'ADMIN';

export class ListUserRolesUseCase {
  // eslint-disable-next-line @typescript-eslint/require-await -- async for parity with sibling enum use cases.
  async execute(): Promise<readonly UserRole[]> {
    return ['USER', 'ADMIN'];
  }
}
