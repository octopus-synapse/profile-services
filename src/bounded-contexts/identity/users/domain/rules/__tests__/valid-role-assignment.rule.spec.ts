import { describe, expect, it } from 'bun:test';
import { InvalidUserRoleException } from '../../exceptions/users.exceptions';
import { ValidRoleAssignmentRule } from '../valid-role-assignment.rule';

describe('ValidRoleAssignmentRule', () => {
  const rule = new ValidRoleAssignmentRule();

  it('accepts the standard user role', () => {
    expect(() => rule.ensure(['role_user'])).not.toThrow();
  });

  it('accepts the admin role', () => {
    expect(() => rule.ensure(['role_admin'])).not.toThrow();
  });

  it('accepts a combination of recognised roles', () => {
    expect(() => rule.ensure(['role_user', 'role_admin'])).not.toThrow();
  });

  it('throws InvalidUserRoleException for an unknown role id', () => {
    expect(() => rule.ensure(['role_user', 'role_ghost'])).toThrow(InvalidUserRoleException);
  });

  it('accepts an empty role list (caller may want to remove every role)', () => {
    expect(() => rule.ensure([])).not.toThrow();
  });
});
