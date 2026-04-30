/**
 * A direct permission grant the viewer holds — used by the menu
 * builder to gate navigation entries. The string follows the
 * canonical `resource:action` shape so it can be matched against
 * `Permission` literals from the shared kernel.
 */

export type PermissionGrant = string;
