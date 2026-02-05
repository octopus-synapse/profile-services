/**
 * Professional Profile Validation Schemas
 *
 * Domain rules for career-related information.
 * Used in onboarding and profile management.
 */

import { z } from "zod";

/**
 * Job Title Schema
 *
 * Flexible format for various roles and seniority levels.
 */
export const JobTitleSchema = z
 .string()
 .min(2, "Job title must be at least 2 characters")
 .max(100, "Job title cannot exceed 100 characters")
 .trim();

export type JobTitle = z.infer<typeof JobTitleSchema>;

/**
 * Professional Summary Schema
 *
 * Brief bio/tagline for profile.
 */
export const SummarySchema = z
 .string()
 .min(10, "Summary must be at least 10 characters")
 .max(500, "Summary cannot exceed 500 characters")
 .trim();

export type Summary = z.infer<typeof SummarySchema>;

/**
 * URL Schema for Social Links
 *
 * Validates HTTP/HTTPS URLs.
 * Used for LinkedIn, GitHub, personal websites.
 */
export const SocialUrlSchema = z
 .string()
 .url("Invalid URL format")
 .regex(/^https?:\/\//, "URL must start with http:// or https://")
 .max(500, "URL cannot exceed 500 characters")
 .trim()
 .optional();

export type SocialUrl = z.infer<typeof SocialUrlSchema>;

/**
 * LinkedIn Profile URL Schema
 *
 * Validates LinkedIn-specific URL format.
 */
export const LinkedInUrlSchema = z
 .string()
 .url("Invalid LinkedIn URL")
 .regex(
  /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\//,
  "Must be a valid LinkedIn profile or company URL"
 )
 .max(500, "URL cannot exceed 500 characters")
 .trim()
 .optional();

export type LinkedInUrl = z.infer<typeof LinkedInUrlSchema>;

/**
 * GitHub Profile URL Schema
 *
 * Validates GitHub-specific URL format.
 */
export const GitHubUrlSchema = z
 .string()
 .url("Invalid GitHub URL")
 .regex(
  /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+/,
  "Must be a valid GitHub profile URL"
 )
 .max(500, "URL cannot exceed 500 characters")
 .trim()
 .optional();

export type GitHubUrl = z.infer<typeof GitHubUrlSchema>;

/**
 * Professional Profile Complete Schema
 *
 * Combines all professional information fields.
 */
export const ProfessionalProfileSchema = z.object({
 jobTitle: JobTitleSchema,
 summary: SummarySchema,
 linkedin: LinkedInUrlSchema,
 github: GitHubUrlSchema,
 website: SocialUrlSchema,
});

export type ProfessionalProfile = z.infer<typeof ProfessionalProfileSchema>;
