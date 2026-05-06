import { isValidRoleId } from '@/shared-kernel/authorization';
import { InvalidUserRoleException } from '../exceptions/users.exceptions';

export class ValidRoleAssignmentRule {
  ensure(roles: readonly string[]): void {
    for (const role of roles) {
      if (!isValidRoleId(role)) {
        throw new InvalidUserRoleException(role);
      }
    }
  }
}
