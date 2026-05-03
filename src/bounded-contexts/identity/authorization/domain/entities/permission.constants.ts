/** Standard actions in the system */
export const StandardActions = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  APPROVE: 'approve',
  REJECT: 'reject',
  EXPORT: 'export',
  IMPORT: 'import',
  SHARE: 'share',
  MANAGE: 'manage', // Super-action: implies all actions on resource
} as const;

export type StandardAction = (typeof StandardActions)[keyof typeof StandardActions];

/** Standard resources in the system */
export const StandardResources = {
  USER: 'user',
  RESUME: 'resume',
  THEME: 'theme',
  SKILL: 'skill',
  ROLE: 'role',
  GROUP: 'group',
  PERMISSION: 'permission',
  AUDIT_LOG: 'audit_log',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
  COLLABORATION: 'collaboration',
} as const;

export type StandardResource = (typeof StandardResources)[keyof typeof StandardResources];
