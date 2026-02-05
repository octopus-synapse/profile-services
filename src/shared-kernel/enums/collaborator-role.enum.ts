import { z } from "zod";

/**
 * Collaborator Role Enum (Domain)
 *
 * Defines the roles for resume collaboration.
 */
export const CollaboratorRoleSchema = z.enum(["VIEWER", "EDITOR", "ADMIN"]);

export type CollaboratorRole = z.infer<typeof CollaboratorRoleSchema>;

/**
 * Check if a role can edit
 */
export const canRoleEdit = (role: CollaboratorRole): boolean => {
  return role === "EDITOR" || role === "ADMIN";
};

/**
 * Check if a role can manage collaborators
 */
export const canRoleManage = (role: CollaboratorRole): boolean => {
  return role === "ADMIN";
};
