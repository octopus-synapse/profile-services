/**
 * HTTP-boundary DTOs for the match-candidates endpoint. Lives in
 * `infrastructure/controllers/` because it carries Nest / swagger /
 * createZodDto — all of which are out of bounds for the application layer.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const MatchCandidatesRequestSchema = z.object({
  jobTitle: z.string().max(200).optional(),
  jobDescription: z.string().max(20_000).optional(),
  skills: z.array(z.string().min(1).max(60)).max(40).optional(),
  minEnglishLevel: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT']).optional(),
  remotePolicy: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional(),
  limit: z.number().int().min(1).max(25).default(10),
});

export class MatchCandidatesRequestDto extends createZodDto(MatchCandidatesRequestSchema) {}

const FitBreakdownSchema = z.object({
  skillOverlap: z.number(),
  englishMatch: z.number(),
  remoteMatch: z.number(),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
});

const FitScoreSchema = z.object({
  score: z.number(),
  breakdown: FitBreakdownSchema,
});

const RankedCandidateSchema = z.object({
  userId: z.string(),
  username: z.string().nullable(),
  name: z.string().nullable(),
  photoURL: z.string().nullable(),
  bio: z.string().nullable(),
  primaryStack: z.array(z.string()),
  fit: FitScoreSchema,
});

const MatchCandidatesDataSchema = z.object({
  candidates: z.array(RankedCandidateSchema),
  poolSize: z.number().int(),
});

export class MatchCandidatesDataDto extends createZodDto(MatchCandidatesDataSchema) {}
