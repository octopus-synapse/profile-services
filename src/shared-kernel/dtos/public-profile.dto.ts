/**
 * Public Profile DTOs
 *
 * Data Transfer Objects for public profile views.
 * Used for displaying user profiles to non-authenticated users or other users.
 */

import { z } from 'zod';
import {
  GitHubUrlSchema,
  LinkedInUrlSchema,
  SocialUrlSchema,
} from '../validations/professional-profile.schema';

/**
 * Public User Schema
 * Subset of user information safe to expose publicly
 */
export const PublicUserSchema = z.object({
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  bio: z.string().max(500).nullable(),
  location: z.string().max(100).nullable(),
  website: SocialUrlSchema.nullable(),
  linkedin: LinkedInUrlSchema.nullable(),
  github: GitHubUrlSchema.nullable(),
});

export type PublicUser = z.infer<typeof PublicUserSchema>;

/**
 * Public Profile Schema
 * Combines public user info with their resume
 */
export const PublicProfileSchema = z.object({
  user: PublicUserSchema,
  resume: z.any().nullable(), // Using z.any() for Resume to avoid circular dependency
});

export type PublicProfile = z.infer<typeof PublicProfileSchema>;

export const PublicProfileResponseSchema = z.object({
  data: z.object({
    profile: PublicProfileSchema,
  }),
});

export type PublicProfileResponseEnvelope = z.infer<typeof PublicProfileResponseSchema>;
