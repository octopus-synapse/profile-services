/**
 * GDPR DTOs
 *
 * Domain types and validation schemas for GDPR compliance:
 * - Data export (right to access)
 * - Account deletion (right to be forgotten)
 * - Data portability
 */

import { z } from "zod";

// ============================================================================
// User Data Export
// ============================================================================

export const UserDataExportSchema = z.object({
  exportedAt: z.string().datetime(),
  dataRetentionPolicy: z.string(),
  user: z.record(z.unknown()),
  consents: z.array(z.record(z.unknown())),
  resumes: z.array(z.record(z.unknown())),
  auditLogs: z.array(z.record(z.unknown())),
});

export type UserDataExport = z.infer<typeof UserDataExportSchema>;

// ============================================================================
// Account Deletion
// ============================================================================

export const AccountDeletionResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedAt: z.string().datetime(),
});

export type AccountDeletionResult = z.infer<typeof AccountDeletionResultSchema>;
