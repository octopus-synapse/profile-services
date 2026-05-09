/**
 * Prisma ↔ domain JSON conversions and snapshot → ResumeUpdateInput mappers.
 * Extracted from PrismaResumeVersionsRepository to keep the repo class
 * focused on query orchestration.
 */

import { Prisma } from '@prisma/client';
import type { JsonValue } from '../../../domain/entities/resume-version';

export function fromPrismaJson(value: Prisma.JsonValue): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => fromPrismaJson(item));
  }

  const result: { [key: string]: JsonValue | undefined } = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) result[key] = fromPrismaJson(item);
  }
  return result;
}

export function toPrismaInputJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => toPrismaInputJsonValue(item))
      .filter((item): item is Prisma.InputJsonValue => item !== null);
  }
  if (value && typeof value === 'object') {
    const parsedObject: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      const parsedValue = toPrismaInputJsonValue(item);
      if (parsedValue !== null) parsedObject[key] = parsedValue;
    }
    return parsedObject;
  }
  return null;
}

export function toPrismaInputJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  const parsedObject: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    const parsedValue = toPrismaInputJsonValue(item);
    if (parsedValue !== null) parsedObject[key] = parsedValue;
  }
  return parsedObject;
}

type StringOrNullKey =
  | 'title'
  | 'slug'
  | 'techPersona'
  | 'techArea'
  | 'fullName'
  | 'jobTitle'
  | 'phone'
  | 'location'
  | 'linkedin'
  | 'github'
  | 'website'
  | 'currentCompanyLogo'
  | 'twitter'
  | 'medium'
  | 'devto'
  | 'stackoverflow'
  | 'kaggle'
  | 'hackerrank'
  | 'leetcode'
  | 'accentColor'
  | 'styleId';

function setStringOrNull(
  data: Prisma.ResumeUncheckedUpdateInput,
  key: StringOrNullKey,
  value: unknown,
): void {
  if (typeof value === 'string' || value === null) data[key] = value;
}

function setString(
  data: Prisma.ResumeUncheckedUpdateInput,
  key: 'language' | 'primaryLanguage',
  value: unknown,
): void {
  if (typeof value === 'string') data[key] = value;
}

function setBoolean(
  data: Prisma.ResumeUncheckedUpdateInput,
  key: 'isPublic',
  value: unknown,
): void {
  if (typeof value === 'boolean') data[key] = value;
}

function setNumber(
  data: Prisma.ResumeUncheckedUpdateInput,
  key: 'profileViews' | 'totalStars' | 'totalCommits',
  value: unknown,
): void {
  if (typeof value === 'number') data[key] = value;
}

function setNumberOrNull(
  data: Prisma.ResumeUncheckedUpdateInput,
  key: 'experienceYears',
  value: unknown,
): void {
  if (typeof value === 'number' || value === null) data[key] = value;
}

function setDateOrNull(
  data: Prisma.ResumeUncheckedUpdateInput,
  key: 'publishedAt',
  value: unknown,
): void {
  if (value === null) {
    data[key] = null;
    return;
  }
  if (value instanceof Date) {
    data[key] = value;
    return;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) data[key] = date;
  }
}

function setStringArray(
  data: Prisma.ResumeUncheckedUpdateInput,
  key: 'primaryStack',
  value: unknown,
): void {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    data[key] = value;
  }
}

function setJson(
  data: Prisma.ResumeUncheckedUpdateInput,
  key: 'contentPtBr' | 'contentEn' | 'customTheme',
  value: unknown,
): void {
  if (value === null) {
    data[key] = Prisma.DbNull;
    return;
  }
  const parsed = toPrismaInputJsonValue(value);
  if (parsed !== null) data[key] = parsed;
}

function setSummary(data: Prisma.ResumeUncheckedUpdateInput, value: unknown): void {
  if (typeof value === 'string' || value === null) data.summary = value;
}

export function toResumeUpdateData(
  snapshot: Record<string, unknown>,
): Prisma.ResumeUncheckedUpdateInput {
  const data: Prisma.ResumeUncheckedUpdateInput = {};

  setStringOrNull(data, 'title', snapshot.title);
  setString(data, 'language', snapshot.language);
  setBoolean(data, 'isPublic', snapshot.isPublic);
  setStringOrNull(data, 'slug', snapshot.slug);
  setJson(data, 'contentPtBr', snapshot.contentPtBr);
  setJson(data, 'contentEn', snapshot.contentEn);
  setString(data, 'primaryLanguage', snapshot.primaryLanguage);
  setStringOrNull(data, 'techPersona', snapshot.techPersona);
  setStringOrNull(data, 'techArea', snapshot.techArea);
  setStringArray(data, 'primaryStack', snapshot.primaryStack);
  setNumberOrNull(data, 'experienceYears', snapshot.experienceYears);
  setStringOrNull(data, 'fullName', snapshot.fullName);
  setStringOrNull(data, 'jobTitle', snapshot.jobTitle);
  setStringOrNull(data, 'phone', snapshot.phone);
  setStringOrNull(data, 'location', snapshot.location);
  setStringOrNull(data, 'linkedin', snapshot.linkedin);
  setStringOrNull(data, 'github', snapshot.github);
  setStringOrNull(data, 'website', snapshot.website);
  setSummary(data, snapshot.summary);
  setStringOrNull(data, 'currentCompanyLogo', snapshot.currentCompanyLogo);
  setStringOrNull(data, 'twitter', snapshot.twitter);
  setStringOrNull(data, 'medium', snapshot.medium);
  setStringOrNull(data, 'devto', snapshot.devto);
  setStringOrNull(data, 'stackoverflow', snapshot.stackoverflow);
  setStringOrNull(data, 'kaggle', snapshot.kaggle);
  setStringOrNull(data, 'hackerrank', snapshot.hackerrank);
  setStringOrNull(data, 'leetcode', snapshot.leetcode);
  setStringOrNull(data, 'accentColor', snapshot.accentColor);
  setJson(data, 'customTheme', snapshot.customTheme);
  setStringOrNull(data, 'styleId', snapshot.styleId);
  setNumber(data, 'profileViews', snapshot.profileViews);
  setNumber(data, 'totalStars', snapshot.totalStars);
  setNumber(data, 'totalCommits', snapshot.totalCommits);
  setDateOrNull(data, 'publishedAt', snapshot.publishedAt);

  return data;
}
