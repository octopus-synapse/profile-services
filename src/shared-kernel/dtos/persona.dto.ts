/**
 * Tech Persona DTOs
 *
 * Domain types and validation schemas for tech persona configurations.
 * Each persona represents a specific IT professional archetype.
 */

import { z } from 'zod';
import { TechPersonaSchema } from '../enums';

// ============================================================================
// Persona Configuration
// ============================================================================

export const PersonaConfigSchema = z.object({
  /** Unique persona identifier */
  id: TechPersonaSchema,

  /** Display name for the persona */
  name: z.string().min(1),

  /** Short description of the persona's focus */
  description: z.string(),

  /** Emoji or icon name representing the persona */
  icon: z.string(),

  /** Primary theme color (hex) */
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),

  /** Accent/secondary color (hex) */
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),

  /** Gradient colors for visual effects [start, end] */
  gradient: z.tuple([z.string().regex(/^#[0-9A-Fa-f]{6}$/), z.string().regex(/^#[0-9A-Fa-f]{6}$/)]),

  /** Relevant skill categories for this persona */
  skillCategories: z.array(z.string()),

  /** Types of achievements relevant to this persona */
  achievementTypes: z.array(z.string()),

  /** Resume sections that should be highlighted */
  prioritySections: z.array(z.string()),

  /** Keywords for persona detection and suggestions */
  keywords: z.array(z.string()),
});

export type PersonaConfig = z.infer<typeof PersonaConfigSchema>;

// ============================================================================
// Persona Suggestion
// ============================================================================

export const PersonaSuggestionSchema = z.object({
  persona: TechPersonaSchema,
  confidence: z.number().min(0).max(1),
  matchedKeywords: z.array(z.string()),
  matchedSkills: z.array(z.string()),
});

export type PersonaSuggestion = z.infer<typeof PersonaSuggestionSchema>;

// ============================================================================
// Persona Detection Result
// ============================================================================

export const PersonaDetectionResultSchema = z.object({
  primary: PersonaSuggestionSchema.nullable(),
  secondary: z.array(PersonaSuggestionSchema),
  analyzed: z.object({
    skills: z.number().int().nonnegative(),
    keywords: z.number().int().nonnegative(),
    experiences: z.number().int().nonnegative(),
  }),
});

export type PersonaDetectionResult = z.infer<typeof PersonaDetectionResultSchema>;
