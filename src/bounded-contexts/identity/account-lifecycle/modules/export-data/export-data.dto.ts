/**
 * Export Data DTOs
 *
 * GDPR data export response structure.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Nested Schemas
// ============================================================================

const UserDataSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  hasCompletedOnboarding: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ConsentSchema = z.object({
  documentType: z.string(),
  version: z.string(),
  acceptedAt: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
});

const ResumeItemSchema = z.object({
  id: z.string(),
  order: z.number(),
  content: z.unknown(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ResumeSectionSchema = z.object({
  sectionTypeKey: z.string(),
  semanticKind: z.string(),
  items: z.array(ResumeItemSchema),
});

const ResumeSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  slug: z.string().nullable(),
  isPublic: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  personalInfo: z.unknown(),
  sections: z.array(ResumeSectionSchema),
});

const AuditLogSchema = z.object({
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  createdAt: z.string(),
  ipAddress: z.string().nullable(),
});

// ============================================================================
// Main Schema
// ============================================================================

const ExportDataResponseSchema = z.object({
  exportedAt: z.string(),
  dataRetentionPolicy: z.string(),
  user: UserDataSchema,
  consents: z.array(ConsentSchema),
  resumes: z.array(ResumeSchema),
  auditLogs: z.array(AuditLogSchema),
});

// ============================================================================
// DTOs
// ============================================================================

export class ExportDataResponseDto extends createZodDto(ExportDataResponseSchema) {}
