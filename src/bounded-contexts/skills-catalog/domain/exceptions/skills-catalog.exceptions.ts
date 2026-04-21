/**
 * Skills Catalog Bounded Context Exceptions
 *
 * Covers tech skills, programming languages, tech niches, and tech areas —
 * the curated taxonomy that autocomplete and suggestion features depend on.
 */
import { ConflictException, ValidationException } from '@/shared-kernel/exceptions';

export class SkillAlreadyExistsException extends ConflictException {
  readonly code: string = 'SKILL_ALREADY_EXISTS';
  constructor(name: string) {
    super(`Skill "${name}" already exists in the catalog`);
  }
}

export class SkillSlugTakenException extends ConflictException {
  readonly code: string = 'SKILL_SLUG_TAKEN';
  constructor(slug: string) {
    super(`Slug "${slug}" is already taken`);
  }
}

export class SkillInUseException extends ConflictException {
  readonly code: string = 'SKILL_IN_USE';
  constructor() {
    super('Cannot delete skill — it is still referenced by resumes or jobs');
  }
}

export class InvalidSkillCategoryException extends ValidationException {
  readonly code: string = 'INVALID_SKILL_CATEGORY';
  constructor(category: string) {
    super(`"${category}" is not a valid skill category`);
  }
}

export class TechAreaInvalidException extends ValidationException {
  readonly code: string = 'TECH_AREA_INVALID';
  constructor(reason: string) {
    super(`Tech area is invalid: ${reason}`);
  }
}

export class TechNicheInvalidException extends ValidationException {
  readonly code: string = 'TECH_NICHE_INVALID';
  constructor(reason: string) {
    super(`Tech niche is invalid: ${reason}`);
  }
}

export class ProgrammingLanguageInvalidException extends ValidationException {
  readonly code: string = 'PROGRAMMING_LANGUAGE_INVALID';
  constructor(reason: string) {
    super(`Programming language is invalid: ${reason}`);
  }
}
