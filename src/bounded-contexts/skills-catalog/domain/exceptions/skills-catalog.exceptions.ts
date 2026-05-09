/**
 * Skills Catalog Bounded Context Exceptions
 *
 * Covers tech skills, programming languages, tech niches, and tech areas —
 * the curated taxonomy that autocomplete and suggestion features depend on.
 */
import {
  ConflictException,
  DomainException,
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class SkillAlreadyExistsException extends ConflictException {
  override readonly code: string = 'SKILL_ALREADY_EXISTS';
  constructor(name: string) {
    super(`Skill "${name}" already exists in the catalog`);
  }
}

export class SkillSlugTakenException extends ConflictException {
  override readonly code: string = 'SKILL_SLUG_TAKEN';
  constructor(slug: string) {
    super(`Slug "${slug}" is already taken`);
  }
}

export class SkillInUseException extends ConflictException {
  override readonly code: string = 'SKILL_IN_USE';
  constructor() {
    super('Cannot delete skill — it is still referenced by resumes or jobs');
  }
}

export class InvalidSkillCategoryException extends ValidationException {
  override readonly code: string = 'INVALID_SKILL_CATEGORY';
  constructor(category: string) {
    super(`"${category}" is not a valid skill category`);
  }
}

export class TechAreaInvalidException extends ValidationException {
  override readonly code: string = 'TECH_AREA_INVALID';
  constructor(reason: string) {
    super(`Tech area is invalid: ${reason}`);
  }
}

export class TechNicheInvalidException extends ValidationException {
  override readonly code: string = 'TECH_NICHE_INVALID';
  constructor(reason: string) {
    super(`Tech niche is invalid: ${reason}`);
  }
}

export class ProgrammingLanguageInvalidException extends ValidationException {
  override readonly code: string = 'PROGRAMMING_LANGUAGE_INVALID';
  constructor(reason: string) {
    super(`Programming language is invalid: ${reason}`);
  }
}

export class TechAreaInUseException extends ValidationException {
  override readonly code: string = 'TECH_AREA_IN_USE';
  constructor(childCount: number) {
    super(`Cannot delete tech area - it has ${childCount} niche(s). Remove them first.`);
  }
}

export class TechNicheInUseException extends ValidationException {
  override readonly code: string = 'TECH_NICHE_IN_USE';
  constructor(childCount: number) {
    super(`Cannot delete tech niche - it has ${childCount} skill(s). Remove them first.`);
  }
}

export class SkillSectionTypeNotConfiguredException extends DomainException {
  readonly code: string = 'SKILL_SECTION_TYPE_NOT_CONFIGURED';
  readonly statusHint = 503;
  constructor(public readonly sectionTypeKey: string) {
    super(`SectionType '${sectionTypeKey}' not found`);
  }
}

export class SpokenLanguageNotFoundException extends EntityNotFoundException {
  override readonly code: string = 'SPOKEN_LANGUAGE_NOT_FOUND';
  constructor(code: string) {
    super('SpokenLanguage', code);
  }
}

export class InvalidLimitParameterException extends ValidationException {
  override readonly code: string = 'INVALID_LIMIT_PARAMETER';
  constructor() {
    super('Invalid limit parameter — must be a positive integer');
  }
}
