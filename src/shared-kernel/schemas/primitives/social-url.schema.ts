import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  EXAMPLE_GITHUB_URL,
  EXAMPLE_LINKEDIN_URL,
  EXAMPLE_URL,
} from '../params/example-values.const';

extendZodWithOpenApi(z);

// Each schema is required by default. Callers chain `.optional()` /
// `.nullable()` as their endpoint requires.
export const SocialUrlSchema = z
  .string()
  .url('Invalid URL format')
  .regex(/^https?:\/\//, 'URL must start with http:// or https://')
  .max(500, 'URL cannot exceed 500 characters')
  .trim()
  .openapi({
    example: EXAMPLE_URL,
    description: 'Public HTTP(S) URL (max 500 chars). Trimmed on submit.',
  });

export type SocialUrl = z.infer<typeof SocialUrlSchema>;

export const LinkedInUrlSchema = z
  .string()
  .url('Invalid LinkedIn URL')
  .regex(
    /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\//,
    'Must be a valid LinkedIn profile or company URL',
  )
  .max(500, 'URL cannot exceed 500 characters')
  .trim()
  .openapi({
    example: EXAMPLE_LINKEDIN_URL,
    description:
      'LinkedIn profile or company URL (e.g. `https://www.linkedin.com/in/<handle>` or `https://www.linkedin.com/company/<slug>`).',
  });

export type LinkedInUrl = z.infer<typeof LinkedInUrlSchema>;

export const GitHubUrlSchema = z
  .string()
  .url('Invalid GitHub URL')
  .regex(/^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+/, 'Must be a valid GitHub profile URL')
  .max(500, 'URL cannot exceed 500 characters')
  .trim()
  .openapi({
    example: EXAMPLE_GITHUB_URL,
    description: 'GitHub profile URL (e.g. `https://github.com/<handle>`).',
  });

export type GitHubUrl = z.infer<typeof GitHubUrlSchema>;

export type SocialUrlDto = z.infer<typeof SocialUrlSchema>;
export type LinkedInUrlDto = z.infer<typeof LinkedInUrlSchema>;
export type GitHubUrlDto = z.infer<typeof GitHubUrlSchema>;
