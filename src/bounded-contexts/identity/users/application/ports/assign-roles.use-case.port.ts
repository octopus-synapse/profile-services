/**
 * Per-UC port for `AssignRolesUseCase`.
 *
 * The UC enforces:
 *   - every requested role id is recognised by the platform
 *     (`ValidRoleAssignmentRule`),
 *   - removing the admin role does not leave the platform without an
 *     administrator (`LastAdminProtectionRule`).
 */

export abstract class AssignRolesUseCasePort {
  abstract execute(userId: string, roles: string[], assignedBy: string): Promise<void>;
}
