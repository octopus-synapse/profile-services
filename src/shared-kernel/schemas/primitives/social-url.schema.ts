/**
 * Social URL Validation Schemas
 *
 * Reusable URL schemas for social/professional links.
 * Used across identity and presentation bounded contexts.
 */

import { z } from 'zod';

/**
 * URL Schema for Social Links
 *
 * Validates HTTP/HTTPS URLs.
 * Used for LinkedIn, GitHub, personal websites.
 */
export const SocialUrlSchema = z
  .string()
  .url('Invalid URL format')
  .regex(/^https?:\/\//, 'URL must start with http:// or https://')
  .max(500, 'URL cannot exceed 500 characters')
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
  .url('Invalid LinkedIn URL')
  .regex(
    /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\//,
    'Must be a valid LinkedIn profile or company URL',
  )
  .max(500, 'URL cannot exceed 500 characters')
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
  .url('Invalid GitHub URL')
  .regex(/^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+/, 'Must be a valid GitHub profile URL')
  .max(500, 'URL cannot exceed 500 characters')
  .trim()
  .optional();

export type GitHubUrl = z.infer<typeof GitHubUrlSchema>;
