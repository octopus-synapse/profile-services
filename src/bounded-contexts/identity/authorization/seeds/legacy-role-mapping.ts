/**
 * Legacy Role Mapping
 *
 * Maps the old UserRole enum to the new role names.
 * Used during migration and backward compatibility.
 */

export const LEGACY_ROLE_MAPPING: Record<string, string> = {
  ADMIN: 'admin',
  APPROVER: 'approver',
  USER: 'user',
};

/**
 * Resolve a legacy role to the new role name
 */
export function resolveLegacyRole(legacyRole: string): string {
  return LEGACY_ROLE_MAPPING[legacyRole] ?? 'user';
}
